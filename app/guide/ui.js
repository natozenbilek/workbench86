// ============================================================
// workbench86 Guide UI - Modal open/close, tab rendering
// ============================================================

let guideTab = 'overview';
function openGuide() { document.getElementById('guideOv').hidden = false; renderGuide(); }
function closeGuide() { document.getElementById('guideOv').hidden = true; }
function setGuideTab(t) { guideTab = t; renderGuide(); }
function renderGuide() {
  let tabs = ['overview','registers','instructions','addressing','io_ports'];
  let labels = ['Overview','Registers','Instructions','Addressing','I/O & Peripherals'];
  let html = '<div class="guide-tabs">';
  for (let i = 0; i < tabs.length; i++) {
    html += `<button class="guide-tab${guideTab===tabs[i]?' on':''}" onclick="setGuideTab('${tabs[i]}')">${labels[i]}</button>`;
  }
  html += '</div>';
  html += GUIDE_HTML[guideTab] || '';
  document.getElementById('guideBody').innerHTML = html;
}
