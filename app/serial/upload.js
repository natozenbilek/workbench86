// ============================================================
// workbench86 Serial Upload: HEX upload, C command, probes, LED tests
// ============================================================

// --- Intel HEX helpers ---
function ihexChecksum(bytes) {
  let sum = 0;
  for (let b of bytes) sum += b;
  return (~sum + 1) & 0xFF;
}

// Max data bytes per record. The Intel HEX length field is ONE byte, so a whole
// image cannot go out as a single record: anything over 255 bytes would wrap and
// the receiver would parse garbage. 32 is the usual record size for this format.
const IHEX_REC_LEN = 32;

function ihexLine(addr, data) {
  let bytes = [data.length, (addr >> 8) & 0xFF, addr & 0xFF, 0x00, ...data];
  let cs = ihexChecksum(bytes);
  let hex = ':';
  for (let b of bytes) hex += b.toString(16).toUpperCase().padStart(2, '0');
  hex += cs.toString(16).toUpperCase().padStart(2, '0');
  return hex;
}

// === METHOD 1: Intel HEX upload via L + /t1 ===
// Console only (no button calls it). Holds the busy flag like Upload and Run.
async function uploadHexAndRun(machineCode, label) {
  if (serialRefuseBusy()) return;
  if (!serialConnected) { serialCode('C06', 'Connect to device first!'); return; }

  let hexEnd = ':00000001FF';
  let gen = serialGen;
  let stopped = () => {
    if (gen === serialGen && !serialTxError) return false;
    serialRxLog += '\n[ABORT] HEX upload stopped\n';
    updateSerialTerminal();
    return true;
  };
  setSerialBusy('upload', 'Uploading HEX');
  serialTxError = '';
  try {
    serialRxLog += '\n=== ' + (label || 'HEX UPLOAD') + ' ===\n';
    updateSerialTerminal();

    let gotP = await sendAndWait('\r\n', PAT_PROMPT, 2000, gen);
    if (stopped()) return;
    serialRxLog += gotP ? '[OK] PAT:\n' : '[WARN] No PAT: prompt, continuing...\n';
    updateSerialTerminal();

    serialRxLog += 'TX: L\n';
    updateSerialTerminal();
    await serialSendRaw('L\r\n');
    await sleep(700);
    if (stopped()) return;

    serialRxLog += 'TX: /t1\n';
    updateSerialTerminal();
    await serialSendRaw('/t1\r\n');
    await sleep(700);
    if (stopped()) return;

    // One record per IHEX_REC_LEN bytes, load address advancing with the offset,
    // sent in ascending address order and then closed by the end-of-file record.
    for (let off = 0; off < machineCode.length; off += IHEX_REC_LEN) {
      let hexData = ihexLine((0x0100 + off) & 0xFFFF, machineCode.slice(off, off + IHEX_REC_LEN));
      serialRxLog += 'TX: ' + hexData + '\n';
      updateSerialTerminal();
      await serialSendRaw(hexData + '\r\n');
      await sleep(10);
      if (stopped()) return;
    }

    serialRxLog += 'TX: ' + hexEnd + '\n';
    updateSerialTerminal();
    await serialSendRaw(hexEnd + '\r\n');
    await sleep(1000);
    if (stopped()) return;

    serialRxLog += 'TX: G 0100\n';
    updateSerialTerminal();
    setSerialBusy('G', 'Waiting for PAT:');
    let gotG = await sendAndWait('G 0100\r\n', PAT_PROMPT, 5000, gen);
    if (stopped()) return;
    serialRxLog += gotG ? '=== SUCCESS ===\n' : '--- G TIMEOUT (check LEDs) ---\n';
    updateSerialTerminal();
  } finally {
    setSerialBusy('');
  }
}

// === METHOD 2: C command + ESC exit (shared core) ===
// One block at one address, then G. Used by the LED tests and the probes. The wire
// sequence is uploadSegmentsAndRun's with a single segment.
async function uploadViaC(machineCode, label, opts = {}) {
  let addr = (opts.startAddr || 0x0100);
  let result = await uploadSegmentsAndRun([{ start: addr, bytes: machineCode }], addr, label, opts);
  reportBoardResult(result);
  return result;
}

async function uploadCmdAndRun(machineCode, label, startAddr) {
  return uploadViaC(machineCode, label, { startAddr, waitForHalt: true });
}

