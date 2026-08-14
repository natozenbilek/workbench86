// ============================================================
// workbench86 Serial Upload - HEX upload, C command, probes, LED tests
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
async function uploadHexAndRun(machineCode, label) {
  if (!serialConnected) { sLog('Connect to device first!', 1); return; }

  let hexEnd = ':00000001FF';

  serialRxLog += '\n=== ' + (label || 'HEX UPLOAD') + ' ===\n';
  updateSerialTerminal();

  let gotP = await sendAndWait('\r\n', PAT_PROMPT, 2000);
  serialRxLog += gotP ? '[OK] PAT:\n' : '[WARN] No PAT: prompt, continuing...\n';
  updateSerialTerminal();

  serialRxLog += 'TX: L\n';
  updateSerialTerminal();
  await serialSendRaw('L\r\n');
  await sleep(700);

  serialRxLog += 'TX: /t1\n';
  updateSerialTerminal();
  await serialSendRaw('/t1\r\n');
  await sleep(700);

  // One record per IHEX_REC_LEN bytes, load address advancing with the offset,
  // sent in ascending address order and then closed by the end-of-file record.
  for (let off = 0; off < machineCode.length; off += IHEX_REC_LEN) {
    let hexData = ihexLine((0x0100 + off) & 0xFFFF, machineCode.slice(off, off + IHEX_REC_LEN));
    serialRxLog += 'TX: ' + hexData + '\n';
    updateSerialTerminal();
    await serialSendRaw(hexData + '\r\n');
    await sleep(10);
  }

  serialRxLog += 'TX: ' + hexEnd + '\n';
  updateSerialTerminal();
  await serialSendRaw(hexEnd + '\r\n');
  await sleep(1000);

  serialRxLog += 'TX: G 0100\n';
  updateSerialTerminal();
  let gotG = await sendAndWait('G 0100\r\n', PAT_PROMPT, 5000);
  serialRxLog += gotG ? '=== SUCCESS ===\n' : '--- G TIMEOUT (check LEDs) ---\n';
  updateSerialTerminal();
}

// === METHOD 2: C command + ESC exit (shared core) ===
async function uploadViaC(machineCode, label, opts = {}) {
  if (!serialConnected) { sLog('Connect to device first!', 1); return; }
  let addr = (opts.startAddr || 0x0100);
  let addrStr = addr.toString(16).toUpperCase().padStart(4, '0');

  serialRxLog += '\n=== ' + (label || 'C CMD') + ' (C + ESC exit) ===\n';
  updateSerialTerminal();

  let gotP = await sendAndWait('\r\n', PAT_PROMPT, 2000);
  serialRxLog += gotP ? '[OK] PAT:\n' : '[WARN] No PAT: prompt\n';
  updateSerialTerminal();
  if (!gotP) return;

  serialRxLog += 'TX: C ' + addrStr + '\n';
  updateSerialTerminal();
  let gotC = await sendAndWait('C ' + addrStr + '\r\n', addrStr, 3000);
  if (!gotC) {
    serialRxLog += '[WARN] No response to C command\n';
    updateSerialTerminal();
    return;
  }
  await sleep(200);

  for (let i = 0; i < machineCode.length; i++) {
    let val = machineCode[i].toString(16).toUpperCase().padStart(2, '0');
    serialRxLog += val + ' ';
    updateSerialTerminal();
    let gotNext = await sendAndWait(val + '\r\n', ':', 2000);
    if (!gotNext && i < machineCode.length - 1) {
      serialRxLog += '[!] ';
      updateSerialTerminal();
    }
    await sleep(50);
  }

  serialRxLog += '\n[OK] ' + machineCode.length + ' bytes written.\n';
  updateSerialTerminal();

  serialRxLog += '[...] Exiting C mode (ESC+CR)...\n';
  updateSerialTerminal();
  await serialSendBytes([0x1B, 0x0D]);

  let gotExit = await sendAndWait('', PAT_PROMPT, 3000);
  if (!gotExit) {
    gotExit = await sendAndWait('\r\n', PAT_PROMPT, 2000);
  }
  serialRxLog += gotExit ? '[OK] PAT: prompt received\n' : '[WARN] No PAT: prompt received\n';
  updateSerialTerminal();
  if (!gotExit) return;

  await sleep(200);
  serialRxLog += 'TX: G ' + addrStr + '\n';
  updateSerialTerminal();

  if (opts.waitForHalt !== false) {
    let gotG = await sendAndWait('G ' + addrStr + '\r\n', PAT_PROMPT, 8000);
    serialRxLog += gotG ? '=== SUCCESS ===\n' : '--- G TIMEOUT ---\n';
  } else {
    await serialSendRaw('G ' + addrStr + '\r\n');
    serialRxLog += '=== RUNNING (press RESET to stop) ===\n';
  }
  updateSerialTerminal();
}

async function uploadCmdAndRun(machineCode, label, startAddr) {
  await uploadViaC(machineCode, label, { startAddr, waitForHalt: true });
}

async function uploadCmdAndRunNoWait(machineCode, label) {
  await uploadViaC(machineCode, label, { waitForHalt: false });
}

