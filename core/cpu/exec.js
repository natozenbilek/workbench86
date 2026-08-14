// ============================================================
// workbench86 CPU - Main Execution Engine (opcode dispatch)
// Depends on: core.js, decode.js, alu.js, int28.js
// ============================================================

// === MAIN EXECUTION ===
function execOne() {
  if (halt) return;

  checkInterrupts();
  timerTick();

  let startIP = IP, startCS = CS;
  let segOvr = undefined;
  let prefix = true;
  repPrefix = 0;

  // Stop after 15 prefix bytes, the x86 limit on total instruction length.
  // Without the cap a memory region full of prefix bytes (0F3H fill, a runaway
  // jump into data) spins here forever and freezes the page; with it we fall
  // through and the dispatch below reports an unknown opcode.
  let pfx = 0;
  while (prefix && pfx < 15) {
    let pb = rb(pa(CS, IP));
    if (pb === 0x26) { segOvr = ES; IP = (IP+1) & 0xFFFF; pfx++; }
    else if (pb === 0x2E) { segOvr = CS; IP = (IP+1) & 0xFFFF; pfx++; }
    else if (pb === 0x36) { segOvr = SS; IP = (IP+1) & 0xFFFF; pfx++; }
    else if (pb === 0x3E) { segOvr = DS; IP = (IP+1) & 0xFFFF; pfx++; }
    else if (pb === 0xF3) { repPrefix = 0xF3; IP = (IP+1) & 0xFFFF; pfx++; }
    else if (pb === 0xF2) { repPrefix = 0xF2; IP = (IP+1) & 0xFFFF; pfx++; }
    else prefix = false;
  }

  let op = fetchByte();
  let wide = op & 1;

  // === String OPs with REP support ===
  let stringOps = {
    0xA4: 'MOVS', 0xA5: 'MOVS',
    0xAA: 'STOS', 0xAB: 'STOS',
    0xAC: 'LODS', 0xAD: 'LODS',
    0xA6: 'CMPS', 0xA7: 'CMPS',
    0xAE: 'SCAS', 0xAF: 'SCAS',
  };

  if (stringOps[op] !== undefined) {
    let sop = stringOps[op];
    wide = op & 1;
    let suffix = wide ? 'W' : 'B';

    if (repPrefix) {
      let repName = repPrefix === 0xF3 ? 'REP' : 'REPNE';
      let isConditional = (sop === 'CMPS' || sop === 'SCAS');
      if (repPrefix === 0xF3 && isConditional) repName = 'REPE';

      let count = 0;
      while (CX !== 0) {
        execStringOp(sop, wide, segOvr);
        CX = (CX - 1) & 0xFFFF;
        count++;
        if (isConditional) {
          if (repPrefix === 0xF3 && gf(ZF) === 0) break;
          if (repPrefix === 0xF2 && gf(ZF) === 1) break;
        }
        if (count > 65536) break;
      }
      curInstr = `${repName} ${sop}${suffix}`;
      curDesc = `${repName} ${sop}${suffix}: ${count} iterations, CX=${CX}`;
    } else {
      execStringOp(sop, wide, segOvr);
      curInstr = `${sop}${suffix}`;
      curDesc = `${sop}${suffix}: SI=${hex16(SI)} DI=${hex16(DI)}`;
      if (sop === 'LODS') curDesc = `LODS \u2192 ${wide?hex16(AX):hex8(getAL())}`;
    }
  }
  // ALU ops: ADD, OR, ADC, SBB, AND, SUB, XOR, CMP
  else if ((op & 0xC0) === 0 && (op & 0x04) === 0 && op < 0x40) {
    let grp = (op >> 3) & 7;
    let d = (op >> 1) & 1;
    wide = op & 1;
    let modrm = decodeModRM(fetchByte(), wide);
    let dst, src;
    if (d) { dst = wide ? getReg16(modrm.reg) : getReg8(modrm.reg); src = readRM(modrm, segOvr); }
    else { dst = readRM(modrm, segOvr); src = wide ? getReg16(modrm.reg) : getReg8(modrm.reg); }
    let res = doALU(grp, dst, src, wide);
    if (grp !== 7) {
      if (d) { wide ? setReg16(modrm.reg, res) : setReg8(modrm.reg, res); }
      else { writeRM(modrm, res, segOvr); }
    }
    let names = ['ADD','OR','ADC','SBB','AND','SUB','XOR','CMP'];
    curInstr = `${names[grp]} ${wide?'word':'byte'}`;
    curDesc = `${names[grp]}: ${hex16(dst)} op ${hex16(src)} = ${hex16(res & (wide?0xFFFF:0xFF))}`;
  }
  // ALU imm to AL/AX
  else if ((op & 0xC6) === 0x04) {
    let grp = (op >> 3) & 7;
    wide = (op & 1);
    let imm = wide ? fetchWord() : fetchByte();
    let dst = wide ? AX : getAL();
    let res = doALU(grp, dst, imm, wide);
    if (grp !== 7) { wide ? (AX = res & 0xFFFF) : setAL(res); }
    let names = ['ADD','OR','ADC','SBB','AND','SUB','XOR','CMP'];
    curInstr = `${names[grp]} ${wide?'AX':'AL'},${wide?hex16(imm):hex8(imm)}`;
    curDesc = `${names[grp]}: ${hex16(dst)} op ${hex16(imm)} = ${hex16(res & (wide?0xFFFF:0xFF))}`;
  }
  // ALU immediate group (80-83)
  else if (op >= 0x80 && op <= 0x83) {
    wide = op & 1;
    let modrm = decodeModRM(fetchByte(), wide);
    let dst = readRM(modrm, segOvr);
    let imm;
    if (op === 0x81) imm = fetchWord();
    else if (op === 0x83) imm = signExt8(fetchByte()) & 0xFFFF;
    else imm = fetchByte();
    let grp = modrm.reg;
    let res = doALU(grp, dst, imm, wide);
    if (grp !== 7) writeRM(modrm, res, segOvr);
    let names = ['ADD','OR','ADC','SBB','AND','SUB','XOR','CMP'];
    curInstr = `${names[grp]} rm,${hex16(imm)}`;
    curDesc = `${names[grp]}: ${hex16(dst)} op ${hex16(imm)} = ${hex16(res & (wide?0xFFFF:0xFF))}`;
  }
  // INC reg16 (40-47)
  else if (op >= 0x40 && op <= 0x47) {
    let r = op & 7, v = getReg16(r), res = (v + 1) & 0xFFFF;
    let cf = gf(CF); setFlagsArith16(v + 1, v, 1, false); sf(CF, cf);
    setReg16(r, res);
    curInstr = `INC ${rn16(r)}`; curDesc = `INC: ${hex16(v)}\u2192${hex16(res)}`;
  }
  // DEC reg16 (48-4F)
  else if (op >= 0x48 && op <= 0x4F) {
    let r = op & 7, v = getReg16(r), res = (v - 1) & 0xFFFF;
    let cf = gf(CF); setFlagsArith16(v - 1, v, 1, true); sf(CF, cf);
    setReg16(r, res);
    curInstr = `DEC ${rn16(r)}`; curDesc = `DEC: ${hex16(v)}\u2192${hex16(res)}`;
  }
  // PUSH reg16 (50-57)
  else if (op >= 0x50 && op <= 0x57) {
    let r = op & 7, v = getReg16(r);
    pushW(v);
    curInstr = `PUSH ${rn16(r)}`; curDesc = `PUSH ${hex16(v)}`;
  }
  // POP reg16 (58-5F)
  else if (op >= 0x58 && op <= 0x5F) {
    let r = op & 7, v = popW();
    setReg16(r, v);
    curInstr = `POP ${rn16(r)}`; curDesc = `POP \u2192 ${hex16(v)}`;
  }
  // PUSH sreg (06=ES, 0E=CS, 16=SS, 1E=DS)
  else if (op === 0x06 || op === 0x0E || op === 0x16 || op === 0x1E) {
    let sr = (op >> 3) & 3, v = getSeg(sr);
    pushW(v);
    curInstr = `PUSH ${['ES','CS','SS','DS'][sr]}`; curDesc = `PUSH ${hex16(v)}`;
  }
  // POP sreg (07=ES, 17=SS, 1F=DS). There is no POP CS on the 8086/286, so
  // opcode 0F is deliberately left to the unknown-opcode handler.
  else if (op === 0x07 || op === 0x17 || op === 0x1F) {
    let sr = (op >> 3) & 3, v = popW();
    setSeg(sr, v);
    curInstr = `POP ${['ES','CS','SS','DS'][sr]}`; curDesc = `POP \u2192 ${hex16(v)}`;
  }
  // PUSHA (60)
  else if (op === 0x60) {
    let sp0 = SP; pushW(AX); pushW(CX); pushW(DX); pushW(BX); pushW(sp0); pushW(BP); pushW(SI); pushW(DI);
    curInstr = 'PUSHA'; curDesc = 'Push all GPRs';
  }
  // POPA (61)
  else if (op === 0x61) {
    DI = popW(); SI = popW(); BP = popW(); popW(); BX = popW(); DX = popW(); CX = popW(); AX = popW();
    curInstr = 'POPA'; curDesc = 'Pop all GPRs';
  }
  // Jcc short (70-7F)
  else if (op >= 0x70 && op <= 0x7F) {
    let disp = signExt8(fetchByte());
    let cc = op & 0xF, taken = testCC(cc);
    if (taken) IP = (IP + disp) & 0xFFFF;
    let ccn = ['JO','JNO','JB','JNB','JZ','JNZ','JBE','JA','JS','JNS','JP','JNP','JL','JGE','JLE','JG'][cc];
    curInstr = ccn; curDesc = `${ccn}: ${taken ? 'TAKEN \u2192 '+hex16(IP) : 'not taken'}`;
  }
  // MOV reg,rm / rm,reg (88-8B)
  else if (op >= 0x88 && op <= 0x8B) {
    let d = (op >> 1) & 1; wide = op & 1;
    let modrm = decodeModRM(fetchByte(), wide);
    if (d) {
      let v = readRM(modrm, segOvr);
      wide ? setReg16(modrm.reg, v) : setReg8(modrm.reg, v);
      curInstr = `MOV ${wide?rn16(modrm.reg):rn8(modrm.reg)},rm`; curDesc = `MOV: ${hex16(v)}`;
    } else {
      let v = wide ? getReg16(modrm.reg) : getReg8(modrm.reg);
      writeRM(modrm, v, segOvr);
      curInstr = `MOV rm,${wide?rn16(modrm.reg):rn8(modrm.reg)}`; curDesc = `MOV: ${hex16(v)}`;
    }
  }
  // MOV seg,rm (8E) / MOV rm,seg (8C)
  else if (op === 0x8E || op === 0x8C) {
    let modrm = decodeModRM(fetchByte(), true);
    if (op === 0x8E) {
      let v = readRM(modrm, segOvr);
      setSeg(modrm.reg, v);
      curInstr = `MOV ${['ES','CS','SS','DS'][modrm.reg]},rm`; curDesc = `MOV seg: ${hex16(v)}`;
    } else {
      let v = getSeg(modrm.reg);
      writeRM(modrm, v, segOvr);
      curInstr = `MOV rm,${['ES','CS','SS','DS'][modrm.reg]}`; curDesc = `MOV seg: ${hex16(v)}`;
    }
  }
  // LEA (8D) - load effective address (offset only, no segment)
  else if (op === 0x8D) {
    let modrm = decodeModRM(fetchByte(), true);
    let ea = calcEA(modrm.mod, modrm.rm, 0); // seg=0 so pa(0,off)=off
    setReg16(modrm.reg, ea & 0xFFFF);
    curInstr = `LEA ${rn16(modrm.reg)}`; curDesc = `LEA: offset=${hex16(ea & 0xFFFF)}`;
  }
  // POP rm16 (8F /0) - the mirror of PUSH rm16 (FF /6)
  else if (op === 0x8F) {
    let modrm = decodeModRM(fetchByte(), true);
    if (modrm.reg === 0) {
      // Resolve the effective address first: calcEA consumes the displacement
      // bytes that follow the ModR/M, so it has to run before anything else
      // touches the operand.
      if (modrm.mod !== 3) modrm._ea = calcEA(modrm.mod, modrm.rm, segOvr);
      let v = popW();
      writeRM(modrm, v, segOvr);
      curInstr = 'POP rm16'; curDesc = `POP \u2192 ${hex16(v)}`;
    } else {
      curInstr = `8F grp ${modrm.reg}`; curDesc = 'Unimplemented';
    }
  }
  // NOP (90)
  else if (op === 0x90) {
    curInstr = 'NOP'; curDesc = 'No operation';
  }
  // XCHG AX,reg (91-97)
  else if (op >= 0x91 && op <= 0x97) {
    let r = op & 7, t = AX; AX = getReg16(r); setReg16(r, t);
    curInstr = `XCHG AX,${rn16(r)}`; curDesc = `XCHG: AX\u2194${rn16(r)}`;
  }
  // CBW (98)
  else if (op === 0x98) {
    AX = signExt8(getAL()) & 0xFFFF;
    curInstr = 'CBW'; curDesc = `CBW: AL=${hex8(getAL())} \u2192 AX=${hex16(AX)}`;
  }
  // CWD (99)
  else if (op === 0x99) {
    DX = (AX & 0x8000) ? 0xFFFF : 0x0000;
    curInstr = 'CWD'; curDesc = `CWD: AX=${hex16(AX)} \u2192 DX:AX=${hex16(DX)}:${hex16(AX)}`;
  }
  // PUSHF (9C)
  else if (op === 0x9C) {
    pushW(FLAGS);
    curInstr = 'PUSHF'; curDesc = `PUSHF: ${hex16(FLAGS)}`;
  }
  // POPF (9D)
  else if (op === 0x9D) {
    FLAGS = popW() | 0x0002;
    curInstr = 'POPF'; curDesc = `POPF: ${hex16(FLAGS)}`;
  }
  // MOV AL/AX, moffs (A0,A1)
  else if (op === 0xA0 || op === 0xA1) {
    wide = op & 1;
    let off = fetchWord(), seg = segOvr !== undefined ? segOvr : DS;
    let addr = pa(seg, off);
    let v = wide ? rw(addr) : rb(addr);
    wide ? (AX = v) : setAL(v);
    curInstr = `MOV ${wide?'AX':'AL'},[${hex16(off)}]`; curDesc = `MOV: mem[${hex16(off)}]=${hex16(v)}`;
  }
  // MOV moffs, AL/AX (A2,A3)
  else if (op === 0xA2 || op === 0xA3) {
    wide = op & 1;
    let off = fetchWord(), seg = segOvr !== undefined ? segOvr : DS;
    let addr = pa(seg, off);
    let v = wide ? AX : getAL();
    wide ? ww(addr, v) : wb(addr, v);
    curInstr = `MOV [${hex16(off)}],${wide?'AX':'AL'}`; curDesc = `MOV: ${hex16(v)}\u2192mem[${hex16(off)}]`;
  }
  // TEST AL/AX, imm (A8,A9)
  else if (op === 0xA8 || op === 0xA9) {
    wide = op & 1;
    let imm = wide ? fetchWord() : fetchByte();
    let v = wide ? AX : getAL();
    let r = v & imm;
    wide ? setFlagsLogic16(r) : setFlagsLogic8(r);
    curInstr = `TEST ${wide?'AX':'AL'},${hex16(imm)}`; curDesc = `TEST: ${hex16(v)} & ${hex16(imm)} = ${hex16(r)}`;
  }
  // MOV reg8, imm8 (B0-B7)
  else if (op >= 0xB0 && op <= 0xB7) {
    let r = op & 7, v = fetchByte();
    setReg8(r, v);
    curInstr = `MOV ${rn8(r)},${hex8(v)}`; curDesc = `MOV: ${hex8(v)}\u2192${rn8(r)}`;
  }
  // MOV reg16, imm16 (B8-BF)
  else if (op >= 0xB8 && op <= 0xBF) {
    let r = op & 7, v = fetchWord();
    setReg16(r, v);
    curInstr = `MOV ${rn16(r)},${hex16(v)}`; curDesc = `MOV: ${hex16(v)}\u2192${rn16(r)}`;
  }
  // RET imm16 (C2) - pop IP, then discard imm16 bytes of arguments
  else if (op === 0xC2) {
    let imm = fetchWord();
    IP = popW();
    SP = (SP + imm) & 0xFFFF;
    curInstr = `RET ${hex16(imm)}`; curDesc = `RET \u2192 ${hex16(IP)}, SP+${hex16(imm)}=${hex16(SP)}`;
  }
  // RET near (C3)
  else if (op === 0xC3) {
    IP = popW();
    curInstr = 'RET'; curDesc = `RET \u2192 ${hex16(IP)}`;
  }
  // MOV rm, imm (C6/C7)
  else if (op === 0xC6 || op === 0xC7) {
    wide = op & 1;
    let modrm = decodeModRM(fetchByte(), wide);
    if (modrm.mod !== 3) modrm._ea = calcEA(modrm.mod, modrm.rm, segOvr);
    let imm = wide ? fetchWord() : fetchByte();
    writeRM(modrm, imm, segOvr);
    curInstr = `MOV rm,${hex16(imm)}`; curDesc = `MOV: imm ${hex16(imm)} \u2192 memory`;
  }
  // INT imm8 (CD)
  else if (op === 0xCD) {
    let intNum = fetchByte();
    if (intNum === 0x28 || intNum === PATCALLS.USER) {
      handleInt28();
    } else {
      let vecAddr = intNum * 4;
      let newIP = rw(vecAddr);
      let newCS = rw(vecAddr + 2);
      if (newIP || newCS) {
        pushW(FLAGS); pushW(CS); pushW(IP);
        sf(IF_, 0); sf(TF, 0);
        CS = newCS; IP = newIP;
        curDesc = `INT ${hex8(intNum)} \u2192 ${hex16(newCS)}:${hex16(newIP)}`;
      } else {
        curDesc = `INT ${hex8(intNum)} (no handler)`;
      }
    }
    curInstr = `INT ${hex8(intNum)}`;
  }
  // IRET (CF)
  else if (op === 0xCF) {
    IP = popW(); CS = popW(); FLAGS = popW() | 0x0002;
    curInstr = 'IRET'; curDesc = `IRET \u2192 ${hex16(CS)}:${hex16(IP)}`;
  }
  // Shift/rotate group (D0-D3)
  else if (op >= 0xD0 && op <= 0xD3) {
    wide = op & 1;
    let modrm = decodeModRM(fetchByte(), wide);
    let cnt = (op >= 0xD2) ? (getCL() & 0x1F) : 1;
    let val = readRM(modrm, segOvr);
    let mask = wide ? 0xFFFF : 0xFF;
    let bits = wide ? 16 : 8;
    let res = val;
    for (let i = 0; i < cnt; i++) {
      let c;
      switch(modrm.reg) {
        case 0: c = (res >> (bits-1)) & 1; res = ((res << 1) | c) & mask; sf(CF, c); break;
        case 1: c = res & 1; res = ((res >> 1) | (c << (bits-1))) & mask; sf(CF, c); break;
        case 2: c = (res >> (bits-1)) & 1; res = ((res << 1) | gf(CF)) & mask; sf(CF, c); break;
        case 3: c = res & 1; res = ((res >> 1) | (gf(CF) << (bits-1))) & mask; sf(CF, c); break;
        case 4: case 6: c = (res >> (bits-1)) & 1; res = (res << 1) & mask; sf(CF, c);
          sf(ZF, res===0); sf(SF, (res>>(bits-1))&1); sf(PF, parity8(res)); break;
        case 5: c = res & 1; res = (res >> 1) & mask; sf(CF, c);
          sf(ZF, res===0); sf(SF, (res>>(bits-1))&1); sf(PF, parity8(res)); break;
        case 7: c = res & 1; let sgn = res & (1 << (bits-1)); res = ((res >> 1) | sgn) & mask; sf(CF, c);
          sf(ZF, res===0); sf(SF, (res>>(bits-1))&1); sf(PF, parity8(res)); break;
      }
    }
    // OF is architecturally defined only for a single-bit shift/rotate; the 8086
    // leaves it undefined for longer counts, so it is left untouched there.
    if (cnt === 1) {
      let msb = (res >> (bits-1)) & 1, nxt = (res >> (bits-2)) & 1;
      switch(modrm.reg) {
        case 0: case 2: case 3: case 4: case 6: sf(OF, msb ^ gf(CF)); break; // ROL/RCL/RCR/SHL/SAL
        case 1: sf(OF, msb ^ nxt); break;                                    // ROR: top two bits of the result
        case 5: sf(OF, (val >> (bits-1)) & 1); break;                        // SHR: MSB of the original operand
        case 7: sf(OF, 0); break;                                            // SAR never overflows
      }
    }
    writeRM(modrm, res, segOvr);
    let sn = ['ROL','ROR','RCL','RCR','SHL','SHR','?','SAR'][modrm.reg];
    curInstr = `${sn} ${wide?'word':'byte'},${cnt}`; curDesc = `${sn}: ${hex16(val)}\u2192${hex16(res)}`;
  }
  // LOOP/LOOPZ/LOOPNZ/JCXZ (E0-E3)
  else if (op >= 0xE0 && op <= 0xE3) {
    let disp = signExt8(fetchByte());
    if (op === 0xE2) {
      CX = (CX - 1) & 0xFFFF;
      if (CX !== 0) IP = (IP + disp) & 0xFFFF;
      curInstr = 'LOOP'; curDesc = `LOOP: CX=${CX}${CX?', taken':''}`;
    } else if (op === 0xE3) {
      if (CX === 0) IP = (IP + disp) & 0xFFFF;
      curInstr = 'JCXZ'; curDesc = `JCXZ: CX=${CX}`;
    } else {
      CX = (CX - 1) & 0xFFFF;
      let zc = gf(ZF);
      let tk = (op === 0xE1) ? (CX !== 0 && zc) : (CX !== 0 && !zc);
      if (tk) IP = (IP + disp) & 0xFFFF;
      curInstr = op === 0xE1 ? 'LOOPZ' : 'LOOPNZ'; curDesc = `${curInstr}: CX=${CX}`;
    }
  }
  // IN AL/AX, imm8 (E4/E5)
  else if (op === 0xE4 || op === 0xE5) {
    wide = op & 1;
    let port = fetchByte();
    let v = ioRead(port);
    wide ? (AX = v) : setAL(v);
    curInstr = `IN ${wide?'AX':'AL'},${hex8(port)}`; curDesc = `IN: port ${hex8(port)}=${hex8(v)}`;
  }
  // OUT imm8, AL/AX (E6/E7)
  else if (op === 0xE6 || op === 0xE7) {
    wide = op & 1;
    let port = fetchByte();
    let v = wide ? AX : getAL();
    ioWrite(port, v);
    curInstr = `OUT ${hex8(port)},${wide?'AX':'AL'}`; curDesc = `OUT: ${hex8(v)}\u2192port ${hex8(port)}`;
  }
  // CALL rel16 (E8)
  else if (op === 0xE8) {
    let disp = fetchWord();
    if (disp & 0x8000) disp -= 0x10000;
    pushW(IP);
    IP = (IP + disp) & 0xFFFF;
    curInstr = 'CALL'; curDesc = `CALL \u2192 ${hex16(IP)}`;
  }
  // JMP rel16 (E9)
  else if (op === 0xE9) {
    let disp = fetchWord();
    if (disp & 0x8000) disp -= 0x10000;
    IP = (IP + disp) & 0xFFFF;
    curInstr = 'JMP near'; curDesc = `JMP \u2192 ${hex16(IP)}`;
  }
  // JMP rel8 (EB)
  else if (op === 0xEB) {
    let disp = signExt8(fetchByte());
    IP = (IP + disp) & 0xFFFF;
    curInstr = 'JMP short'; curDesc = `JMP \u2192 ${hex16(IP)}`;
  }
  // IN AL/AX, DX (EC/ED)
  else if (op === 0xEC || op === 0xED) {
    wide = op & 1;
    let v = ioRead(DX & 0xFF);
    wide ? (AX = v) : setAL(v);
    curInstr = `IN ${wide?'AX':'AL'},DX`; curDesc = `IN: port ${hex16(DX)}=${hex8(v)}`;
  }
  // OUT DX, AL/AX (EE/EF)
  else if (op === 0xEE || op === 0xEF) {
    wide = op & 1;
    let v = wide ? AX : getAL();
    ioWrite(DX & 0xFF, v);
    curInstr = `OUT DX,${wide?'AX':'AL'}`; curDesc = `OUT: ${hex8(v)}\u2192port ${hex16(DX)}`;
  }
  // HLT (F4)
  else if (op === 0xF4) {
    if (gf(IF_) && (timerEnabled & 1)) {
      for (let t = 0; t < 5000 && !irqPending; t++) { timerCount++; if(timerCount>=TIMER_CYCLES_PER_TICK){timerCount=0;if(timerValue>0){timerValue--;if(timerValue===0)irqPending|=0x04;}} }
      if (irqPending) { curInstr = 'HLT'; curDesc = 'HLT \u2192 woke by interrupt'; cy++; ic++; return; }
    }
    halt = true; curInstr = 'HLT'; curDesc = 'HALT'; setSt('HALTED');
  }
  // CLI (FA)
  else if (op === 0xFA) { sf(IF_, 0); curInstr = 'CLI'; curDesc = 'Interrupts disabled'; }
  // STI (FB)
  else if (op === 0xFB) { sf(IF_, 1); curInstr = 'STI'; curDesc = 'Interrupts enabled'; }
  // CLC/STC/CMC/CLD/STD (F8-FD)
  else if (op === 0xF8) { sf(CF, 0); curInstr = 'CLC'; curDesc = 'CF=0'; }
  else if (op === 0xF9) { sf(CF, 1); curInstr = 'STC'; curDesc = 'CF=1'; }
  else if (op === 0xF5) { sf(CF, gf(CF)^1); curInstr = 'CMC'; curDesc = 'CF complemented'; }
  else if (op === 0xFC) { sf(DF, 0); curInstr = 'CLD'; curDesc = 'DF=0'; }
  else if (op === 0xFD) { sf(DF, 1); curInstr = 'STD'; curDesc = 'DF=1'; }
  // XLAT (D7)
  else if (op === 0xD7) {
    // Keep the index: AL is the table offset on entry and the fetched byte on
    // exit, so reading it back after setAL would report the result twice.
    let idx = getAL();
    let addr = pa(segOvr !== undefined ? segOvr : DS, (BX + idx) & 0xFFFF);
    let v = rb(addr); setAL(v);
    curInstr = 'XLAT'; curDesc = `XLAT: AL=[BX+${hex8(idx)}]=${hex8(v)}`;
  }
  // LAHF (9F)
  else if (op === 0x9F) {
    setAH(FLAGS & 0xFF);
    curInstr = 'LAHF'; curDesc = `LAHF: AH=${hex8(FLAGS & 0xFF)}`;
  }
  // SAHF (9E)
  else if (op === 0x9E) {
    FLAGS = (FLAGS & 0xFF00) | (getAH() & 0xD5) | 0x02;
    curInstr = 'SAHF'; curDesc = `SAHF: FLAGS=${hex16(FLAGS)}`;
  }
  // DAA (27)
  else if (op === 0x27) {
    let al = getAL(), oldAL = al, oldCF = gf(CF);
    if ((al & 0x0F) > 9 || gf(AF)) { al += 6; sf(AF, 1); } else { sf(AF, 0); }
    if (al > 0x9F || oldCF) { al += 0x60; sf(CF, 1); } else { sf(CF, 0); }
    al &= 0xFF; setAL(al);
    sf(ZF, al === 0); sf(SF, (al >> 7) & 1); sf(PF, parity8(al));
    curInstr = 'DAA'; curDesc = `DAA: AL ${hex8(oldAL)}\u2192${hex8(al)}`;
  }
  // DAS (2F)
  else if (op === 0x2F) {
    let al = getAL(), oldAL = al, oldCF = gf(CF);
    if ((al & 0x0F) > 9 || gf(AF)) { al -= 6; sf(AF, 1); } else { sf(AF, 0); }
    if (oldAL > 0x99 || oldCF) { al -= 0x60; sf(CF, 1); } else { sf(CF, 0); }
    al &= 0xFF; setAL(al);
    sf(ZF, al === 0); sf(SF, (al >> 7) & 1); sf(PF, parity8(al));
    curInstr = 'DAS'; curDesc = `DAS: AL ${hex8(oldAL)}\u2192${hex8(al)}`;
  }
  // AAA (37)
  else if (op === 0x37) {
    if ((getAL() & 0x0F) > 9 || gf(AF)) {
      setAL((getAL() + 6) & 0x0F); setAH(getAH() + 1); sf(AF, 1); sf(CF, 1);
    } else { setAL(getAL() & 0x0F); sf(AF, 0); sf(CF, 0); }
    curInstr = 'AAA'; curDesc = `AAA: AX=${hex16(AX)}`;
  }
  // AAS (3F)
  else if (op === 0x3F) {
    if ((getAL() & 0x0F) > 9 || gf(AF)) {
      setAL((getAL() - 6) & 0x0F); setAH(getAH() - 1); sf(AF, 1); sf(CF, 1);
    } else { setAL(getAL() & 0x0F); sf(AF, 0); sf(CF, 0); }
    curInstr = 'AAS'; curDesc = `AAS: AX=${hex16(AX)}`;
  }
  // AAM (D4 0A)
  else if (op === 0xD4) {
    let imm = fetchByte(); if (imm === 0) { halt = true; curInstr = 'AAM'; curDesc = 'AAM: divide by 0'; }
    else { setAH(Math.floor(getAL() / imm)); setAL(getAL() % imm); sf(ZF, getAL()===0); sf(SF, (getAL()>>7)&1); sf(PF, parity8(getAL())); curInstr = 'AAM'; curDesc = `AAM: AX=${hex16(AX)}`; }
  }
  // AAD (D5 0A)
  else if (op === 0xD5) {
    let imm = fetchByte();
    let res = (getAH() * imm + getAL()) & 0xFF; setAL(res); setAH(0);
    sf(ZF, res===0); sf(SF, (res>>7)&1); sf(PF, parity8(res));
    curInstr = 'AAD'; curDesc = `AAD: AX=${hex16(AX)}`;
  }
  // NOT/NEG/MUL/DIV/TEST (F6/F7 group)
  else if (op === 0xF6 || op === 0xF7) {
    wide = op & 1;
    let modrm = decodeModRM(fetchByte(), wide);
    let val = readRM(modrm, segOvr);
    let mask = wide ? 0xFFFF : 0xFF;
    if (modrm.reg === 2) {
      let res = (~val) & mask;
      writeRM(modrm, res, segOvr);
      curInstr = 'NOT'; curDesc = `NOT: ${hex16(val)}\u2192${hex16(res)}`;
    } else if (modrm.reg === 3) {
      let res = (-val) & mask;
      wide ? setFlagsArith16(-val, 0, val, true) : setFlagsArith8(-val, 0, val, true);
      sf(CF, val !== 0 ? 1 : 0);
      writeRM(modrm, res, segOvr);
      curInstr = 'NEG'; curDesc = `NEG: ${hex16(val)}\u2192${hex16(res)}`;
    } else if (modrm.reg === 4) {
      if (wide) {
        let res = AX * val;
        AX = res & 0xFFFF; DX = (res >> 16) & 0xFFFF;
        sf(CF, DX !== 0 ? 1 : 0); sf(OF, DX !== 0 ? 1 : 0);
      } else {
        let res = getAL() * val;
        AX = res & 0xFFFF;
        sf(CF, getAH() !== 0 ? 1 : 0); sf(OF, getAH() !== 0 ? 1 : 0);
      }
      curInstr = 'MUL'; curDesc = `MUL: result=${wide?hex16(DX)+':'+hex16(AX):hex16(AX)}`;
    } else if (modrm.reg === 5) {
      if (wide) {
        let a = (AX & 0x8000) ? AX - 0x10000 : AX;
        let b = (val & 0x8000) ? val - 0x10000 : val;
        let res = a * b;
        AX = res & 0xFFFF; DX = (res >> 16) & 0xFFFF;
        let signExt = (AX & 0x8000) ? 0xFFFF : 0;
        sf(CF, DX !== signExt ? 1 : 0); sf(OF, DX !== signExt ? 1 : 0);
      } else {
        let a = (getAL() & 0x80) ? getAL() - 0x100 : getAL();
        let b = (val & 0x80) ? val - 0x100 : val;
        let res = a * b;
        AX = res & 0xFFFF;
        let signExt = (getAL() & 0x80) ? 0xFF : 0;
        sf(CF, getAH() !== signExt ? 1 : 0); sf(OF, getAH() !== signExt ? 1 : 0);
      }
      curInstr = 'IMUL'; curDesc = `IMUL: result=${wide?hex16(DX)+':'+hex16(AX):hex16(AX)}`;
    } else if (modrm.reg === 6) {
      if (val === 0) { halt = true; curInstr = 'DIV'; curDesc = 'Division by zero!'; setSt('ERROR'); return; }
      // A quotient too wide for AX (or AL) raises the same divide error as a
      // zero divisor on real hardware; truncating it would silently return a
      // wrong answer.
      if (wide) {
        let dividend = (DX & 0xFFFF) * 0x10000 + (AX & 0xFFFF);
        let quot = Math.floor(dividend / val);
        if (quot > 0xFFFF) { halt = true; curInstr = 'DIV'; curDesc = 'DIV: quotient overflow (divide error)'; setSt('ERROR'); return; }
        AX = quot & 0xFFFF;
        DX = (dividend % val) & 0xFFFF;
      } else {
        let dividend = AX;
        let quot = Math.floor(dividend / val);
        if (quot > 0xFF) { halt = true; curInstr = 'DIV'; curDesc = 'DIV: quotient overflow (divide error)'; setSt('ERROR'); return; }
        setAL(quot & 0xFF);
        setAH(dividend % val);
      }
      curInstr = 'DIV'; curDesc = `DIV: quotient=${wide?hex16(AX):hex8(getAL())}, rem=${wide?hex16(DX):hex8(getAH())}`;
    } else if (modrm.reg === 7) {
      if (val === 0) { halt = true; curInstr = 'IDIV'; curDesc = 'Division by zero!'; setSt('ERROR'); return; }
      // Signed quotient must fit in AX (-32768..32767) or AL (-128..127),
      // otherwise the 8086 takes the divide-error trap.
      if (wide) {
        let dividend = ((DX & 0xFFFF) * 0x10000 + (AX & 0xFFFF));
        if (DX & 0x8000) dividend -= 0x100000000;
        let divisor = (val & 0x8000) ? val - 0x10000 : val;
        let quot = Math.trunc(dividend / divisor);
        if (quot > 32767 || quot < -32768) { halt = true; curInstr = 'IDIV'; curDesc = 'IDIV: quotient overflow (divide error)'; setSt('ERROR'); return; }
        let rem = dividend - quot * divisor;
        AX = quot & 0xFFFF; DX = rem & 0xFFFF;
      } else {
        let dividend = AX;
        if (dividend & 0x8000) dividend -= 0x10000;
        let divisor = (val & 0x80) ? val - 0x100 : val;
        let quot = Math.trunc(dividend / divisor);
        if (quot > 127 || quot < -128) { halt = true; curInstr = 'IDIV'; curDesc = 'IDIV: quotient overflow (divide error)'; setSt('ERROR'); return; }
        let rem = dividend - quot * divisor;
        setAL(quot & 0xFF); setAH(rem & 0xFF);
      }
      curInstr = 'IDIV'; curDesc = `IDIV: quotient=${wide?hex16(AX):hex8(getAL())}, rem=${wide?hex16(DX):hex8(getAH())}`;
    } else if (modrm.reg === 0) {
      let imm = wide ? fetchWord() : fetchByte();
      let r = val & imm;
      wide ? setFlagsLogic16(r) : setFlagsLogic8(r);
      curInstr = `TEST rm,${hex16(imm)}`; curDesc = `TEST: ${hex16(val)}&${hex16(imm)}=${hex16(r)}`;
    } else {
      curInstr = `F6/F7 grp ${modrm.reg}`; curDesc = 'Unimplemented';
    }
  }
  // INC/DEC rm (FE/FF)
  else if (op === 0xFE || op === 0xFF) {
    wide = op & 1;
    let modrm = decodeModRM(fetchByte(), wide);
    if (modrm.reg === 0) {
      let v = readRM(modrm, segOvr), res = (v + 1) & (wide ? 0xFFFF : 0xFF);
      let cf = gf(CF);
      wide ? setFlagsArith16(v+1, v, 1, false) : setFlagsArith8(v+1, v, 1, false);
      sf(CF, cf);
      writeRM(modrm, res, segOvr);
      curInstr = `INC ${wide?'word':'byte'}`; curDesc = `INC: ${hex16(v)}\u2192${hex16(res)}`;
    } else if (modrm.reg === 1) {
      let v = readRM(modrm, segOvr), res = (v - 1) & (wide ? 0xFFFF : 0xFF);
      let cf = gf(CF);
      wide ? setFlagsArith16(v-1, v, 1, true) : setFlagsArith8(v-1, v, 1, true);
      sf(CF, cf);
      writeRM(modrm, res, segOvr);
      curInstr = `DEC ${wide?'word':'byte'}`; curDesc = `DEC: ${hex16(v)}\u2192${hex16(res)}`;
    } else if (modrm.reg === 2 && wide) {
      let target = readRM(modrm, segOvr);
      pushW(IP);
      IP = target;
      curInstr = 'CALL rm16'; curDesc = `CALL \u2192 ${hex16(IP)}`;
    } else if (modrm.reg === 4 && wide) {
      let target = readRM(modrm, segOvr);
      IP = target;
      curInstr = 'JMP rm16'; curDesc = `JMP \u2192 ${hex16(IP)}`;
    } else if (modrm.reg === 6 && wide) {
      let v = readRM(modrm, segOvr);
      pushW(v);
      curInstr = 'PUSH rm16'; curDesc = `PUSH ${hex16(v)}`;
    } else {
      curInstr = `FE/FF grp ${modrm.reg}`; curDesc = 'Unimplemented';
    }
  }
  // TEST rm, reg (84/85)
  else if (op === 0x84 || op === 0x85) {
    wide = op & 1;
    let modrm = decodeModRM(fetchByte(), wide);
    let a = readRM(modrm, segOvr);
    let b = wide ? getReg16(modrm.reg) : getReg8(modrm.reg);
    let r = a & b;
    wide ? setFlagsLogic16(r) : setFlagsLogic8(r);
    curInstr = `TEST ${wide ? 'word' : 'byte'}`;
    curDesc = `TEST: ${hex16(a)} & ${hex16(b)} = ${hex16(r & (wide ? 0xFFFF : 0xFF))}`;
  }
  // XCHG (86/87)
  else if (op === 0x86 || op === 0x87) {
    wide = op & 1;
    let modrm = decodeModRM(fetchByte(), wide);
    let a = wide ? getReg16(modrm.reg) : getReg8(modrm.reg);
    let b = readRM(modrm, segOvr);
    writeRM(modrm, a, segOvr);
    wide ? setReg16(modrm.reg, b) : setReg8(modrm.reg, b);
    curInstr = 'XCHG'; curDesc = `XCHG: ${hex16(a)}\u2194${hex16(b)}`;
  }
  else {
    curInstr = `??? (${hex8(op)})`; curDesc = `Unknown opcode ${hex8(op)} at ${hex16(startCS)}:${hex16(startIP)}`;
    halt = true; setSt('ERROR');
  }

  cy++; ic++;
}