async function uploadCmdAndRunNoWait(machineCode, label) {
  return uploadViaC(machineCode, label, { waitForHalt: false });
}

// === METHOD 2b: multi-segment C upload (skip inter-ORG gaps) ===
// Same per-byte 'C'/ESC protocol as the April 2026 build, which was the last one seen
// working on a board: CR LF and wait for PAT:, then per segment 'C 0080:hhhh', one byte
// per line with a wait for ':', ESC CR and a wait for PAT:, and finally 'G 0080:hhhh'.
// Differences from that build: the address is each segment's ORG instead of always
// 0100, and a multi-ORG program repeats the C..ESC CR block per segment (gaps between
// ORGs are not sent). C, G and T always name segment 0080: with an offset alone the
// monitor uses whatever segment it currently holds, which was FFFF after some resets.
// Holds the busy flag for the whole job. After every await it stops if the link was
// closed or re-opened (Disconnect, Device) or a write failed, so nothing more is sent.
// It also stops, without G, if the board leaves C mode in the middle of a segment.
// Returns a result code for reportBoardResult (core.js).
async function uploadSegmentsAndRun(segments, entryAddr, label, opts = {}) {
  if (!serialConnected) { serialCode('C06', 'Connect to device first!'); return 'not-connected'; }
  if (serialRefuseBusy()) return 'busy';
  let gen = serialGen;
  let total = 0, sent = 0, stop = '', unconfirmed = 0;
  for (let seg of segments) total += seg.bytes.length;
  let stopped = () => {
    if (gen !== serialGen) {
      serialRxLog += '\n[ABORT] link closed during upload\n';
      updateSerialTerminal();
      return 'aborted';
    }
    return serialTxError ? 'write-error' : '';
  };
  // In C mode the board answers each byte with the next address. A PAT: prompt, an
  // ERROR line or a form feed (the start of the PAT RESET banner) means it is back at
  // the command prompt, and the remaining bytes would be typed there as commands.
  let leftCMode = mark => {
    if (!/PAT:|ERROR/.test(rxSince(mark)) && serialLastFormFeed < mark) return '';
    serialRxLog += '\n[ABORT] The board left change-memory mode. Upload stopped, G not sent.\n';
    updateSerialTerminal();
    return 'left-c';
  };
  setSerialBusy('upload', 'Uploading 0/' + total);
  serialTxError = '';
  try {
    serialRxLog += '\n=== ' + (label || 'C CMD') + ' (C + ESC exit) ===\n';
    updateSerialTerminal();

    let gotP = await sendAndWait('\r\n', PAT_PROMPT, 2000, gen);
    if ((stop = stopped())) return stop;
    serialRxLog += gotP ? '[OK] PAT:\n' : '[WARN] No PAT: prompt.\n';
    updateSerialTerminal();
    if (!gotP) return 'no-prompt';

    for (let s = 0; s < segments.length; s++) {
      let seg = segments[s];
      if (s > 0) {
        await sleep(200);                      // same settle time as before G
        if ((stop = stopped())) return stop;
      }
      let segStr = seg.start.toString(16).toUpperCase().padStart(4, '0');
      serialRxLog += 'TX: C 0080:' + segStr + '\n';
      updateSerialTerminal();
      let gotC = await sendAndWait('C 0080:' + segStr + '\r\n', segStr, 3000, gen);
      if ((stop = stopped())) return stop;
      if (!gotC) {
        serialRxLog += '[WARN] No response to C command\n';
        updateSerialTerminal();
        return 'no-c';
      }
      await sleep(200);

      let seen = rxMark();                     // board output from the first byte on
      for (let i = 0; i < seg.bytes.length; i++) {
        if ((stop = stopped() || leftCMode(seen))) return stop;
        let val = seg.bytes[i].toString(16).toUpperCase().padStart(2, '0');
        serialRxLog += val + ' ';
        updateSerialTerminal();
        let gotNext = await sendAndWait(val + '\r\n', ':', 2000, gen);
        if ((stop = stopped())) return stop;
        if (!gotNext && i < seg.bytes.length - 1) {
          serialRxLog += '[!] ';
          unconfirmed++;
          updateSerialTerminal();
        }
        sent++;
        busyText = 'Uploading ' + sent + '/' + total;
        updateSerialUI();
        await sleep(50);
      }
      if ((stop = stopped() || leftCMode(seen))) return stop;

      serialRxLog += '\n[OK] segment @' + segStr + ': ' + seg.bytes.length + ' bytes.\n';
      updateSerialTerminal();
      await serialSendBytes([0x1B, 0x0D]);
      if ((stop = stopped())) return stop;
      let gotExit = await sendAndWait('', PAT_PROMPT, 3000, gen);
      if (!gotExit && gen === serialGen) gotExit = await sendAndWait('\r\n', PAT_PROMPT, 2000, gen);
      if ((stop = stopped())) return stop;
      serialRxLog += gotExit ? '[OK] PAT: prompt\n' : '[WARN] No PAT: prompt after segment\n';
      updateSerialTerminal();
      if (!gotExit) return 'no-exit';
    }

    if (unconfirmed) {                        // log line only; nothing extra is sent
      lastSerialCode = 'W02';
      serialRxLog += '\n[Warning W02] ' + unconfirmed + ' byte(s) got no reply from the board. If the program misbehaves, press PAT RESET and upload again.\n';
      updateSerialTerminal();
    }
    await sleep(200);
    if ((stop = stopped())) return stop;
    uploadedOrg = entryAddr;                   // the G and T buttons use it from now on
    let entryStr = entryAddr.toString(16).toUpperCase().padStart(4, '0');
    serialRxLog += 'TX: G 0080:' + entryStr + '\n';
    updateSerialTerminal();
    if (opts.waitForHalt !== false) {
      setSerialBusy('G', 'Waiting for PAT:');
      return await boardGo(entryStr);
    }
    await serialSendRaw('G 0080:' + entryStr + '\r\n');
    if ((stop = stopped())) return stop;
    serialRxLog += '=== RUNNING (press RESET to stop) ===\n';
    updateSerialTerminal();
    boardRunning = true;
    boardRunningMark = rxMark();
    return 'running';
  } finally {
    setSerialBusy('');
  }
}

