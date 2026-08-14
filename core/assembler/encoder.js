// ============================================================
// workbench86 Assembler - Instruction encoding
// ============================================================

function assembleInstruction(text, addr, defs, lbls, ln) {
  text = text.trim();
  if (!text) return {err:'Empty instruction'};

  let spIdx = text.search(/\s/);
  let mn, operandStr;
  if (spIdx === -1) { mn = text; operandStr = ''; }
  else { mn = text.slice(0, spIdx); operandStr = text.slice(spIdx).trim(); }
  mn = mn.toUpperCase();

  // Handle REP/REPE/REPZ/REPNE/REPNZ prefix
  if (mn === 'REP' || mn === 'REPE' || mn === 'REPZ' || mn === 'REPNE' || mn === 'REPNZ') {
    let prefixByte = (mn === 'REPNE' || mn === 'REPNZ') ? 0xF2 : 0xF3;
    let innerMn = operandStr.trim().toUpperCase();
    let innerBytes = {
      'MOVSB':[0xA4],'MOVSW':[0xA5],'STOSB':[0xAA],'STOSW':[0xAB],
      'LODSB':[0xAC],'LODSW':[0xAD],'CMPSB':[0xA6],'CMPSW':[0xA7],
      'SCASB':[0xAE],'SCASW':[0xAF]
    }[innerMn];
    if (innerBytes) return {bytes: [prefixByte, ...innerBytes]};
    return {err: `${mn} requires a string instruction (MOVSB/STOSB/etc.)`};
  }

  let operands = splitOperands(operandStr);

  try {
    return encodeInstruction(mn, operands, addr, defs, lbls);
  } catch(e) {
    return {err: String(e)};
  }
}

