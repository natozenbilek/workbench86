// ============================================================
// workbench86 Serial Core: WebSerial connection, read/write, UI
// ============================================================

let serialPort = null;
let serialReader = null;
let serialWriter = null;
let serialConnected = false;
let serialRxBuf = '';
let serialRxBase = 0;         // chars trimmed off the front of serialRxBuf so far: marks stay valid across trims
let serialRxLog = '';
let serialGen = 0;            // bumps on every connect/disconnect: a running upload that sees a new value stops
let serialBusy = '';          // '' = idle, else the job talking to the board: 'upload', 'G', 'T', 'send' or 'dtr'
let busyText = '';            // Upload button text while busy, e.g. "Uploading 37/142"
let serialTxError = '';       // set when a write fails; the running job stops on it (cleared when a job starts)
let boardRunning = false;     // G was sent and no PAT: has come back since
let boardRunningMark = 0;     // rxMark() when boardRunning was set
let boardErrorLine = '';      // the last "ERROR ..." line seen after a G
let serialLastFormFeed = -1;  // rxMark() position of the last form feed (0x0C), the start of the PAT RESET banner
let uploadedOrg = null;       // entry ORG of the last upload that reached G; the G and T buttons use it
let lastSerialCode = '';      // code of the last error or warning (C01, U01, ...); goes in the Copy header
let lastUploadInfo = '';      // file, ORG, segments and bytes of the last upload; goes in the Copy header
let simLockOverride = false;  // "Simulate anyway" pressed while connected

const WB_VERSION = 'v18';
const SERIAL_BAUD = 9600;
const SERIAL_STOP_BITS = 2;
const SERIAL_OPEN_OPTS = { baudRate: SERIAL_BAUD, dataBits: 8, stopBits: SERIAL_STOP_BITS, parity: 'none' };
const PAT_PROMPT = 'PAT:';

// WebSerial reports line noise by erroring the current stream and opening a new one.
// These are the non-fatal ones: take a new reader and keep the connection.
const SERIAL_SOFT_ERRORS = ['BreakError', 'FramingError', 'ParityError', 'BufferOverrunError'];

// --- Connect / Disconnect ---
async function serialConnect() {
  if (serialConnected) { await serialDisconnect(); return; }
  if (!('serial' in navigator)) {
    sLog('WebSerial requires Chrome or Edge. Not supported in this browser.', 1);
    alert('WebSerial API is not supported in this browser.\n\nPlease use Chrome or Edge.');
    return;
  }
  let port;
  try {
    port = await navigator.serial.requestPort();
  } catch (e) {
    if (e.name !== 'NotFoundError') serialConnectFailed(e);   // NotFoundError: the picker was closed
    return;
  }
  try {
    await openSerialPort(port);
  } catch (e) {
    serialConnectFailed(e, port);
    return;
  }
  try {
    serialPort = port;
    await serialPort.setSignals({ dataTerminalReady: false, requestToSend: false });
    await new Promise(r => setTimeout(r, 100));
    await serialPort.setSignals({ dataTerminalReady: true, requestToSend: true });
    serialWriter = serialPort.writable.getWriter();
  } catch (e) {
    // Opened but not usable: close it again, so the next Device click does not find it open.
    try { if (serialWriter) serialWriter.releaseLock(); } catch (e2) {}
    serialWriter = null;
    serialPort = null;
    try { await port.close(); } catch (e2) {}
    serialConnectFailed(e);
    return;
  }
  serialConnected = true;
  serialGen++;
  serialRxBuf = '';
  serialRxBase = 0;
  serialLastFormFeed = -1;
  serialTxError = '';
  simLockOverride = false;
  boardRunning = false;
  updateSerialUI();
  sLog('Board connected (9600 8N2)', 0);
  serialRxLog = 'Connected. Press PAT RESET, wait for "PAT:" prompt, then use buttons.\n';
  updateSerialTerminal();
  startSerialRead();
}

// "Already open" (InvalidStateError) means an earlier connection on this page left the
// port open: close it and open it again. Anything else goes to serialConnectFailed.
async function openSerialPort(port) {
  try {
    await port.open(SERIAL_OPEN_OPTS);
    return;
  } catch (e) {
    if (e.name !== 'InvalidStateError') throw e;
  }
  try { await port.close(); } catch (e) {}
  await port.open(SERIAL_OPEN_OPTS);
}