// === LED test programs ===
function makeLedProgram(ledVal) {
  return [
    0xB0, 0xFF, 0xE6, 0x80, 0xE6, 0x82, 0xE6, 0x84,
    0xE6, 0x86, 0xE6, 0x88,
    0xB0, ledVal & 0xFF, 0xE6, 0x92,
    0xEB, 0xFE,
  ];
}

const MC_EXIT = [0xBB, 0x00, 0x00, 0xB4, 0x04, 0xCD, 0x28];
const MC_ALLON = makeLedProgram(0xFF);
const MC_OFF = makeLedProgram(0x00);

async function testExit()   { await uploadCmdAndRun(MC_EXIT, 'EXIT TEST'); }
async function testLedAll() { await uploadCmdAndRunNoWait(MC_ALLON, 'ALL ON'); }
async function testLedOff() { await uploadCmdAndRunNoWait(MC_OFF, 'LED OFF'); }

async function directLedTest(portVal, label) {
  let mc = makeLedProgram(portVal);
  await uploadCmdAndRunNoWait(mc, label || ('LED ' + portVal.toString(16).toUpperCase()));
}

// === Upload assembled program from editor ===
// Assemble what is in the editor NOW, so the board gets the code the student sees,
// not an older assemble or simulator memory that a Run/Step has since modified.
function assembleForUpload() {
  if (typeof isHighLevelFile === 'function' && isHighLevelFile()) {
    // doAssemble refuses while a non-.asm tab is active, so there is nothing fresh to send.
    serialCode('A01', 'Upload cancelled: Upload sends assembly. Translate to ASM, open the .asm tab, then Upload and Run.');
    return false;
  }
  if (doAssemble() !== true) {
    let log = document.getElementById('log');
    serialCode('A02', 'Upload cancelled. Fix the assembler errors first:\n' + (log ? log.textContent : ''));
    return false;
  }
  if (!pLen) { serialCode('A03', 'Upload cancelled: the program has no instructions.'); return false; }
  return true;
}