// === METHOD 2b: multi-segment C upload (skip inter-ORG gaps) ===
// Same per-byte 'C'/ESC protocol as uploadViaC, but deposits each contiguous
// segment at its own address and runs G <entryAddr> once at the end. For a
// single-segment program this emits the exact same C/ESC/G sequence as before;
// only multi-ORG programs differ (their zero-fill gaps are no longer sent).
async function uploadSegmentsAndRun(segments, entryAddr, label, opts = {}) {
  if (!serialConnected) { sLog('Connect to device first!', 1); return; }

  serialRxLog += '\n=== ' + (label || 'C CMD') + ' (C + ESC exit) ===\n';
  updateSerialTerminal();

  let gotP = await sendAndWait('\r\n', PAT_PROMPT, 2000);
  serialRxLog += gotP ? '[OK] PAT:\n' : '[WARN] No PAT: prompt\n';
  updateSerialTerminal();
  if (!gotP) return;

  for (let seg of segments) {
    let segStr = seg.start.toString(16).toUpperCase().padStart(4, '0');
    serialRxLog += 'TX: C ' + segStr + '\n';
    updateSerialTerminal();
    let gotC = await sendAndWait('C ' + segStr + '\r\n', segStr, 3000);
    if (!gotC) {
      serialRxLog += '[WARN] No response to C command\n';
      updateSerialTerminal();
      return;
    }
    await sleep(200);

    for (let i = 0; i < seg.bytes.length; i++) {
      let val = seg.bytes[i].toString(16).toUpperCase().padStart(2, '0');
      serialRxLog += val + ' ';
      updateSerialTerminal();
      let gotNext = await sendAndWait(val + '\r\n', ':', 2000);
      if (!gotNext && i < seg.bytes.length - 1) {
        serialRxLog += '[!] ';
        updateSerialTerminal();
      }
      await sleep(50);
    }

    serialRxLog += '\n[OK] segment @' + segStr + ': ' + seg.bytes.length + ' bytes.\n';
    updateSerialTerminal();
    await serialSendBytes([0x1B, 0x0D]);
    let gotExit = await sendAndWait('', PAT_PROMPT, 3000);
    if (!gotExit) gotExit = await sendAndWait('\r\n', PAT_PROMPT, 2000);
    serialRxLog += gotExit ? '[OK] PAT: prompt\n' : '[WARN] No PAT: prompt after segment\n';
    updateSerialTerminal();
    if (!gotExit) return;
  }

  await sleep(200);
  let entryStr = entryAddr.toString(16).toUpperCase().padStart(4, '0');
  serialRxLog += 'TX: G ' + entryStr + '\n';
  updateSerialTerminal();
  if (opts.waitForHalt !== false) {
    let gotG = await sendAndWait('G ' + entryStr + '\r\n', PAT_PROMPT, 8000);
    serialRxLog += gotG ? '=== SUCCESS ===\n' : '--- G TIMEOUT ---\n';
  } else {
    await serialSendRaw('G ' + entryStr + '\r\n');
    serialRxLog += '=== RUNNING (press RESET to stop) ===\n';
  }
  updateSerialTerminal();
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
async function uploadProgram() {
  if (!serialConnected) { sLog('Connect to device first!', 1); return; }
  if (!pLen) { sLog('Assemble a program first!', 1); return; }

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
  let total = 0;
  for (let seg of segments) {
    seg.bytes = [];
    for (let a = seg.start; a < seg.end; a++) seg.bytes.push(mem[0x80 * 16 + a]);
    total += seg.bytes.length;
  }

  if (!total) { sLog('Program is empty!', 1); return; }

  // Run at the program's real ORG (entry = first instruction's ORG), not a hardcoded
  // 0x100 - so the entry the student types (e.g. G 500) matches where the code lands.
  sLog(`Uploading ${total} bytes to device (${segments.length} segment${segments.length > 1 ? 's' : ''})...`, 0);
  await uploadSegmentsAndRun(segments, org,
    'UPLOAD: ' + total + 'B @ ' + org.toString(16).toUpperCase() + 'H'
    + (segments.length > 1 ? ' (' + segments.length + ' seg)' : ''));
}

// === Display probes ===
async function probeDisplay() {
  if (!serialConnected) { sLog('Connect to device first!', 1); return; }
  serialRxLog += '\n=== DISPLAY PROBE ===\n';
  serialRxLog += 'Testing keyboard display addresses...\n';
  updateSerialTerminal();
  serialRxLog += '\n[TEST 1] KYDBUF 0000:047D \u2014 all segments ON\n';
  updateSerialTerminal();
  let mc1 = [
    0x1E, 0xB8, 0x00, 0x00, 0x8E, 0xD8,
    0xC6, 0x06, 0x7D, 0x04, 0xFF, 0xC6, 0x06, 0x7E, 0x04, 0xFF,
    0xC6, 0x06, 0x7F, 0x04, 0xFF, 0xC6, 0x06, 0x80, 0x04, 0xFF,
    0xC6, 0x06, 0x81, 0x04, 0xFF, 0xC6, 0x06, 0x82, 0x04, 0xFF,
    0xC6, 0x06, 0x83, 0x04, 0xFF, 0xC6, 0x06, 0x84, 0x04, 0xFF,
    0x1F, 0xEB, 0xFE
  ];
  await uploadCmdAndRunNoWait(mc1, 'PROBE: KYDBUF 047D');
  serialRxLog += '>>> Check display now! If all 8s appear, KYDBUF=047D is correct.\n';
  serialRxLog += '>>> Press PAT RESET, then click next test.\n';
  updateSerialTerminal();
}

async function probeDisplay2() {
  if (!serialConnected) { sLog('Connect to device first!', 1); return; }
  serialRxLog += '\n[TEST 2] 8279 display controller \u2014 port 20H/21H\n';
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
  if (!serialConnected) { sLog('Connect to device first!', 1); return; }
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
  if (!serialConnected) { sLog('Connect to device first!', 1); return; }
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