// Prolific PL2303 adapters (USB vendor 067B) on Windows: Prolific's current driver refuses older
// and copied PL2303 chips. The port is listed but open() fails just like a busy port, and
// chrome://device-log says FILE_ERROR_FAILED. Seen with several groups' adapters on 2026-10-16.
const PROLIFIC_VID = 0x067B;
function isProlificOnWindows(port) {
  let info = {};
  try { info = (port && port.getInfo()) || {}; } catch (e) {}
  return info.usbVendorId === PROLIFIC_VID && /Windows/i.test(navigator.userAgent);
}

function serialConnectFailed(e, port) {
  const openFailed = e.name === 'NetworkError' || /failed to open/i.test(e.message || '');
  if (openFailed && isProlificOnWindows(port))
    serialCode('C07', 'Could not open the USB adapter (Prolific PL2303 chip). If no other tab or program is using it, the cause is usually the Windows driver: Prolific\'s current driver refuses older and copied PL2303 chips, so the port is listed but does not open. In Device Manager, under Ports (COM & LPT), open the Prolific port. If it shows PHASED OUT or Code 10, choose Update driver, Browse my computer for drivers, Let me pick from a list, and select an older version. If there is none, use an adapter with an FTDI, CH340 or CP2102 chip.');
  else if (openFailed)
    serialCode('C01', 'Could not open the serial port. Another program or tab is probably using it. Close other workbench86 tabs and programs such as minicom, PuTTY or a serial monitor, unplug and replug the USB adapter, then click Device again.');
  else if (e.name === 'InvalidStateError')
    serialCode('C02', 'The serial port is still open from an earlier connection and could not be reopened. Unplug and replug the USB adapter, then click Device again.');
  else
    serialCode('C03', 'Serial port error: ' + (e.message || e.name) + '. Unplug and replug the USB adapter, then click Device again.');
  serialConnected = false;
  updateSerialUI();
}

async function serialDisconnect() {
  serialConnected = false;
  serialGen++;
  simLockOverride = false;
  boardRunning = false;
  try {
    if (serialReader) {
      try { await serialReader.cancel(); } catch(e) {}
      try { serialReader.releaseLock(); } catch(e) {}
      serialReader = null;
    }
    if (serialWriter) {
      try { await serialWriter.close(); } catch(e) {}
      try { serialWriter.releaseLock(); } catch(e) {}
      serialWriter = null;
    }
    if (serialPort) {
      try { await serialPort.close(); } catch(e) {}
      serialPort = null;
    }
  } catch (e) {}
  updateSerialUI();
  sLog('Disconnected.', 0);
  serialRxLog += '\n--- Disconnected ---\n';
  updateSerialTerminal();
}

// The read side is gone (unplugged adapter, closed stream, fatal read error) but nobody
// pressed Disconnect: do not leave the header saying "connected" while nothing is read.
async function serialLinkLost(why) {
  if (!serialConnected) return;
  await serialDisconnect();
  serialCode('C04', 'Board link lost (' + why + '). Click Device to reconnect.');
}

// Short codes for every way a board job can fail, so a student can report "U01" instead
// of "it did not work". docs/hardware-guide.md and docs/lab-hizli-kullanim.md list them
// with what to do. C = connection, U = upload, B = the board reported an error,
// A = upload refused before anything was sent, W = warning.
function serialCode(code, msg, err = 1) {
  lastSerialCode = code;
  let tag = codeTag(code);
  serialRxLog += '\n[' + tag + '] ' + msg + '\n';
  updateSerialTerminal();
  sLog(tag + ': ' + msg, err);
}
// "Error U01" / "Warning W01": letters and digits, so it is never read as the board's own "ERROR 30".
function codeTag(code) { return (code[0] === 'W' ? 'Warning ' : 'Error ') + code; }

