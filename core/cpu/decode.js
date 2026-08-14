// ============================================================
// workbench86 CPU - Instruction Fetch, Decode, ModR/M, String Ops
// ============================================================

// === INSTRUCTION FETCH & DECODE ===
function fetchByte() { let v = rb(pa(CS, IP)); IP = (IP + 1) & 0xFFFF; return v; }
function fetchWord() { let lo = fetchByte(), hi = fetchByte(); return lo | (hi << 8); }
function signExt8(v) { return (v & 0x80) ? (v | 0xFF00) : v; }
function signExt16(v) { return (v & 0x8000) ? (v | 0xFFFF0000) : v; }

// ModR/M decoding
function decodeModRM(modrm, wide) {
  let mod = (modrm >> 6) & 3;
  let reg = (modrm >> 3) & 7;
  let rm = modrm & 7;
  return { mod, reg, rm, wide };
}

function calcEA(mod, rm, segOverride) {
  let seg = segOverride !== undefined ? segOverride : DS;
  let off = 0;
  if (mod === 0) {
    switch(rm) {
      case 0: off = (BX + SI) & 0xFFFF; break;
      case 1: off = (BX + DI) & 0xFFFF; break;
      case 2: off = (BP + SI) & 0xFFFF; seg = segOverride !== undefined ? segOverride : SS; break;
      case 3: off = (BP + DI) & 0xFFFF; seg = segOverride !== undefined ? segOverride : SS; break;
      case 4: off = SI; break;
      case 5: off = DI; break;
      case 6: off = fetchWord(); break;
      case 7: off = BX; break;
    }
  } else {
    let disp = (mod === 1) ? signExt8(fetchByte()) : fetchWord();
    switch(rm) {
      case 0: off = (BX + SI + disp) & 0xFFFF; break;
      case 1: off = (BX + DI + disp) & 0xFFFF; break;
      case 2: off = (BP + SI + disp) & 0xFFFF; seg = segOverride !== undefined ? segOverride : SS; break;
      case 3: off = (BP + DI + disp) & 0xFFFF; seg = segOverride !== undefined ? segOverride : SS; break;
      case 4: off = (SI + disp) & 0xFFFF; break;
      case 5: off = (DI + disp) & 0xFFFF; break;
      case 6: off = (BP + disp) & 0xFFFF; seg = segOverride !== undefined ? segOverride : SS; break;
      case 7: off = (BX + disp) & 0xFFFF; break;
    }
  }
  return pa(seg, off);
}

function readRM(mrm, segOvr) {
  if (mrm.mod === 3) return mrm.wide ? getReg16(mrm.rm) : getReg8(mrm.rm);
  if (mrm._ea === undefined) mrm._ea = calcEA(mrm.mod, mrm.rm, segOvr);
  return mrm.wide ? rw(mrm._ea) : rb(mrm._ea);
}

function writeRM(mrm, val, segOvr) {
  if (mrm.mod === 3) { mrm.wide ? setReg16(mrm.rm, val) : setReg8(mrm.rm, val); return; }
  if (mrm._ea === undefined) mrm._ea = calcEA(mrm.mod, mrm.rm, segOvr);
  mrm.wide ? ww(mrm._ea, val) : wb(mrm._ea, val);
}

// === STRING OPERATIONS ===
function execStringOp(op, wide, segOvr) {
  let srcSeg = segOvr !== undefined ? segOvr : DS;
  let inc = wide ? 2 : 1;
  let dir = gf(DF) ? -inc : inc;

  switch (op) {
    case 'MOVS': {
      let src = pa(srcSeg, SI), dst = pa(ES, DI);
      if (wide) ww(dst, rw(src)); else wb(dst, rb(src));
      SI = (SI + dir) & 0xFFFF; DI = (DI + dir) & 0xFFFF;
      break;
    }
    case 'STOS': {
      let dst = pa(ES, DI);
      if (wide) ww(dst, AX); else wb(dst, getAL());
      DI = (DI + dir) & 0xFFFF;
      break;
    }
    case 'LODS': {
      let src = pa(srcSeg, SI);
      if (wide) AX = rw(src); else setAL(rb(src));
      SI = (SI + dir) & 0xFFFF;
      break;
    }
    case 'CMPS': {
      let s = pa(srcSeg, SI), d = pa(ES, DI);
      let a = wide ? rw(s) : rb(s);
      let b = wide ? rw(d) : rb(d);
      let res = a - b;
      wide ? setFlagsArith16(res, a, b, true) : setFlagsArith8(res, a, b, true);
      SI = (SI + dir) & 0xFFFF; DI = (DI + dir) & 0xFFFF;
      break;
    }
    case 'SCAS': {
      let d = pa(ES, DI);
      let a = wide ? AX : getAL();
      let b = wide ? rw(d) : rb(d);
      let res = a - b;
      wide ? setFlagsArith16(res, a, b, true) : setFlagsArith8(res, a, b, true);
      DI = (DI + dir) & 0xFFFF;
      break;
    }
  }
}
