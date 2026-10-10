// ============================================================
// workbench86 Main Sim: Step, run, reset, speed, UI interactions
// ============================================================

function doStep() {
  if (typeof simLocked === 'function' && simLocked()) { simLockedNotice(); return; }
  if (!pLen) { sLog('No program assembled.', 1); return; }
  if (halt) return;
  let prevState = {AX,BX,CX,DX,SI,DI,SP,BP,CS,DS,SS,ES,IP,FLAGS};
  // Snapshot first, execute second: captureSnap() hands the memory undo journal
  // to the new snapshot, so every byte execOne() writes is recorded there and
  // can be rolled back exactly. Dropping the oldest snapshot when the history is
  // full only shortens how far back we can go; each snapshot carries the journal
  // for its own step, so the remaining chain stays complete.
  stepPast.push(captureSnap());
  if (stepPast.length > 500) stepPast.shift();
  stepFuture = [];
  execOne();
  let diffs = [];
  if(AX!==prevState.AX) diffs.push(`AX:${hex16(prevState.AX)}→${hex16(AX)}`);
  if(BX!==prevState.BX) diffs.push(`BX:${hex16(prevState.BX)}→${hex16(BX)}`);
  if(CX!==prevState.CX) diffs.push(`CX:${hex16(prevState.CX)}→${hex16(CX)}`);
  if(DX!==prevState.DX) diffs.push(`DX:${hex16(prevState.DX)}→${hex16(DX)}`);
  if(SP!==prevState.SP) diffs.push(`SP:${hex16(prevState.SP)}→${hex16(SP)}`);
  if(IP!==prevState.IP) diffs.push(`IP:${hex16(prevState.IP)}→${hex16(IP)}`);
  if(FLAGS!==prevState.FLAGS) diffs.push(`FL:${hex16(prevState.FLAGS)}→${hex16(FLAGS)}`);
  lastDiff = diffs.length ? diffs.join(' | ') : 'No change';
  execTrace.push({ip: prevState.IP, op: curInstr, diff: diffs.length ? diffs.join(', ') : ''});
  if (execTrace.length > TRACE_MAX) execTrace.shift();
  renderAll();
  if (halt) { stopRun(); sLog(`HALT. ${ic} instructions executed.`, 0); }
}

// Both directions must capture the current state BEFORE restoring: the restore
// undoes memory through the wrapped wb, and those writes land in the journal of
// the snapshot just captured. That journal is the return ticket, which is what
// lets the opposite button replay the step byte for byte.
function doStepBack() {
  if (typeof simLocked === 'function' && simLocked()) { simLockedNotice(); return; }
  if (!stepPast.length) return;
  stopRun();
  stepFuture.push(captureSnap());
  restoreSnap(stepPast.pop());
  renderAll();
}
function doStepForward() {
  if (typeof simLocked === 'function' && simLocked()) { simLockedNotice(); return; }
  if (!stepFuture.length) return;
  stopRun();
  stepPast.push(captureSnap());
  if (stepPast.length > 500) stepPast.shift();
  restoreSnap(stepFuture.pop());
  renderAll();
}

let spd = 20;
function updSpd() { spd = +document.getElementById('spd').value; if(running){stopRun();startRun()} }
function doToggleRun() { if(running) stopRun(); else startRun(); }

// The simulated MUART timer counts executed instructions (one tick per 50), and a
// WTNMS loop also runs at the instruction rate, so below Max such programs take
// minutes. Checked on the assembled bytes: OUT to UIRQEN or UTIMER1..5 (or MOV DX
// with one of them), or MOV AH,WTNMS together with INT 28H.
const TIMER_PORTS = [PATCALLS.UIRQEN, PATCALLS.UTIMER1, PATCALLS.UTIMER2, PATCALLS.UTIMER3, PATCALLS.UTIMER4, PATCALLS.UTIMER5];
function slowSpeedHint() {
  let int28 = false, wtnms = false, timer = false;
  for (let al of asmLines) {
    let b = al.bytes;
    if (b[0] === 0xCD && b[1] === 0x28) int28 = true;
    else if (b[0] === 0xB4 && b[1] === PATCALLS.WTNMS) wtnms = true;
    else if ((b[0] === 0xE6 || b[0] === 0xE7) && TIMER_PORTS.includes(b[1])) timer = true;
    else if (b[0] === 0xBA && b[2] === 0 && TIMER_PORTS.includes(b[1])) timer = true;
  }
  let what = timer ? 'the MUART timer' : (int28 && wtnms) ? 'WTNMS' : '';
  // The advice comes first: the status bar is narrow and cuts long messages.
  return what ? `Tip: use Max speed (this program uses ${what})` : '';
}

function startRun() {
  if (typeof simLocked === 'function' && simLocked()) { simLockedNotice(); return; }
  if(!pLen){sLog('No program.',1);return} if(halt)return;
  running=true;
  document.getElementById('runBtn').textContent='Pause';
  document.getElementById('runBtn').className='b';
  setSt('RUNNING');
  let hint = spd < 9999 ? slowSpeedHint() : '';
  let log = document.getElementById('log');
  if (hint) sLog(hint, 0);
  else if (log && log.textContent.startsWith('Tip: use Max speed')) sLog('', 0);   // switched to Max
  let batch = spd >= 9999 ? 500 : 1;
  let delay = spd >= 9999 ? 1 : Math.max(1, Math.floor(1000/spd));
  tmr = setInterval(()=>{
    if(waitUntil>0&&performance.now()<waitUntil)return;
    waitUntil=0;
    for(let i=0;i<batch&&!halt&&running;i++){
      if(waitUntil>0)break;
      if(breakpoints.size>0&&asmLines.length){
        for(let al of asmLines){
          if(al.addr===IP&&breakpoints.has(al.ln)){
            stopRun();sLog('Breakpoint: line '+al.ln,0);renderAll();return;
          }
        }
      }
      execOne();
    }
    renderAll();
    if(halt){stopRun();sLog(`HALT. ${ic} instr.`,0)}
  }, delay);
}
function stopRun() {
  running=false;if(tmr){clearInterval(tmr);tmr=null}
  document.getElementById('runBtn').textContent='Run';
  document.getElementById('runBtn').className='b bg';
  if(!halt) setSt('READY');
}
function doReset() {
  stopRun(); stopPiezo(); waitUntil = 0;
  keyQueue = [];
  timerValue = 0; timerReload = 0; timerCount = 0; timerEnabled = 0;
  irqPending = 0;
  doAssemble();
}

// === UI INTERACTIONS ===
// The potentiometer slider (if present in a future UI) drives the ADC value
// read by Port-2 when UMODEREG=0. The peripheral SVG panel that used to host
// this slider was removed in v15; the simulation still consults potValue,
// objectNear and opticalBlocked through ports.js, so the state lives on at
// its reset values until a future UI re-introduces controls.
function potChanged() {
  let el = document.getElementById('potSlider');
  if (el) potValue = +el.value;
}