// --- Serial read loop ---
// A line error (BREAK, framing, parity, overrun; a PAT RESET can cause one) errors only
// the current stream, and the port then hands out a new port.readable. So the loop takes
// a new reader and keeps the connection. Only a fatal error, or the stream ending while
// still connected, closes the link (serialLinkLost).
async function startSerialRead() {
  let port = serialPort, gen = serialGen, lost = '';
  let stream = null, softErrors = 0;
  if (!port) return;
  while (!lost && serialConnected && gen === serialGen) {
    // After a line error the port must hand out a new stream; the old one stays errored.
    // Give it a moment before deciding there is none.
    for (let i = 0; i < 10 && port.readable && port.readable === stream; i++) await sleep(100);
    if (!serialConnected || gen !== serialGen) break;
    if (!port.readable) { lost = 'the port has no readable stream'; break; }
    if (port.readable === stream) { lost = 'no new stream after a line error'; break; }
    // A steady run of line errors with no data: keep listening, but do not spin.
    if (softErrors > 10) { await sleep(500); if (!serialConnected || gen !== serialGen) break; }
    stream = port.readable;
    let reader = null;
    try {
      reader = serialReader = stream.getReader();
      while (serialConnected) {
        const { value, done } = await reader.read();
        if (done) { if (serialConnected) lost = 'the port closed'; break; }
        if (value) {
          softErrors = 0;
          let text = '';
          for (let i = 0; i < value.length; i++) {
            let ch = value[i];
            if (ch >= 32 && ch <= 126) text += String.fromCharCode(ch);
            else if (ch === 13) text += '\n';
            else if (ch === 10) {}
            else if (ch === 0x0C) { serialLastFormFeed = rxMark() + text.length; text += '[FF]'; }
            else text += '[' + ch.toString(16).toUpperCase().padStart(2,'0') + ']';
          }
          serialRxBuf += text;
          serialRxLog += text;
          if (serialRxBuf.length > 2000) {
            serialRxBase += serialRxBuf.length - 1000;
            serialRxBuf = serialRxBuf.slice(-1000);
          }
          if (serialRxLog.length > 8000) serialRxLog = serialRxLog.slice(-6000);
          if (boardRunning && rxSince(boardRunningMark).includes(PAT_PROMPT)) boardBackAtPrompt();
          updateSerialTerminal();
        }
      }
    } catch (e) {
      if (SERIAL_SOFT_ERRORS.includes(e.name)) {
        // Every line error goes in the terminal; after 10 in a row with no data, one summary line.
        softErrors++;
        lastSerialCode = 'W01';
        if (softErrors <= 10) serialRxLog += '\n[Warning W01] Serial line error (' + e.name + '). Still listening.\n';
        else if (softErrors === 11) serialRxLog += '\n[Warning W01] Serial line errors keep coming (' + e.name + '). Still listening. Check the cable and that nothing else is using the port.\n';
        updateSerialTerminal();
      } else if (serialConnected && gen === serialGen) {
        lost = (e.name && e.name !== 'Error' ? e.name + ': ' : '') + (e.message || 'read error');
      }
    } finally {
      if (reader) { try { reader.releaseLock(); } catch(e){} }
      if (serialReader === reader) serialReader = null;
    }
  }
  if (serialConnected && gen === serialGen) await serialLinkLost(lost || 'no readable stream');
}

// A PAT: after a G that timed out: the program returned, or PAT RESET was pressed.
function boardBackAtPrompt() {
  let err = rxSince(boardRunningMark).match(/ERROR[^\n]*/);
  boardRunning = false;
  if (err) {
    boardErrorLine = err[0].trim();
    serialRxLog += '\n=== FAILED: the board reported ' + boardErrorLine + ' ===\n';
    serialCode('B01', 'The board reported "' + boardErrorLine + '". See the terminal.');
  } else {
    serialRxLog += '\n[OK] Board is back at PAT: (the program returned, or PAT RESET was pressed).\n';
    if (!serialBusy) sLog('Board back at the PAT prompt. Ready to upload.', 0);
  }
  updateSerialUI();                              // header pill: BOARD RUNNING -> BOARD
}

// --- Received text, by absolute position ---
// rxMark() counts every character received on this page, so a mark taken before a
// command stays valid when the read loop trims serialRxBuf.
function rxMark() { return serialRxBase + serialRxBuf.length; }
function rxSince(mark) { return serialRxBuf.slice(Math.max(0, mark - serialRxBase)); }

// --- Low-level send ---
// Each returns false when nothing could be sent. A failed write sets serialTxError,
// which stops the running job (see uploadSegmentsAndRun).
async function serialSendRaw(text) {
  if (!serialConnected || !serialWriter) return false;
  try {
    await serialWriter.write(new TextEncoder().encode(text));
    return true;
  } catch (e) {
    serialWriteFailed(e);
    return false;
  }
}

