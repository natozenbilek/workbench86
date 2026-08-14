// ============================================================
// workbench86 Panels Layout - Right panel HTML generator
// ============================================================

function initCollapsibleCards() {
  document.querySelectorAll('.cd .ch').forEach(ch => {
    ch.addEventListener('click', () => {
      let card = ch.closest('.cd');
      if (card.classList.contains('cd-hero')) return;
      card.classList.toggle('collapsed');
      let expanded = !card.classList.contains('collapsed');
      ch.setAttribute('aria-expanded', expanded);
    });
  });
}

function buildRightPanel() {
  let rp = document.getElementById('rpContent');
  if (!rp) return;

  rp.innerHTML = `
    <div class="cyc">
      <span>Cycle: <b id="cyN">0</b></span>
      <span>Instr: <b id="inN">0</b></span>
    </div>
    <div class="cd cd-hero" role="region" aria-label="Current instruction"><div class="ch">Current instruction</div><div class="cb">
      <div class="ir-box" id="irD">&mdash;</div>
      <div class="desc-box desc-gap" id="desc">&mdash;</div>
      <div class="diff-box desc-gap" id="diffBox">&mdash;</div>
    </div></div>
    <div class="cd" role="region" aria-label="General purpose registers"><div class="ch" role="button" aria-expanded="true">General purpose registers</div><div class="cb">
      <div class="rg rg-gp" id="rgGP"></div>
    </div></div>
    <div class="cd" role="region" aria-label="Segment registers"><div class="ch" role="button" aria-expanded="true">Segment registers</div><div class="cb">
      <div class="rg rg-seg" id="rgSeg"></div>
    </div></div>
    <div class="cd" role="region" aria-label="Control registers"><div class="ch" role="button" aria-expanded="true">Control</div><div class="cb">
      <div class="rg rg-ctl" id="rgCtl"></div>
    </div></div>
    <div class="cd" role="region" aria-label="Flags"><div class="ch" role="button" aria-expanded="true">Flags</div><div class="cb">
      <div class="fr" id="flG"></div>
    </div></div>
    <div class="cd collapsed" role="region" aria-label="PAT Display"><div class="ch" role="button" aria-expanded="false">PAT Display <span class="ch-sub">INT 28H output</span></div><div class="cb">
      <div class="seg7-wrap" id="seg7Wrap"></div>
      <div class="pat-disp-lbl">7-segment display</div>
    </div></div>
    <div class="cd" role="region" aria-label="Stack"><div class="ch" role="button" aria-expanded="true">Stack <span class="ch-sub" id="stkInfo">SS:SP</span></div><div class="cb">
      <div class="stk" id="stkView"><div class="empty-state">No stack activity yet.<br>Run a program to see stack contents.</div></div>
    </div></div>
    <div class="cd" role="region" aria-label="Memory"><div class="ch" role="button" aria-expanded="true">Memory</div><div class="cb">
      <div class="mem-toolbar">
        <input id="memAddr" type="text" value="0080:0100" class="mem-input" placeholder="seg:off" aria-label="Memory address">
        <button class="b b-out" onclick="renderMem()">View</button>
        <div class="mem-follow">
          <button class="b" id="followIP" onclick="toggleFollow('IP')" data-tip="Auto-follow CS:IP">IP</button>
          <button class="b" id="followSP" onclick="toggleFollow('SP')" data-tip="Auto-follow SS:SP">SP</button>
        </div>
      </div>
      <div class="mem-view-wrap">
        <div class="mg" id="memGrid"></div>
        <div class="mg-ascii" id="memAscii"></div>
      </div>
    </div></div>
    <div class="cd collapsed" role="region" aria-label="Execution Trace"><div class="ch" role="button" aria-expanded="false">Execution Trace <span class="ch-sub" id="traceCount">0</span></div><div class="cb">
      <div class="trace" id="traceView"><div class="empty-state">No trace data yet.<br>Step or run a program to record execution.</div></div>
    </div></div>
    <div class="cd collapsed" role="region" aria-label="Watch"><div class="ch" role="button" aria-expanded="false">Watch</div><div class="cb">
      <div class="watch-input-row">
        <input id="watchInput" type="text" class="watch-input" placeholder="AX, DS:1000, [SI], label..." spellcheck="false" aria-label="Watch expression">
        <button class="b b-out" onclick="addWatch()">Add</button>
      </div>
      <div id="watchList" class="watch-list"><span class="watch-empty">Add expressions above (registers, addresses, labels)</span></div>
    </div></div>
    <div class="cd collapsed" role="region" aria-label="I/O Log"><div class="ch" role="button" aria-expanded="false">I/O Log <span class="ch-sub">last 30</span></div><div class="cb cb--flush">
      <div class="io-timeline" id="ioTimeline"></div>
      <div class="io-log" id="ioLog"><div class="empty-state">No I/O activity yet.</div></div>
    </div></div>`;
}
