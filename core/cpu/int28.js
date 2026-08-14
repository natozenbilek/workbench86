// ============================================================
// workbench86 CPU - INT 28H Handler (PAT Monitor calls)
// ============================================================

function handleInt28() {
  let fn = getAH();
  switch(fn) {
    case PATCALLS.EXIT:
      halt = true;
      curDesc = 'EXIT \u2014 returned to PAT monitor';
      setSt('HALTED');
      break;
    case PATCALLS.WRCHAR: {
      let ch = getAL();
      if (ch >= 32 && ch <= 126) patDisplay += String.fromCharCode(ch);
      else if (ch === 13 || ch === 10) patDisplay += '\n';
      curDesc = `WRCHAR: '${String.fromCharCode(ch >= 32 ? ch : 46)}'`;
      break;
    }
    case PATCALLS.WRBYTE: {
      let bv = getAL();
      patDisplay += bv.toString(16).toUpperCase().padStart(2, '0');
      curDesc = `WRBYTE: ${hex8(bv)}`;
      break;
    }
    case PATCALLS.CLRSCR:
      patDisplay = '';
      curDesc = 'CLRSCR';
      break;
    case PATCALLS.CRLF:
      patDisplay += '\n';
      curDesc = 'CRLF';
      break;
    case PATCALLS.GETIN:
      if (keyQueue.length > 0) {
        setAL(keyQueue.shift());
        curDesc = 'GETIN: key=' + hex8(getAL());
      } else {
        setAL(0xFF);
        curDesc = 'GETIN: no key (0xFF)';
      }
      break;
    case PATCALLS.WT1MS:
      waitUntil = performance.now() + 1;
      curDesc = 'WT1MS: 1ms delay';
      break;
    case PATCALLS.WTNMS:
      waitUntil = performance.now() + BX;
      curDesc = `WTNMS: ${BX}ms delay`;
      break;
    case PATCALLS.LEDON:
      curDesc = 'LEDON';
      break;
    case PATCALLS.LEDOFF:
      curDesc = 'LEDOFF';
      break;
    case PATCALLS.READ:
    case PATCALLS.READLN:
      curDesc = `READ/READLN (stub)`;
      break;
    case PATCALLS.WRITE:
    case PATCALLS.WRITLN: {
      let cnt = CX, addr = pa(DS, DI);
      let s = '';
      for (let i = 0; i < cnt && i < 256; i++) {
        let c = rb(addr + i);
        s += (c >= 32 && c <= 126) ? String.fromCharCode(c) : '.';
      }
      patDisplay += s;
      curDesc = `WRITE: "${s.slice(0,20)}"`;
      break;
    }
    case PATCALLS.TONE: {
      let freq = BX, dur = CX;
      if (freq > 0) {
        startPiezo(freq);
        if (piezoOsc) try { piezoOsc.frequency.value = freq; } catch(e) {}
      }
      if (dur > 0) waitUntil = performance.now() + dur;
      if (freq === 0) stopPiezo();
      curDesc = `TONE: ${freq}Hz ${dur}ms`;
      break;
    }
    case PATCALLS.NOTOFF:
      stopPiezo();
      curDesc = 'NOTOFF: piezo off';
      break;
    default:
      curDesc = `INT 28H AH=${hex8(fn)} (unhandled)`;
  }
}