async function uploadProgram() {
  if (serialRefuseBusy()) return;                           // second click / palette while busy
  if (!serialConnected) { serialCode('C06', 'Connect to device first!'); return; }
  simLockOverride = false;                                  // uploading = board mode again
  applySimLock();                                           // stops a simulator run before assembling
  if (!assembleForUpload()) return;

  let org = progOrg;

  // Group the assembled items into contiguous segments, skipping inter-ORG gaps so
  // we don't deposit thousands of zero-fill bytes between far-apart ORGs (e.g. pa27
  // code@0900H + data@2000H = a ~5.8KB gap). A single-ORG program yields exactly one
  // segment, so its upload is byte-identical to before.
  let ranges = [];
  for (let item of asmOutput) {
    let len = item.bytes ? item.bytes.length : (item.words ? item.words.length * 2 : 0);
    if (len > 0) ranges.push([item.addr, item.addr + len]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  let segments = [];
  for (let [s, e] of ranges) {
    let last = segments[segments.length - 1];
    if (last && s <= last.end) { if (e > last.end) last.end = e; }   // contiguous/overlap -> extend
    else segments.push({ start: s, end: e });
  }
  // The bytes come from the assembler output itself, not from simulator memory. Items
  // are applied in source order, so where two overlap the later one wins, as in the
  // memory image doAssemble builds.
  let image = new Map();
  for (let item of asmOutput) {
    let bytes = item.bytes || (item.words ? item.words.flatMap(w => [w & 0xFF, (w >> 8) & 0xFF]) : []);
    for (let j = 0; j < bytes.length; j++) image.set(item.addr + j, bytes[j] & 0xFF);
  }
  let total = 0;
  for (let seg of segments) {
    seg.bytes = [];
    for (let a = seg.start; a < seg.end; a++) seg.bytes.push(image.get(a) || 0);
    total += seg.bytes.length;
  }

  if (!total) { serialCode('A03', 'Upload cancelled: the program is empty.'); return; }

  // Run at the program's real ORG (entry = first instruction's ORG), not a hardcoded
  // 0x100, so the entry the student types (e.g. G 500) matches where the code lands.
  lastSerialCode = '';
  lastUploadInfo = (typeof activeTabKey === 'string' && activeTabKey ? activeTabKey + ', ' : '')
    + 'ORG ' + org.toString(16).toUpperCase() + 'H, ' + segments.length + ' segment(s), ' + total + ' bytes';
  sLog(`Uploading ${total} bytes to device (${segments.length} segment${segments.length > 1 ? 's' : ''})...`, 0);
  let result = await uploadSegmentsAndRun(segments, org,
    'UPLOAD: ' + total + 'B @ ' + org.toString(16).toUpperCase() + 'H'
    + (segments.length > 1 ? ' (' + segments.length + ' seg)' : ''));
  reportBoardResult(result);
}

// === Display probes ===
async function probeDisplay() {
  if (serialRefuseBusy()) return;
  if (!serialConnected) { serialCode('C06', 'Connect to device first!'); return; }
  serialRxLog += '\n=== DISPLAY PROBE ===\n';
  serialRxLog += 'Testing keyboard display addresses...\n';
  updateSerialTerminal();
  serialRxLog += '\n[TEST 1] KYDBUF at 0000:047D, all segments ON\n';
  updateSerialTerminal();
  // FF into KYDBUF 047D-0484, then EXIT instead of JMP $, so the monitor gets control
  // back and refreshes the display from its buffer (April 2026 build, commit c8ec242).
  let mc1 = [
    0x1E, 0xB8, 0x00, 0x00, 0x8E, 0xD8,
    0xC6, 0x06, 0x7D, 0x04, 0xFF, 0xC6, 0x06, 0x7E, 0x04, 0xFF,
    0xC6, 0x06, 0x7F, 0x04, 0xFF, 0xC6, 0x06, 0x80, 0x04, 0xFF,
    0xC6, 0x06, 0x81, 0x04, 0xFF, 0xC6, 0x06, 0x82, 0x04, 0xFF,
    0xC6, 0x06, 0x83, 0x04, 0xFF, 0xC6, 0x06, 0x84, 0x04, 0xFF,
    0x1F, 0xB4, 0x04, 0xCD, 0x28
  ];
  await uploadCmdAndRun(mc1, 'PROBE: KYDBUF 047D + EXIT');
  serialRxLog += '>>> If the display shows 8s now, KYDBUF=047D is right (the monitor refreshes it after EXIT).\n';
  serialRxLog += '>>> If not, press PAT RESET and try the next probe.\n';
  updateSerialTerminal();
}

async function probeDisplay2() {
  if (serialRefuseBusy()) return;
  if (!serialConnected) { serialCode('C06', 'Connect to device first!'); return; }
  serialRxLog += '\n[TEST 2] 8279 display controller at ports 20H/21H\n';
  updateSerialTerminal();
  let mc2 = [
    0xB0, 0xD1, 0xE6, 0x21, 0xB9, 0xFF, 0x00, 0xE2, 0xFE,
    0xB0, 0x80, 0xE6, 0x21,
    0xB0, 0xFF, 0xE6, 0x20, 0xE6, 0x20, 0xE6, 0x20, 0xE6, 0x20,
    0xE6, 0x20, 0xE6, 0x20, 0xE6, 0x20, 0xE6, 0x20,
    0xEB, 0xFE
  ];
  await uploadCmdAndRunNoWait(mc2, 'PROBE: 8279 @20H/21H');
  serialRxLog += '>>> Check display! If 8s appear, 8279 is at 20H/21H.\n';
  serialRxLog += '>>> Press PAT RESET, then try next test.\n';
  updateSerialTerminal();
}

async function probeDisplay3() {
  if (serialRefuseBusy()) return;
  if (!serialConnected) { serialCode('C06', 'Connect to device first!'); return; }
  serialRxLog += '\n[TEST 3] 8279 @40H/41H\n';
  updateSerialTerminal();
  let mc3 = [
    0xB0, 0xD1, 0xE6, 0x41, 0xB9, 0xFF, 0x00, 0xE2, 0xFE,
    0xB0, 0x80, 0xE6, 0x41,
    0xB0, 0xFF, 0xE6, 0x40, 0xE6, 0x40, 0xE6, 0x40, 0xE6, 0x40,
    0xE6, 0x40, 0xE6, 0x40, 0xE6, 0x40, 0xE6, 0x40,
    0xEB, 0xFE
  ];
  await uploadCmdAndRunNoWait(mc3, 'PROBE: 8279 @40H/41H');
  serialRxLog += '>>> Check display! If 8s appear, 8279 is at 40H/41H.\n';
  serialRxLog += '>>> Press PAT RESET, then try next test.\n';
  updateSerialTerminal();
}

async function probeDisplay4() {
  if (serialRefuseBusy()) return;
  if (!serialConnected) { serialCode('C06', 'Connect to device first!'); return; }
  serialRxLog += '\n[TEST 4] 8279 @60H/61H\n';
  updateSerialTerminal();
  let mc4 = [
    0xB0, 0xD1, 0xE6, 0x61, 0xB9, 0xFF, 0x00, 0xE2, 0xFE,
    0xB0, 0x80, 0xE6, 0x61,
    0xB0, 0xFF, 0xE6, 0x60, 0xE6, 0x60, 0xE6, 0x60, 0xE6, 0x60,
    0xE6, 0x60, 0xE6, 0x60, 0xE6, 0x60, 0xE6, 0x60,
    0xEB, 0xFE
  ];
  await uploadCmdAndRunNoWait(mc4, 'PROBE: 8279 @60H/61H');
  serialRxLog += '>>> Check display! If 8s, 8279 is at 60H/61H.\n';
  serialRxLog += '>>> Press PAT RESET to continue.\n';
  updateSerialTerminal();
}

// === Per-port hardware forwarding: UNIMPLEMENTED PLACEHOLDERS ===
// Live per-port forwarding to the board is NOT supported. There is no
// protocol here for mirroring a single IN/OUT to the device while a program is
// running, and none is planned in this layer. The two functions below exist only
// so ioWrite/ioRead in core/io/ports.js can call them unconditionally when
// serialConnected is set; they never touch the serial link.
// The supported hardware path is the PROGRAM UPLOAD: uploadProgram,
// uploadHexAndRun and uploadViaC send the assembled image to the board and start
// it with G. Anything the program then does with its ports happens on the board.
// HW_PORTS is just the set of addresses the (absent) forwarding would cover.
const HW_PORTS = new Set([0x80,0x82,0x84,0x86,0x88,0x8A,0x8C,0x8E,0x90,0x92,0x94,0x96,0x98,0x9A,0x9C,0x9E]);

// Placeholder: discards the value. Nothing is transmitted.
async function serialWritePort(port, val) {}

// Placeholder: resolves with the simulator's OWN cached port byte, so the
// caller's write-back stores the value it already had. No device is read.
function serialReadPort(port) {
  return Promise.resolve(ioPorts ? ioPorts[port & 0xFF] : 0);
}
