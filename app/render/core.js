// ============================================================
// workbench86 Render Core - Status, registers, memory, stack, trace
// ============================================================

function setSt(s) {
  let e=document.getElementById('st');e.textContent=s;
  e.className='pill p-'+{READY:'rdy',RUNNING:'run',HALTED:'hlt',ERROR:'err'}[s];
}
function sLog(m,err) {
  let e=document.getElementById('log');
  if(!e) return;
  e.className='sb-item sb-log'+(err?' sb-error':' sb-success');
  e.textContent=String(m||'');
  // Show error banner for assembly errors
  let banner = document.getElementById('errorBanner');
  if (banner && err) {
    document.getElementById('errorMsg').textContent = String(m||'');
    banner.hidden = false;
  } else if (banner && !err) {
    banner.hidden = true;
  }
}

let prevRegVals = {};

function renderAll() {
  let curRegs = {AX,BX,CX,DX,SI,DI,SP,BP,CS,DS,SS,ES,IP,FLAGS};

  let gpHtml = '';
  let gpRegs = [[AX,'AX',`${hex8(getAH())}:${hex8(getAL())}`],[BX,'BX',`${hex8(getBH())}:${hex8(getBL())}`],
                [CX,'CX',`${hex8(getCH())}:${hex8(getCL())}`],[DX,'DX',`${hex8(getDH())}:${hex8(getDL())}`],
                [SI,'SI',''],[DI,'DI',''],[SP,'SP',''],[BP,'BP','']];
  for(let[v,n,split] of gpRegs) {
    let changed = prevRegVals[n] !== undefined && prevRegVals[n] !== v;
    gpHtml+=`<div class="rc${changed?' rc-flash':''}"><span class="rn">${n}</span><span class="rv">${hex16(v)}</span>${split?`<span class="rv-split">${split}</span>`:''}</div>`;
  }
  document.getElementById('rgGP').innerHTML=gpHtml;

  let segHtml='';
  for(let[v,n] of [[CS,'CS'],[DS,'DS'],[SS,'SS'],[ES,'ES']]) {
    let changed = prevRegVals[n] !== undefined && prevRegVals[n] !== v;
    segHtml+=`<div class="rc${changed?' rc-flash':''}"><span class="rn">${n}</span><span class="rv">${hex16(v)}</span></div>`;
  }
  document.getElementById('rgSeg').innerHTML=segHtml;

  let ctlHtml='';
  for(let[v,n] of [[IP,'IP'],[FLAGS,'FLAGS'],[pa(CS,IP),'PhysAddr']]) {
    let changed = n !== 'PhysAddr' && prevRegVals[n] !== undefined && prevRegVals[n] !== v;
    ctlHtml+=`<div class="rc${changed?' rc-flash':''}"><span class="rn">${n}</span><span class="rv">${n==='PhysAddr'?'0x'+(v).toString(16).toUpperCase().padStart(5,'0'):hex16(v)}</span></div>`;
  }
  document.getElementById('rgCtl').innerHTML=ctlHtml;

  prevRegVals = {AX,BX,CX,DX,SI,DI,SP,BP,CS,DS,SS,ES,IP,FLAGS};

  let fhtml='';
  for(let[b,n] of [[OF,'OF'],[DF,'DF'],[IF_,'IF'],[TF,'TF'],[SF,'SF'],[ZF,'ZF'],[AF,'AF'],[PF,'PF'],[CF,'CF']]) {
    fhtml+=`<span class="flb${gf(b)?' fs':''}">${n}</span>`;
  }
  document.getElementById('flG').innerHTML=fhtml;

  document.getElementById('irD').textContent=curInstr;
  document.getElementById('desc').textContent=curDesc;
  document.getElementById('diffBox').textContent=lastDiff;
  document.getElementById('cyN').textContent=cy;
  document.getElementById('inN').textContent=ic;

  document.getElementById('stkInfo').textContent=`${hex16(SS)}:${hex16(SP)}`;
  let shtml='';
  let sBase = SP;
  for(let i=0;i<16;i++){
    let a=(sBase+i*2)&0xFFFF;
    let v=rw(pa(SS,a));
    let cls = 'stk-val';
    if (i === 0) cls += ' stk-cur';
    else if (v !== 0) cls += ' stk-nz';
    shtml+=`<div class="stk-row"><span class="stk-addr">${hex16(a)}</span><span class="${cls}">${hex16(v)}</span></div>`;
  }
  document.getElementById('stkView').innerHTML=shtml;

  renderMem();
  renderIOLog();
  renderIOTimeline();
  renderTrace();

  let bb=document.getElementById('stepBackBtn'),bf=document.getElementById('stepFwdBtn');
  if(bb){bb.disabled=running||!stepPast.length;bb.textContent='\u2190 Back'+(stepPast.length?' ('+stepPast.length+')':'');}
  if(bf){bf.disabled=running||!stepFuture.length;bf.textContent='Fwd'+(stepFuture.length?' ('+stepFuture.length+')':'')+' \u2192';}

  updLn();
  if (typeof renderWatches === 'function') renderWatches();
  if (typeof updateCurLineBar === 'function') updateCurLineBar();
  if (typeof update7SegDisplay === 'function') update7SegDisplay();
}

