// ============================================================
// workbench86 Render I/O - I/O log, timeline, port monitor
// (The SVG "applications module" peripheral panel was removed in v15;
//  peripheral state still backs the simulation and is visible
//  through the I/O Log, I/O Timeline and the 7-segment INT 28H
//  display. The buttons that used to drive objectNear / opticalBlocked
//  were part of that panel and were removed with it. The state
//  variables themselves are still read by ports.js and stay at their
//  reset values - false for objectNear, false for opticalBlocked —
//  unless a future UI re-introduces a toggle.)
// ============================================================

function renderIOTimeline() {
  let el = document.getElementById('ioTimeline');
  if (!el) return;
  if (!ioLog.length) { el.innerHTML = ''; return; }
  let last = ioLog.slice(-60);
  let html = '<div class="io-tl-bars">';
  for (let e of last) {
    let cls = e.dir === 'OUT' ? 'io-tl-out' : 'io-tl-in';
    html += `<div class="io-tl-bar ${cls}" title="${e.dir} ${hex8(e.port)}=${hex8(e.val)}"></div>`;
  }
  html += '</div>';
  el.innerHTML = html;
}

function renderPortMonitor() {
  let el = document.getElementById('portMon');
  if (!el) return;
  const ports = [
    ['PORT1', PORT_PORT1], ['PORT2', PORT_PORT2], ['P1CTL', PORT_P1CTL], ['MODE', PORT_MODE],
    ['CREG1', PORT_CREG1], ['IRQEN', PORT_IRQEN], ['TMR1', PORT_TIMER], ['STATUS', PORT_STATUS]
  ];
  let html = '<table class="pm-tbl"><tr><th>Port</th><th>Addr</th><th>Hex</th><th>Dec</th><th>Binary</th></tr>';
  for (let [name, addr] of ports) {
    let v = ioPorts[addr] || 0;
    let bin = v.toString(2).padStart(8, '0').replace(/(.{4})/g, '$1 ').trim();
    html += `<tr><td>${name}</td><td>${hex8(addr)}</td><td class="pm-val">${hex8(v)}</td><td>${v}</td><td class="pm-bin">${bin}</td></tr>`;
  }
  html += '</table>';
  el.innerHTML = html;
}

function renderIOLog() {
  let el = document.getElementById('ioLog');
  if (!el) return;
  if (!ioLog.length) { el.textContent = '—'; return; }
  const pn = {0x80:'CREG1',0x82:'CREG2',0x84:'CREG3',0x86:'MODE',0x88:'P1CTL',0x8A:'IRQEN',0x8C:'IRQADR',0x90:'PORT1',0x92:'PORT2',0x94:'TMR1',0x40:'PIC'};
  let html = ioLog.slice(-30).map(e => {
    let name = pn[e.port] || hex8(e.port);
    return `<span class="io-${e.dir.toLowerCase()}">${e.dir} ${name}=${hex8(e.val)}</span>`;
  }).join('<br>');
  el.innerHTML = html;
  el.scrollTop = el.scrollHeight;
}