function splitOperands(s) {
  if (!s.trim()) return [];
  let parts = [], depth = 0, cur = '', inQ = false, qc = '';
  for (let i = 0; i < s.length; i++) {
    let c = s[i];
    if (inQ) { cur += c; if (c === qc) inQ = false; continue; }
    if (c === "'" || c === '"') { cur += c; inQ = true; qc = c; continue; }
    if (c === '[') { depth++; cur += c; continue; }
    if (c === ']') { depth--; cur += c; continue; }
    if (c === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

function encodeInstruction(mn, operands, addr, defs, lbls) {
  const simpleOps = {
    'NOP':[0x90],'RET':[0xC3],'IRET':[0xCF],'HLT':[0xF4],
    'CLI':[0xFA],'STI':[0xFB],'CLC':[0xF8],'STC':[0xF9],'CMC':[0xF5],
    'CLD':[0xFC],'STD':[0xFD],
    'PUSHA':[0x60],'POPA':[0x61],'PUSHF':[0x9C],'POPF':[0x9D],
    'MOVSB':[0xA4],'MOVSW':[0xA5],'STOSB':[0xAA],'STOSW':[0xAB],
    'LODSB':[0xAC],'LODSW':[0xAD],'CMPSB':[0xA6],'CMPSW':[0xA7],
    'SCASB':[0xAE],'SCASW':[0xAF],
    'CBW':[0x98],'CWD':[0x99],
    'XLAT':[0xD7],'LAHF':[0x9F],'SAHF':[0x9E],
    'DAA':[0x27],'DAS':[0x2F],'AAA':[0x37],'AAS':[0x3F],
    'AAM':[0xD4,0x0A],'AAD':[0xD5,0x0A]
  };
  if (simpleOps[mn]) {
    let ops = operands.filter(o => o.trim());
    // RET/AAM/AAD are the only ones here that take an operand; every other
    // mnemonic must reject one instead of silently discarding it.
    let optImm = (mn === 'RET' || mn === 'AAM' || mn === 'AAD');
    if (ops.length === 1 && optImm) {
      let v = resolveImm(ops[0], defs, lbls, addr);
      if (mn === 'RET') return {bytes: [0xC2, v & 0xFF, (v >> 8) & 0xFF]};
      return {bytes: [mn === 'AAM' ? 0xD4 : 0xD5, v & 0xFF]};
    }
    if (ops.length) return {err: optImm ? `${mn} takes at most one immediate operand` : `${mn} takes no operands`};
    return {bytes: simpleOps[mn]};
  }

  if (mn === 'INT') {
    let v = resolveImm(operands[0], defs, lbls, addr);
    return {bytes: [0xCD, v & 0xFF]};
  }

  if (mn === 'PUSH' || mn === 'POP') {
    let r16 = parseReg16(operands[0]);
    if (r16 !== -1) return {bytes: [mn === 'PUSH' ? 0x50 + r16 : 0x58 + r16]};
    let op = parseOperand(operands[0], defs, lbls, addr);
    if (op && op.type === 'seg') {
      // PUSH ES/CS/SS/DS = 06/0E/16/1E, POP ES/SS/DS = 07/17/1F. The 8086 has no POP CS.
      if (mn === 'POP' && op.reg === 1) return {err: 'POP CS is not a valid 8086 instruction'};
      return {bytes: [(mn === 'PUSH' ? 0x06 : 0x07) | (op.reg << 3)]};
    }
    if (op && op.type === 'mem') {
      // PUSH r/m16 = FF /6, POP r/m16 = 8F /0
      let modrm = encodeModRM(mn === 'PUSH' ? 6 : 0, op);
      return {bytes: [...segPrefixBytes(op), mn === 'PUSH' ? 0xFF : 0x8F, ...modrm]};
    }
    return {err: `Bad operand for ${mn}`};
  }

  if (mn === 'INC' || mn === 'DEC') {
    let r16 = parseReg16(operands[0]);
    if (r16 !== -1) return {bytes: [mn === 'INC' ? 0x40 + r16 : 0x48 + r16]};
    let r8 = parseReg8(operands[0]);
    if (r8 !== -1) return {bytes: [mn === 'INC' ? 0xFE : 0xFE, 0xC0 | (mn === 'INC' ? 0 : 8) | r8]};
    let op = parseOperand(operands[0], defs, lbls, addr);
    if (op) {
      let wide = op.wide !== undefined ? op.wide : 1;
      let modrm = encodeModRM(mn === 'INC' ? 0 : 1, op);
      return {bytes: [...segPrefixBytes(op), wide ? 0xFF : 0xFE, ...modrm]};
    }
    return {err: `Bad operand for ${mn}`};
  }

  const jccMap = {'JO':0x70,'JNO':0x71,'JB':0x72,'JC':0x72,'JNAE':0x72,'JNB':0x73,'JNC':0x73,'JAE':0x73,
    'JZ':0x74,'JE':0x74,'JNZ':0x75,'JNE':0x75,'JBE':0x76,'JNA':0x76,'JA':0x77,'JNBE':0x77,
    'JS':0x78,'JNS':0x79,'JP':0x7A,'JNP':0x7B,'JL':0x7C,'JNGE':0x7C,'JGE':0x7D,'JNL':0x7D,
    'JLE':0x7E,'JNG':0x7E,'JG':0x7F,'JNLE':0x7F};
  if (jccMap[mn] !== undefined) {
    let target = resolveLabel(operands[0], defs, lbls);
    if (target === null) return {err: `Unknown label ${operands[0]}`};
    let disp = target - (addr + 2);
    if (disp < -128 || disp > 127) return {err: `Branch too far (${disp})`};
    return {bytes: [jccMap[mn], disp & 0xFF]};
  }

  const loopMap = {'LOOPNZ':0xE0,'LOOPNE':0xE0,'LOOPZ':0xE1,'LOOPE':0xE1,'LOOP':0xE2,'JCXZ':0xE3};
  if (loopMap[mn] !== undefined) {
    let target = resolveLabel(operands[0], defs, lbls);
    if (target === null) return {err: `Unknown label ${operands[0]}`};
    let disp = target - (addr + 2);
    if (disp < -128 || disp > 127) return {err: `Loop too far`};
    return {bytes: [loopMap[mn], disp & 0xFF]};
  }

  if (mn === 'JMP') {
    let target = resolveLabel(operands[0], defs, lbls);
    if (target !== null) {
      let disp = target - (addr + 2);
      if (disp >= -128 && disp <= 127) return {bytes: [0xEB, disp & 0xFF]};
      disp = target - (addr + 3);
      return {bytes: [0xE9, disp & 0xFF, (disp >> 8) & 0xFF]};
    }
    return {err: `Unknown label ${operands[0]}`};
  }

  if (mn === 'CALL') {
    let target = resolveLabel(operands[0], defs, lbls);
    if (target !== null) {
      let disp = target - (addr + 3);
      return {bytes: [0xE8, disp & 0xFF, (disp >> 8) & 0xFF]};
    }
    return {err: `Unknown label ${operands[0]}`};
  }

  if (mn === 'IN') {
    let dstStr = operands[0], srcStr = operands[1];
    let wide = /^AX$/i.test(dstStr) ? 1 : 0;
    if (/^DX$/i.test(srcStr)) return {bytes: [wide ? 0xED : 0xEC]};
    let port = resolveImm(srcStr, defs, lbls, addr);
    return {bytes: [wide ? 0xE5 : 0xE4, port & 0xFF]};
  }
  if (mn === 'OUT') {
    let dstStr = operands[0], srcStr = operands[1];
    if (/^DX$/i.test(dstStr)) {
      let wide = /^AX$/i.test(srcStr) ? 1 : 0;
      return {bytes: [wide ? 0xEF : 0xEE]};
    }
    let port = resolveImm(dstStr, defs, lbls, addr);
    let wide = /^AX$/i.test(srcStr) ? 1 : 0;
    return {bytes: [wide ? 0xE7 : 0xE6, port & 0xFF]};
  }

  if (mn === 'MOV') {
    let dst = parseOperand(operands[0], defs, lbls, addr);
    let src = parseOperand(operands[1], defs, lbls, addr);
    if (!dst || !src) return {err:'Bad MOV operands: '+operands.join(', ')};
    return assembleMOV(dst, src, defs, lbls, addr);
  }

  const aluMap = {'ADD':0,'OR':1,'ADC':2,'SBB':3,'AND':4,'SUB':5,'XOR':6,'CMP':7};
  if (aluMap[mn] !== undefined) {
    let dst = parseOperand(operands[0], defs, lbls, addr);
    let src = parseOperand(operands[1], defs, lbls, addr);
    if (!dst || !src) return {err: `Bad ${mn} operands`};
    return assembleALU(mn, aluMap[mn], dst, src);
  }
  if (mn === 'TEST') {
    let dst = parseOperand(operands[0], defs, lbls, addr);
    let src = parseOperand(operands[1], defs, lbls, addr);
    if (!dst || !src) return {err: 'Bad TEST operands'};
    return assembleTEST(dst, src);
  }

  if (['MUL','IMUL','DIV','IDIV','NOT','NEG'].includes(mn)) {
    let op = parseOperand(operands[0], defs, lbls, addr);
    if (!op) return {err: `Bad operand for ${mn}`};
    let grp = {MUL:4,IMUL:5,DIV:6,IDIV:7,NOT:2,NEG:3}[mn];
    let wide = (op.type==='reg16')?1:(op.type==='reg8'?0:(op.wide||1));
    if (op.type==='reg16'||op.type==='reg8') return {bytes:[wide?0xF7:0xF6, 0xC0|(grp<<3)|op.reg]};
    let modrm = encodeModRM(grp, op);
    return {bytes: [...segPrefixBytes(op), wide ? 0xF7 : 0xF6, ...modrm]};
  }

  const shiftMap = {'ROL':0,'ROR':1,'RCL':2,'RCR':3,'SHL':4,'SAL':4,'SHR':5,'SAR':7};
  if (shiftMap[mn] !== undefined) {
    let op = parseOperand(operands[0], defs, lbls, addr);
    if (!op) return {err: `Bad operand for ${mn}`};
    let cnt = operands.length > 1 ? operands[1].trim() : '1';
    let grp = shiftMap[mn];
    let wide = (op.type==='reg16'?1:(op.type==='reg8'?0:(op.wide||1)));
    let useCL = /^CL$/i.test(cnt);
    let base = useCL ? (wide?0xD3:0xD2) : (wide?0xD1:0xD0);
    if (op.type==='reg16'||op.type==='reg8') return {bytes:[base, 0xC0|(grp<<3)|op.reg]};
    let modrm = encodeModRM(grp, op);
    return {bytes: [...segPrefixBytes(op), base, ...modrm]};
  }

  if (mn === 'LEA') {
    let dst = parseReg16(operands[0]);
    if (dst === -1) return {err: 'LEA needs reg16 dest'};
    let src = parseOperand(operands[1], defs, lbls, addr);
    if (!src || src.type !== 'mem') return {err: 'LEA needs memory src'};
    let modrm = encodeModRM(dst, src);
    return {bytes: [...segPrefixBytes(src), 0x8D, ...modrm]};
  }

  if (mn === 'XCHG') {
    let r1=parseReg16(operands[0]), r2=parseReg16(operands[1]);
    if(r1===0&&r2!==-1)return{bytes:[0x90+r2]};
    if(r2===0&&r1!==-1)return{bytes:[0x90+r1]};
    if(r1!==-1&&r2!==-1)return{bytes:[0x87,0xC0|(r1<<3)|r2]};
    let r8a=parseReg8(operands[0]),r8b=parseReg8(operands[1]);
    if(r8a!==-1&&r8b!==-1)return{bytes:[0x86,0xC0|(r8a<<3)|r8b]};
    return{err:'XCHG: unsupported'};
  }

  return {err: `Unknown instruction: ${mn}`};
}

// === RESOLVE HELPERS ===
function resolveLabel(name, defs, lbls) {
  if (!name) return null;
  let u = name.toUpperCase();
  if (lbls[u] !== undefined) return lbls[u];
  if (defs[u] !== undefined) return defs[u];
  // Numeric literal fallback, limited to the number syntax the rest of the
  // assembler uses: decimal digits, or hex digits + H with a leading digit
  // (0FFH / 1A90H / 100). parseInt(name, 16) stopped at the first invalid
  // character, so a typo'd label like DONE1 silently became 0x0D.
  let hm = u.match(/^([0-9][0-9A-F]*)H$/);
  if (hm) return parseInt(hm[1], 16) & 0xFFFF;
  if (/^[0-9]+$/.test(u)) return parseInt(u, 10) & 0xFFFF;
  return null;
}

function resolveImm(s, defs, lbls, addr) {
  if (!s) return 0;
  s = s.trim().replace(/,$/, '');
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"')))
    return s.charCodeAt(1);
  return parseNum(s, defs, lbls, addr) || 0;
}

function parseReg16(s) {
  if (!s) return -1;
  s = s.toUpperCase().replace(/,/g, '').trim();
  return {'AX':0,'CX':1,'DX':2,'BX':3,'SP':4,'BP':5,'SI':6,'DI':7}[s] ?? -1;
}
function parseReg8(s) {
  if (!s) return -1;
  s = s.toUpperCase().replace(/,/g, '').trim();
  return {'AL':0,'CL':1,'DL':2,'BL':3,'AH':4,'CH':5,'DH':6,'BH':7}[s] ?? -1;
}

// === OPERAND PARSING ===
function parseOperand(s, defs, lbls, addr) {
  if (!s) return null;
  s = s.trim().replace(/,$/, '').trim();

  if (/^['"][^'"]['"]$/.test(s)) return {type:'imm', val: s.charCodeAt(1)};

  let r16 = parseReg16(s);
  if (r16 !== -1) return {type:'reg16', reg:r16};
  let r8 = parseReg8(s);
  if (r8 !== -1) return {type:'reg8', reg:r8};
  let sr = {'ES':0,'CS':1,'SS':2,'DS':3}[s.toUpperCase()];
  if (sr !== undefined) return {type:'seg', reg:sr};

  let wide = undefined;
  let ms = s;
  if (/^BYTE\s+PTR\s*/i.test(ms)) { wide = 0; ms = ms.replace(/^BYTE\s+PTR\s*/i, ''); }
  if (/^WORD\s+PTR\s*/i.test(ms)) { wide = 1; ms = ms.replace(/^WORD\s+PTR\s*/i, ''); }

  let segOvr = undefined;
  let sm = ms.match(/^(CS|DS|SS|ES):\s*(.*)/i);
  if (sm) { segOvr = {'ES':0,'CS':1,'SS':2,'DS':3}[sm[1].toUpperCase()]; ms = sm[2]; }

  let bm = ms.match(/^\[(.+)\]$/);
  if (bm) return parseMemExpr(bm[1], wide, segOvr, defs, lbls, addr);

  if (segOvr !== undefined || wide !== undefined || /^\w+\[/i.test(ms)) {
    let idxm = ms.match(/^(\w+)\[(.+)\]$/i);
    if (idxm) {
      let base = resolveLabel(idxm[1], defs, lbls);
      if (base === null) return null;
      return parseMemExpr(idxm[2] + '+' + base, wide, segOvr, defs, lbls, addr);
    }
    let val = parseNum(ms, defs, lbls, addr);
    if (val !== null) return {type:'mem', mod:0, rm:6, disp:val, wide, segOvr};
  }

  if (/^OFFSET\s+/i.test(s)) {
    let sym = s.replace(/^OFFSET\s+/i, '').trim();
    let v = resolveLabel(sym, defs, lbls);
    if (v !== null) return {type:'imm', val:v, wide:1};
  }

  let v = parseNum(s, defs, lbls, addr);
  if (v !== null) return {type:'imm', val:v, wide: (v > 0xFF || v < -128) ? 1 : undefined};

  return null;
}

function parseMemExpr(expr, wide, segOvr, defs, lbls, addr) {
  expr = expr.trim();
  let base = -1, idx = -1, disp = 0;
  let parts = expr.split(/(?=[+-])/);
  for (let p of parts) {
    p = p.trim().replace(/^\+/, '');
    let r = parseReg16(p);
    if (r !== -1) {
      if (r === 3 || r === 5) base = r;
      else if (r === 6 || r === 7) idx = r;
      else { if (base === -1) base = r; else idx = r; }
    } else {
      let v = parseNum(p, defs, lbls, addr);
      if (v !== null) disp = (disp + v) & 0xFFFF;
    }
  }

  let rm = -1, mod = 0;
  if (base === 3 && idx === 6) rm = 0;
  else if (base === 3 && idx === 7) rm = 1;
  else if (base === 5 && idx === 6) rm = 2;
  else if (base === 5 && idx === 7) rm = 3;
  else if (idx === 6 && base === -1) rm = 4;
  else if (idx === 7 && base === -1) rm = 5;
  else if (base === 5 && idx === -1) { rm = 6; mod = disp === 0 ? 1 : (disp >= -128 && disp <= 127 ? 1 : 2); }
  else if (base === 3 && idx === -1) rm = 7;
  else if (base === -1 && idx === -1) { rm = 6; mod = 0; }
  else return null;

  if (rm !== 6 || base !== -1) {
    if (disp === 0 && rm !== 6) mod = 0;
    else if (disp >= -128 && disp <= 127 && !(mod === 0 && rm === 6 && base === -1)) mod = 1;
    else mod = 2;
  }

  return {type:'mem', mod, rm, disp, wide, segOvr};
}

function segPrefixBytes(op) {
  if (!op || op.segOvr === undefined) return [];
  let bpBased = (op.rm === 2 || op.rm === 3 || (op.rm === 6 && op.mod !== 0));
  let defaultSeg = bpBased ? 2 : 3; // SS=2, DS=3
  if (op.segOvr !== defaultSeg) return [[0x26, 0x2E, 0x36, 0x3E][op.segOvr]];
  return [];
}

function encodeModRM(reg, op) {
  let bytes = [];
  if (op.type === 'reg16' || op.type === 'reg8') {
    bytes.push(0xC0 | (reg << 3) | op.reg);
  } else {
    let modrm = (op.mod << 6) | (reg << 3) | op.rm;
    bytes.push(modrm);
    if (op.mod === 0 && op.rm === 6) {
      bytes.push(op.disp & 0xFF, (op.disp >> 8) & 0xFF);
    } else if (op.mod === 1) {
      bytes.push(op.disp & 0xFF);
    } else if (op.mod === 2) {
      bytes.push(op.disp & 0xFF, (op.disp >> 8) & 0xFF);
    }
  }
  return bytes;
}

// === MOV ENCODING ===
function assembleMOV(dst, src, defs, lbls, addr) {
  if (dst.type === 'seg') {
    if (src.type === 'reg16') return {bytes: [0x8E, 0xC0 | (dst.reg << 3) | src.reg]};
    if (src.type === 'mem') { let modrm = encodeModRM(dst.reg, src); return {bytes: [...segPrefixBytes(src), 0x8E, ...modrm]}; }
  }
  if (src.type === 'seg') {
    if (dst.type === 'reg16') return {bytes: [0x8C, 0xC0 | (src.reg << 3) | dst.reg]};
    if (dst.type === 'mem') { let modrm = encodeModRM(src.reg, dst); return {bytes: [...segPrefixBytes(dst), 0x8C, ...modrm]}; }
  }
  if (dst.type === 'reg16' && src.type === 'imm') {
    let v = src.val & 0xFFFF;
    return {bytes: [0xB8 + dst.reg, v & 0xFF, (v >> 8) & 0xFF]};
  }
  if (dst.type === 'reg8' && src.type === 'imm') {
    return {bytes: [0xB0 + dst.reg, src.val & 0xFF]};
  }
  if (dst.type === 'reg16' && src.type === 'reg16') return {bytes: [0x8B, 0xC0 | (dst.reg << 3) | src.reg]};
  if (dst.type === 'reg8' && src.type === 'reg8') return {bytes: [0x8A, 0xC0 | (dst.reg << 3) | src.reg]};
  if ((dst.type === 'reg16' || dst.type === 'reg8') && src.type === 'mem') {
    let wide = dst.type === 'reg16' ? 1 : 0;
    if (src.mod === 0 && src.rm === 6 && dst.reg === 0) {
      let pfx = [];
      if (src.segOvr !== undefined && src.segOvr !== 3) pfx.push([0x26,0x2E,0x36,0x3E][src.segOvr]);
      return {bytes: [...pfx, wide ? 0xA1 : 0xA0, src.disp & 0xFF, (src.disp >> 8) & 0xFF]};
    }
    let modrm = encodeModRM(dst.reg, src);
    return {bytes: [...segPrefixBytes(src), wide ? 0x8B : 0x8A, ...modrm]};
  }
  if (dst.type === 'mem' && (src.type === 'reg16' || src.type === 'reg8')) {
    let wide = src.type === 'reg16' ? 1 : 0;
    if (dst.mod === 0 && dst.rm === 6 && src.reg === 0) {
      let pfx = [];
      if (dst.segOvr !== undefined && dst.segOvr !== 3) pfx.push([0x26,0x2E,0x36,0x3E][dst.segOvr]);
      return {bytes: [...pfx, wide ? 0xA3 : 0xA2, dst.disp & 0xFF, (dst.disp >> 8) & 0xFF]};
    }
    let modrm = encodeModRM(src.reg, dst);
    return {bytes: [...segPrefixBytes(dst), wide ? 0x89 : 0x88, ...modrm]};
  }
  if (dst.type === 'mem' && src.type === 'imm') {
    let wide = dst.wide !== undefined ? dst.wide : 1;
    let pfx = [];
    if (dst.segOvr !== undefined && dst.segOvr !== 3) pfx.push([0x26,0x2E,0x36,0x3E][dst.segOvr]);
    let modrm = encodeModRM(0, dst);
    let immBytes = wide ? [src.val & 0xFF, (src.val >> 8) & 0xFF] : [src.val & 0xFF];
    return {bytes: [...pfx, wide ? 0xC7 : 0xC6, ...modrm, ...immBytes]};
  }
  return {err: 'Unsupported MOV combination'};
}

// === ALU ENCODING ===
function assembleALU(mn, grp, dst, src) {
  if ((dst.type === 'reg8' && dst.reg === 0 || dst.type === 'reg16' && dst.reg === 0) && src.type === 'imm') {
    let wide = dst.type === 'reg16' ? 1 : 0;
    let base = (grp << 3) | 4 | wide;
    if (wide) return {bytes: [base, src.val & 0xFF, (src.val >> 8) & 0xFF]};
    return {bytes: [base, src.val & 0xFF]};
  }
  if (src.type === 'imm') {
    let wide = (dst.type==='reg16')?1:(dst.type==='reg8'?0:(dst.wide!==undefined?dst.wide:1));
    let pfx = (dst.type==='mem') ? segPrefixBytes(dst) : [];
    let modrm;
    if (dst.type==='reg16'||dst.type==='reg8') modrm=[0xC0|(grp<<3)|dst.reg];
    else modrm=encodeModRM(grp, dst);
    let sv = src.val;
    if (wide && sv >= -128 && sv <= 127 && grp !== 1 && grp !== 4 && grp !== 6) {
      return {bytes: [...pfx, 0x83, ...modrm, sv & 0xFF]};
    }
    if (wide) return {bytes: [...pfx, 0x81, ...modrm, sv & 0xFF, (sv >> 8) & 0xFF]};
    return {bytes: [...pfx, 0x80, ...modrm, sv & 0xFF]};
  }
  if ((dst.type==='reg16'||dst.type==='reg8') && (src.type==='mem'||src.type==='reg16'||src.type==='reg8')) {
    let wide = dst.type==='reg16'?1:0;
    let base = (grp<<3)|2|wide;
    if (src.type==='reg16'||src.type==='reg8') return {bytes:[base, 0xC0|(dst.reg<<3)|src.reg]};
    let modrm = encodeModRM(dst.reg, src);
    return {bytes: [...segPrefixBytes(src), base, ...modrm]};
  }
  if (dst.type==='mem'&&(src.type==='reg16'||src.type==='reg8')) {
    let wide = src.type==='reg16'?1:0;
    let base = (grp<<3)|wide;
    let modrm = encodeModRM(src.reg, dst);
    return {bytes: [...segPrefixBytes(dst), base, ...modrm]};
  }
  return {err: `Unsupported ${mn} combination`};
}

// === TEST ENCODING ===
function assembleTEST(dst, src) {
  if ((dst.type==='reg8'&&dst.reg===0||dst.type==='reg16'&&dst.reg===0)&&src.type==='imm') {
    let wide=dst.type==='reg16'?1:0;
    if(wide)return{bytes:[0xA9,src.val&0xFF,(src.val>>8)&0xFF]};
    return{bytes:[0xA8,src.val&0xFF]};
  }
  if (src.type==='imm') {
    let wide=(dst.type==='reg16')?1:(dst.type==='reg8'?0:(dst.wide!==undefined?dst.wide:1));
    let pfx = (dst.type==='mem') ? segPrefixBytes(dst) : [];
    let modrm;
    if(dst.type==='reg16'||dst.type==='reg8')modrm=[0xC0|dst.reg];
    else modrm=encodeModRM(0,dst);
    if(wide)return{bytes:[...pfx,0xF7,...modrm,src.val&0xFF,(src.val>>8)&0xFF]};
    return{bytes:[...pfx,0xF6,...modrm,src.val&0xFF]};
  }
  if((dst.type==='reg16'||dst.type==='reg8')&&(src.type==='reg16'||src.type==='reg8')){
    let wide=dst.type==='reg16'?1:0;
    return{bytes:[wide?0x85:0x84,0xC0|(src.reg<<3)|dst.reg]};
  }
  return{err:'Unsupported TEST combination'};
}