function toggleFollow(mode) {
  memFollowMode = memFollowMode === mode ? null : mode;
  document.getElementById('followIP').classList.toggle('active', memFollowMode === 'IP');
  document.getElementById('followSP').classList.toggle('active', memFollowMode === 'SP');
  renderMem();
}

function renderMem() {
  let seg, off;
  if (memFollowMode === 'IP') {
    seg = CS; off = IP;
    document.getElementById('memAddr').value = hex16(seg) + ':' + hex16(off);
  } else if (memFollowMode === 'SP') {
    seg = SS; off = SP;
    document.getElementById('memAddr').value = hex16(seg) + ':' + hex16(off);
  } else {
    let input = document.getElementById('memAddr').value.trim();
    seg = 0x80; off = 0x100;
    let m = input.match(/^([0-9A-Fa-f]+):([0-9A-Fa-f]+)$/);
    if (m) { seg = parseInt(m[1], 16); off = parseInt(m[2], 16); }
    else { off = parseInt(input, 16) || 0x100; }
  }

  let html = '';
  let base = off & ~7;
  let newSnapshot = new Uint8Array(64);
  let sameRegion = (base === prevMemBase && seg === prevMemSeg);

  for (let r = 0; r < 8; r++) {
    let rowAddr = base + r * 8;
    html += `<span class="ma">${hex16(rowAddr)}</span>`;
    for (let c = 0; c < 8; c++) {
      let idx = r * 8 + c;
      let a = rowAddr + c;
      let physA = pa(seg, a);
      let v = rb(physA);
      newSnapshot[idx] = v;
      let cl = 'mv';
      if (v) cl += ' nz';
      if (a === IP) cl += ' pc-m';
      if (a === SP) cl += ' sp-m';
      if (sameRegion && prevMemSnapshot[idx] !== v) cl += ' chg';
      html += `<span class="${cl}">${hex8(v)}</span>`;
    }
  }
  prevMemSnapshot = newSnapshot;
  prevMemBase = base;
  prevMemSeg = seg;
  document.getElementById('memGrid').innerHTML = html;
}

function renderTrace() {
  let el = document.getElementById('traceView');
  if (!el) return;
  document.getElementById('traceCount').textContent = execTrace.length;
  if (!execTrace.length) { el.innerHTML = '<div class="empty-state">No trace data yet.<br>Step or run a program to record execution.</div>'; return; }
  let last = execTrace.slice(-80);
  let html = last.map(t =>
    `<div class="trace-row"><span class="trace-addr">${hex16(t.ip)}</span><span class="trace-op">${t.op}</span>${t.diff?`<span class="trace-diff">${t.diff}</span>`:''}</div>`
  ).join('');
  el.innerHTML = html;
  el.scrollTop = el.scrollHeight;
}
