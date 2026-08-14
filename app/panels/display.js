// ============================================================
// workbench86 Panels Display - 7-segment renderer, memory ASCII
// ============================================================

// === 7-SEGMENT DISPLAY ===
function render7Seg(char) {
  const SEGS = {
    '0':[1,1,1,1,1,1,0],'1':[0,1,1,0,0,0,0],'2':[1,1,0,1,1,0,1],'3':[1,1,1,1,0,0,1],
    '4':[0,1,1,0,0,1,1],'5':[1,0,1,1,0,1,1],'6':[1,0,1,1,1,1,1],'7':[1,1,1,0,0,0,0],
    '8':[1,1,1,1,1,1,1],'9':[1,1,1,1,0,1,1],
    'A':[1,1,1,0,1,1,1],'B':[0,0,1,1,1,1,1],'C':[1,0,0,1,1,1,0],'D':[0,1,1,1,1,0,1],
    'E':[1,0,0,1,1,1,1],'F':[1,0,0,0,1,1,1],
    'G':[1,0,1,1,1,1,0],'H':[0,1,1,0,1,1,1],'I':[0,0,0,0,1,1,0],
    'J':[0,1,1,1,0,0,0],'L':[0,0,0,1,1,1,0],'N':[0,0,1,0,1,0,1],
    'O':[1,1,1,1,1,1,0],'P':[1,1,0,0,1,1,1],'R':[0,0,0,0,1,0,1],
    'S':[1,0,1,1,0,1,1],'T':[0,0,0,1,1,1,1],'U':[0,1,1,1,1,1,0],
    'Y':[0,1,1,1,0,1,1],'Z':[1,1,0,1,1,0,1],
    '-':[0,0,0,0,0,0,1],'_':[0,0,0,1,0,0,0],' ':[0,0,0,0,0,0,0]
  };
  let s = SEGS[char.toUpperCase()] || SEGS[char] || SEGS[' '];
  let on = 'var(--grn)', off = 'var(--bg4)';
  return `<svg viewBox="0 0 18 30" width="18" height="30">
    <rect x="3" y="1" width="12" height="2" rx="1" fill="${s[0]?on:off}"/>
    <rect x="14" y="3" width="2" height="11" rx="1" fill="${s[1]?on:off}"/>
    <rect x="14" y="16" width="2" height="11" rx="1" fill="${s[2]?on:off}"/>
    <rect x="3" y="27" width="12" height="2" rx="1" fill="${s[3]?on:off}"/>
    <rect x="2" y="16" width="2" height="11" rx="1" fill="${s[4]?on:off}"/>
    <rect x="2" y="3" width="2" height="11" rx="1" fill="${s[5]?on:off}"/>
    <rect x="3" y="14" width="12" height="2" rx="1" fill="${s[6]?on:off}"/>
  </svg>`;
}

function render7SegInline(char, x, y, scale) {
  scale = scale || 1;
  const SEGS = {
    '0':[1,1,1,1,1,1,0],'1':[0,1,1,0,0,0,0],'2':[1,1,0,1,1,0,1],'3':[1,1,1,1,0,0,1],
    '4':[0,1,1,0,0,1,1],'5':[1,0,1,1,0,1,1],'6':[1,0,1,1,1,1,1],'7':[1,1,1,0,0,0,0],
    '8':[1,1,1,1,1,1,1],'9':[1,1,1,1,0,1,1],
    'A':[1,1,1,0,1,1,1],'B':[0,0,1,1,1,1,1],'C':[1,0,0,1,1,1,0],'D':[0,1,1,1,1,0,1],
    'E':[1,0,0,1,1,1,1],'F':[1,0,0,0,1,1,1],
    'G':[1,0,1,1,1,1,0],'H':[0,1,1,0,1,1,1],'I':[0,0,0,0,1,1,0],
    'J':[0,1,1,1,0,0,0],'L':[0,0,0,1,1,1,0],'N':[0,0,1,0,1,0,1],
    'O':[1,1,1,1,1,1,0],'P':[1,1,0,0,1,1,1],'R':[0,0,0,0,1,0,1],
    'S':[1,0,1,1,0,1,1],'T':[0,0,0,1,1,1,1],'U':[0,1,1,1,1,1,0],
    'Y':[0,1,1,1,0,1,1],'Z':[1,1,0,1,1,0,1],
    '-':[0,0,0,0,0,0,1],'_':[0,0,0,1,0,0,0],' ':[0,0,0,0,0,0,0]
  };
  let s = SEGS[char.toUpperCase()] || SEGS[char] || SEGS[' '];
  let on = 'var(--grn)', off = '#1a1d24';
  let segs = [
    [3,1,12,2.5],  // a - top
    [14,3,2.5,11], // b - topR
    [14,16,2.5,11],// c - botR
    [3,27,12,2.5], // d - bot
    [2,16,2.5,11], // e - botL
    [2,3,2.5,11],  // f - topL
    [3,14,12,2.5]  // g - mid
  ];
  let svg = `<g transform="translate(${x},${y}) scale(${scale})">`;
  for (let i = 0; i < 7; i++) {
    let [rx,ry,rw,rh] = segs[i];
    let fill = s[i] ? on : off;
    let glow = s[i] ? ' filter="url(#segGlow)"' : '';
    svg += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" rx="1" fill="${fill}"${glow}/>`;
  }
  svg += '</g>';
  return svg;
}

function update7SegDisplay() {
  let wrap = document.getElementById('seg7Wrap');
  if (!wrap) return;
  let text = (patDisplay || '').slice(-8).padStart(8, ' ');
  let html = '';
  for (let i = 0; i < text.length; i++) {
    html += render7Seg(text[i]);
  }
  wrap.innerHTML = html;
}

// === MEMORY VIEW WITH ASCII ===
function enhanceMemoryView() {
  if (typeof renderMem !== 'function') return;
  let _origRenderMem = renderMem;

  renderMem = function() {
    _origRenderMem();
    let asciiCol = document.getElementById('memAscii');
    if (!asciiCol) return;

    let seg, off;
    if (memFollowMode === 'IP') { seg = CS; off = IP; }
    else if (memFollowMode === 'SP') { seg = SS; off = SP; }
    else {
      let input = document.getElementById('memAddr').value.trim();
      seg = 0x80; off = 0x100;
      let m = input.match(/^([0-9A-Fa-f]+):([0-9A-Fa-f]+)$/);
      if (m) { seg = parseInt(m[1], 16); off = parseInt(m[2], 16); }
      else { off = parseInt(input, 16) || 0x100; }
    }
    let base = off & ~7;
    let asciiHtml = '';
    for (let r = 0; r < 8; r++) {
      let rowAddr = base + r * 8;
      let ascii = '';
      for (let c = 0; c < 8; c++) {
        let v = rb(pa(seg, rowAddr + c));
        if (v >= 0x20 && v < 0x7F) ascii += String.fromCharCode(v);
        else ascii += '<span class="ma-dot">.</span>';
      }
      asciiHtml += `<span class="ma-ascii">${ascii}</span>`;
    }
    asciiCol.innerHTML = asciiHtml;
  };
}
