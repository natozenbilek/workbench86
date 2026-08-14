// ============================================================
// workbench86 I/O Ports - Read/write handlers, port logic
// ============================================================

function ioWrite(port, val) {
  port &= 0xFF; val &= 0xFF;
  let prev = ioPorts[port];   // latch the old level first: the edge detectors below need it
  ioPorts[port] = val;
  ioLog.push({dir:'OUT', port, val, ic});
  if(ioLog.length > IO_LOG_MAX) ioLog.shift();

  // Per-port forwarding to a real board is NOT implemented: serialWritePort is
  // an empty placeholder in app/serial/upload.js, so this call does nothing.
  // The supported hardware path is the program upload, not live port mirroring.
  if (serialConnected && HW_PORTS.has(port)) {
    serialWritePort(port, val);
  }

  if (port === PORT_PORT1) handlePort1Write(val, prev);
  else if (port === PORT_PORT2) handlePort2Write(val);
  else if (port === PORT_PIC_CMD) { if (val === 0x20) irqPending = 0; }
  else if (port === PORT_PIC_MASK) irqMask = val;
  else if (port === PORT_TIMER_CLK) timerClockSel = val;
  else if (port === PORT_TIMER) { timerValue = val; timerReload = val; timerCount = 0; }
  else if (port === PORT_IRQEN) timerEnabled = val;
}

function ioRead(port) {
  port &= 0xFF;
  let val = ioPorts[port];

  // Per-port forwarding to a real board is NOT implemented: serialReadPort in
  // app/serial/upload.js is a placeholder that resolves with this same cached
  // byte, so the write-back below is a no-op and no read reaches the wire.
  // The supported hardware path is the program upload, not live port mirroring.
  if (serialConnected && HW_PORTS.has(port)) {
    serialReadPort(port).then(v => { ioPorts[port] = v; });
  }

  if (port === PORT_PORT1) val = readPort1();
  else if (port === PORT_PORT2) val = readPort2();
  else if (port === PORT_IRQACK) { irqPending = 0; val = 0; }
  ioLog.push({dir:'IN', port, val, ic});
  if(ioLog.length > IO_LOG_MAX) ioLog.shift();
  return val & 0xFF;
}

// prev = the port-1 byte as it was BEFORE this write. It must be passed in by
// ioWrite: reading ioPorts[PORT_PORT1] here would already see the new value,
// which is what used to make the WR edge test below unreachable.
function handlePort1Write(val, prev) {
  let pzo = (val >> P1_PZO) & 1;
  if (pzo !== (piezoOn ? 1 : 0)) {
    piezoOn = !!pzo;
    if (piezoOn) startPiezo(piezoFreq||1000); else stopPiezo();
  }
  let wrPrev = (prev >> P1_WR) & 1, wrNow = (val >> P1_WR) & 1;
  if (wrPrev && !wrNow) {
    adcBusy = true;
    adcConvCount = 3;
  }
}

let adcConvCount = 0;

function handlePort2Write(val) {
  let modeReg = ioPorts[PORT_MODE];
  if (modeReg === 0x03) motorDacVal = val;
}

function readPort1() {
  let dir = ioPorts[PORT_P1CTL];
  let out = ioPorts[PORT_PORT1];
  let inp = 0;

  if (adcBusy) {
    adcConvCount--;
    if (adcConvCount <= 0) adcBusy = false;
  } else {
    inp |= (1 << P1_BSY); // BSY high = conversion complete
  }

  if (motorDacVal > 10) {
    diskPhase += motorDacVal / 50;
    if (diskPhase > 10) { diskPhase = 0; diskPulses++; }
    inp |= ((diskPulses & 1) << P1_DSC);
  }

  let utxOn = (out >> P1_UTX) & 1;
  if (!(utxOn && objectNear)) {
    inp |= (1 << P1_URX); // URX high = no echo / no object
  }

  let result = 0;
  for (let i = 0; i < 8; i++) {
    if ((dir >> i) & 1) result |= (out & (1 << i));
    else result |= (inp & (1 << i));
  }
  return result;
}

function readPort2() {
  let modeReg = ioPorts[PORT_MODE];
  if (modeReg === 0x00) {
    let p1 = ioPorts[PORT_PORT1];
    if (!((p1 >> P1_RD) & 1)) {
      if (opticalBlocked) return Math.max(0, Math.min(15, potValue >> 4));
      return potValue & 0xFF;
    }
    return 0;
  }
  return ioPorts[PORT_PORT2];
}