async function serialSendBytes(bytes) {
  if (!serialConnected || !serialWriter) return false;
  try {
    await serialWriter.write(new Uint8Array(bytes));
    return true;
  } catch (e) {
    serialWriteFailed(e);
    return false;
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function serialSendSlow(text) {
  if (!serialConnected || !serialWriter) return false;
  let enc = new TextEncoder();
  try {
    for (let i = 0; i < text.length; i++) {
      await serialWriter.write(enc.encode(text[i]));
      await sleep(2);
    }
    return true;
  } catch (e) {
    serialWriteFailed(e);
    return false;
  }
}

async function serialSendBytesSlow(bytes) {
  if (!serialConnected || !serialWriter) return false;
  try {
    for (let i = 0; i < bytes.length; i++) {
      await serialWriter.write(new Uint8Array([bytes[i]]));
      await sleep(2);
    }
    return true;
  } catch (e) {
    serialWriteFailed(e);
    return false;
  }
}

function serialWriteFailed(e) {
  if (!serialConnected) return;                  // closed under us: the job reports that instead
  serialTxError = e.message || e.name || 'write error';
  serialCode('C05', 'Serial write error: ' + serialTxError + '. Click Disconnect, then Device to reconnect.');
}

// Resolves true when pattern arrives after cmd was sent; false at the timeout, when the
// write fails, or as soon as the link is closed or re-opened (gen: the caller's connection).
async function sendAndWait(cmd, pattern, timeoutMs, gen = serialGen) {
  if (gen !== serialGen) return false;
  let mark = rxMark();
  if (cmd && !(await serialSendRaw(cmd))) return false;
  return new Promise(resolve => {
    let start = Date.now();
    let check = () => {
      if (rxSince(mark).includes(pattern)) { resolve(true); return; }
      if (gen !== serialGen || Date.now() - start > timeoutMs) { resolve(false); return; }
      setTimeout(check, 30);
    };
    check();
  });
}

// --- One job at a time on the board ---
// Upload and Run, G, T, Send, DTR reset and the console helpers share one busy flag, so
// their commands never mix on the line. Each job checks it itself (buttons, palette,
// Enter key and console all end up here). While it is set the Upload button is disabled.
// Device (then labelled Disconnect) stays enabled: it closes the link, which stops the job.
function serialRefuseBusy() {
  if (!serialBusy) return false;
  serialCode('U06', serialBusy === 'upload' ? 'Upload in progress. Wait for it to finish.'
    : 'Waiting for the board. Try again in a moment.');
  return true;
}
function setSerialBusy(job, text) { serialBusy = job || ''; busyText = text || ''; updateSerialUI(); }

// G at 0080:<addrStr>, then wait up to 8 s for PAT:. Sends nothing else. Shared by
// Upload and Run and the G button.
//   'returned': PAT: came back, the program handed control back to the monitor
//   'error':    the monitor printed an ERROR line (for example ERROR 30 and a dump)
//   'running':  no reply yet; a later PAT: on the read loop clears boardRunning
async function boardGo(addrStr) {
  let gen = serialGen;
  let mark = rxMark();
  let got = await sendAndWait('G 0080:' + addrStr + '\r\n', PAT_PROMPT, 8000, gen);
  if (gen !== serialGen) return 'aborted';
  if (serialTxError) return 'write-error';
  let err = rxSince(mark).match(/ERROR[^\n]*/);
  if (err) {
    boardErrorLine = err[0].trim();
    serialRxLog += '\n=== FAILED: the board reported ' + boardErrorLine + ' ===\n';
    updateSerialTerminal();
    return 'error';
  }
  if (got) {
    serialRxLog += '=== SUCCESS ===\n';
    updateSerialTerminal();
    return 'returned';
  }
  boardRunning = true;
  boardRunningMark = rxMark();
  serialRxLog += '\n--- Program is running on the board. Press PAT RESET before the next upload.\n';
  updateSerialTerminal();
  return 'running';
}

const NO_PROMPT_HELP = 'The board did not answer. If the last program is still running, press PAT RESET, wait for PAT:, then Upload again.';

// Final status line for the result of an upload or a G.
const BOARD_RESULT_MSG = {
  'returned':  ['', 'Program finished, board back at the PAT prompt.'],
  'running':   ['', 'Running. Press PAT RESET before the next upload.'],
  'error':     ['B01', 'The board reported an error. See the terminal.'],
  'no-prompt': ['U01', NO_PROMPT_HELP],
  'no-c':      ['U02', 'Upload stopped: no reply to the C command. Press PAT RESET and try again.'],
  'no-exit':   ['U03', 'Upload stopped: no PAT: after writing a segment. Press PAT RESET and try again.'],
  'left-c':    ['U04', 'Upload stopped: the board left change-memory mode (PAT RESET or an error). Press PAT RESET, wait for PAT:, then Upload again.'],
  'aborted':   ['U05', 'Stopped: the connection to the board was closed.'],
  'write-error': ['C05', 'Stopped: could not write to the serial port. Click Disconnect, then Device to reconnect.'],
  'not-connected': ['C06', 'Connect to device first!']
};
function reportBoardResult(result) {
  if (result === 'busy') return;                 // serialRefuseBusy already said why
  let [code, msg] = BOARD_RESULT_MSG[result] || ['U09', 'Upload ended: ' + result];
  if (result === 'error' && boardErrorLine) msg = 'The board reported "' + boardErrorLine + '". See the terminal.';
  if (!code) { sLog(msg, 0); return; }
  if (result === 'write-error' || result === 'not-connected') { lastSerialCode = code; sLog(codeTag(code) + ': ' + msg, 1); return; }  // already in the terminal
  serialCode(code, msg);
}

// --- Terminal input ---
async function serialTermSend() {
  if (serialRefuseBusy()) return;
  let input = document.getElementById('serialInput');
  if (!input || !input.value.trim()) return;
  if (!serialConnected) { serialCode('C06', 'Connect to device first!'); return; }
  let cmd = input.value;
  serialRxLog += '> ' + cmd + '\n';
  updateSerialTerminal();
  serialBusy = 'send';                           // a few ms: no button change
  serialTxError = '';
  try { await serialSendSlow(cmd + '\r\n'); } finally { serialBusy = ''; }
  input.value = '';
}

// --- Run / Trace commands ---
// G and T name segment 0080 explicitly, like every C and G of the upload (see upload.js),
// and use the entry ORG of the last upload: opening another example changes progOrg,
// not what is on the board. Before any upload they fall back to the assembled ORG.
function goTraceAddr() {
  let org = uploadedOrg !== null ? uploadedOrg : progOrg;
  return org ? org.toString(16).toUpperCase().padStart(4, '0') : '0100';
}
async function sendGo() {
  if (serialRefuseBusy()) return;
  if (!serialConnected) { serialCode('C06', 'Connect to device first!'); return; }
  let addr = goTraceAddr();
  serialRxLog += '\nTX: G 0080:' + addr + '\n';
  updateSerialTerminal();
  setSerialBusy('G', 'Waiting for PAT:');
  serialTxError = '';
  let result = 'aborted';
  try { result = await boardGo(addr); } finally { setSerialBusy(''); }
  reportBoardResult(result);
}
async function sendTrace() {
  if (serialRefuseBusy()) return;
  if (!serialConnected) { serialCode('C06', 'Connect to device first!'); return; }
  let addr = goTraceAddr();
  let gen = serialGen;
  serialRxLog += '\nTX: T 0080:' + addr + '\n';
  updateSerialTerminal();
  setSerialBusy('T', 'Waiting for PAT:');
  serialTxError = '';
  let got = false;
  try { got = await sendAndWait('T 0080:' + addr + '\r\n', PAT_PROMPT, 5000, gen); } finally { setSerialBusy(''); }
  if (gen !== serialGen || serialTxError) return;   // disconnect or write error: already reported
  serialRxLog += got ? '[OK] Trace complete\n' : '--- TIMEOUT ---\n';
  updateSerialTerminal();
}

// --- DTR Reset ---
async function sendDtrReset() {
  if (serialRefuseBusy()) return;
  if (!serialConnected || !serialPort) { serialCode('C06', 'Connect to device first!'); return; }
  let port = serialPort;
  serialRxLog += '\n[...] DTR reset...\n';
  updateSerialTerminal();
  setSerialBusy('dtr', 'DTR reset');
  try {
    await port.setSignals({ dataTerminalReady: false });
    await sleep(100);
    await port.setSignals({ dataTerminalReady: true });
    await sleep(100);
    await port.setSignals({ dataTerminalReady: false });
    serialRxLog += '[OK] DTR toggled. Waiting for PAT:...\n';
  } catch (e) {
    serialRxLog += '[WARN] DTR error: ' + e.message + '\n';
  } finally {
    setSerialBusy('');
  }
  updateSerialTerminal();
}

// --- UI ---
function updateSerialUI() {
  let btn = document.getElementById('serialBtn');
  let dot = document.getElementById('serialDot');
  let dot2 = document.getElementById('serialDot2');
  if (btn) {
    btn.textContent = serialConnected ? 'Disconnect' : 'Device';
    btn.classList.toggle('connected', serialConnected);
    btn.setAttribute('data-tip', serialBusy ? 'Stop and disconnect' : 'USB serial connection');
  }
  if (dot) dot.classList.toggle('connected', serialConnected);
  if (dot2) dot2.classList.toggle('connected', serialConnected);
  let btn2 = document.getElementById('serialBtn2');
  if (btn2) {
    btn2.textContent = serialConnected ? 'Disconnect' : 'Connect';
    btn2.classList.toggle('connected', serialConnected);
  }
  let upBtn = document.getElementById('uploadBtn');
  if (upBtn) {
    let busy = !!serialBusy;
    upBtn.classList.toggle('active', serialConnected && !busy);
    upBtn.disabled = busy || !('serial' in navigator);
    upBtn.setAttribute('aria-busy', busy ? 'true' : 'false');
    upBtn.textContent = busy && busyText ? busyText : 'Upload and Run';
  }
  applySimLock();
}

// --- Simulator lock while a board is connected ---
// One source of truth: serialConnected (+ the "Simulate anyway" override). Called from
// updateSerialUI, i.e. on connect, on disconnect, on a lost link and around every upload.
function simLocked() { return serialConnected && !simLockOverride; }
function simLockedNotice() { sLog('Simulator paused while the board is connected. Disconnect, or use "Simulate anyway".', 1); }
function simulateAnyway() {
  if (serialRefuseBusy()) return;
  simLockOverride = true; applySimLock();
}
let _simLockState = '';
function applySimLock() {
  let locked = simLocked();
  let state = locked + '/' + serialBusy + '/' + boardRunning;
  if (state === _simLockState) return;        // updateSerialUI runs per uploaded byte; only act on changes
  _simLockState = state;
  if (locked && typeof running !== 'undefined' && running) stopRun();
  if (locked && typeof stopPiezo === 'function') stopPiezo();
  if (locked && typeof closePorts === 'function') closePorts();
  let rp = document.querySelector('.rp');
  if (rp) rp.classList.toggle('sim-locked', locked);
  let content = document.getElementById('rpContent');
  if (content) content.inert = locked;
  let banner = document.getElementById('simLockBanner');
  if (banner) banner.hidden = !locked;
  ['stepBtn', 'runBtn', 'simResetBtn', 'spd'].forEach(id => {
    let el = document.getElementById(id); if (el) el.disabled = locked;
  });
  // Back/Fwd also depend on the history, so let renderAll recompute them (it reads simLocked()).
  if (typeof renderAll === 'function' && typeof AX !== 'undefined') renderAll();
  if (typeof setSt === 'function')
    setSt(typeof running !== 'undefined' && running ? 'RUNNING' : (typeof halt !== 'undefined' && halt ? 'HALTED' : 'READY'));
}

function updateSerialTerminal() {
  let el = document.getElementById('serialLog');
  if (!el) return;
  el.textContent = serialRxLog;
  el.scrollTop = el.scrollHeight;
}

// One line in front of the copied log, so a report from the lab says where it stopped.
function serialReportHeader() {
  return 'workbench86 ' + WB_VERSION + ' | ' + (navigator.userAgent || 'unknown browser')
    + ' | last code: ' + (lastSerialCode || 'none')
    + (lastUploadInfo ? ' | last upload: ' + lastUploadInfo : '') + '\n\n';
}

function copySerialLog() {
  navigator.clipboard.writeText(serialReportHeader() + serialRxLog).then(() => {
    sLog('Log copied', 0);
  }).catch(() => {
    let el = document.getElementById('serialLog');
    if (el) {
      let r = document.createRange(); r.selectNodeContents(el);
      let s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    }
  });
}

// Closing or reloading the tab in the middle of an upload leaves the board in C mode.
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('beforeunload', e => {
    if (!serialBusy) return;
    e.preventDefault();
    e.returnValue = '';
  });
}

// Disable hardware buttons if WebSerial not supported
if (!('serial' in navigator)) {
  let devBtn = document.getElementById('serialBtn');
  let upBtn = document.getElementById('uploadBtn');
  if (devBtn) { devBtn.disabled = true; devBtn.title = 'WebSerial: Chrome/Edge only'; }
  if (upBtn) { upBtn.disabled = true; upBtn.title = 'WebSerial: Chrome/Edge only'; }
} else if (navigator.serial && navigator.serial.addEventListener) {
  // Unplugged adapter: the port's 'disconnect' event bubbles up to navigator.serial.
  navigator.serial.addEventListener('disconnect', e => {
    if (serialConnected && e.target === serialPort) serialLinkLost('adapter unplugged');
  });
}
