// ============================================================
// workbench86 Assembler - Parser, expression evaluator, data directives
// ============================================================

function doAssemble() {
  if (typeof currentFileType === 'function' && currentFileType() !== 'asm') {
    sLog('Cannot assemble: current file is not .asm \u2014 use "Translate to ASM" first.', 1);
    return;
  }
  let src = document.getElementById('ed').value;
  let lines = src.split('\n');
  let errs = [], errLines = new Set();
  let defs = {...PATCALLS};

  function parseLine(l) {
    l = l.replace(/;.*$/, '').trim();
    if (!l) return {type:'empty'};
    if (/^INCLUDE\s+PATCALLS\.INC/i.test(l)) return {type:'directive',dir:'INCLUDE'};
    if (/^END\b/i.test(l)) return {type:'end'};
    let label = null;
    let lm = l.match(/^(\w+)\s*:\s*(.*)/);
    if (lm) { label = lm[1]; l = lm[2].trim(); }
    else {
      let fm = l.match(/^(\w+)\s+(EQU|DB|DW|ORG)\b/i);
      if (fm && !isInstruction(fm[1])) { label = fm[1]; l = l.slice(fm[1].length).trim(); }
      else {
        let fm2 = l.match(/^(\w+)\s+/);
        if (fm2 && !isInstruction(fm2[1]) && !isDirective(fm2[1])) {
          let rest = l.slice(fm2[1].length).trim();
          let nextTok = rest.split(/[\s,]+/)[0];
          if (isInstruction(nextTok)) { label = fm2[1]; l = rest; }
        }
      }
    }
    if (!l && label) return {type:'label', label};
    let om = l.match(/^ORG\s+(.+)/i);
    if (om) return {type:'directive', dir:'ORG', expr:om[1], label};
    let em = l.match(/^EQU\s+(.+)/i);
    if (em) return {type:'directive', dir:'EQU', expr:em[1], label};
    let dm = l.match(/^DB\s+(.+)/i);
    if (dm) return {type:'data', dir:'DB', expr:dm[1], label};
    let dwm = l.match(/^DW\s+(.+)/i);
    if (dwm) return {type:'data', dir:'DW', expr:dwm[1], label};
    return {type:'instr', text:l, label};
  }

  let items = [];
  for (let i = 0; i < lines.length; i++) {
    let p = parseLine(lines[i]);
    p.ln = i + 1;
    items.push(p);
    if (p.type === 'end') break;
  }

  function assemblyPass(passNum) {
    let lbls2 = {...defs};
    let org = 0x100, curAddr = org, lastOrg = org;
    let entrySet = false;
    let output = [];
    let instrLineSet = new Set();

    for (let item of items) {
      if (item.label) lbls2[item.label.toUpperCase()] = curAddr;

      if (item.type === 'directive') {
        if (item.dir === 'ORG') {
          let v = evalExpr(item.expr, lbls2, lbls2, curAddr);
          if (v !== null) { curAddr = v; lastOrg = v; }
        } else if (item.dir === 'EQU' && item.label) {
          let v = evalExpr(item.expr, lbls2, lbls2, curAddr);
          if (v !== null) { lbls2[item.label.toUpperCase()] = v; baseDefs[item.label.toUpperCase()] = v; }
        }
        continue;
      }
      if (item.type === 'data') {
        if (item.dir === 'DB') {
          let bytes = parseDBArgs(item.expr, lbls2, lbls2, curAddr);
          output.push({type:'data', addr:curAddr, bytes, ln:item.ln});
          curAddr += bytes.length;
        } else if (item.dir === 'DW') {
          let words = parseDWArgs(item.expr, lbls2, lbls2, curAddr);
          output.push({type:'data', addr:curAddr, words, ln:item.ln});
          curAddr += words.length * 2;
        }
        continue;
      }
      if (item.type !== 'instr') continue;

      if (!entrySet) { org = lastOrg; entrySet = true; }

      let result = assembleInstruction(item.text, curAddr, lbls2, lbls2, item.ln);
      if (result.err) {
        if (passNum === 2) { errs.push(`Line ${item.ln}: ${result.err}`); errLines.add(item.ln); }
        output.push({type:'instr', addr:curAddr, bytes:[0x90], ln:item.ln});
        curAddr += 1;
      } else {
        output.push({type:'instr', addr:curAddr, bytes:result.bytes, ln:item.ln});
        instrLineSet.add(item.ln);
        curAddr += result.bytes.length;
      }
    }
    return {output, lbls: lbls2, org, instrLineSet};
  }

  let pResult = null;
  let prevLabels = {};
  let baseDefs = {...defs};
  for (let pass = 0; pass < 8; pass++) {
    errs = []; errLines = new Set();
    defs = {...baseDefs, ...prevLabels};
    pResult = assemblyPass(pass >= 1 ? 2 : 1);
    let converged = true;
    for (let k in pResult.lbls) {
      if (prevLabels[k] !== pResult.lbls[k]) { converged = false; break; }
    }
    prevLabels = {...pResult.lbls};
    if (converged && pass >= 1) break;
  }
  defs = prevLabels;
  let p2 = pResult;

  if (errs.length) {
    asmErrLines = errLines;
    let firstErr = updLn();
    if (firstErr > 0) scrollToLine(firstErr);
    sLog(errs.join('\n'), 1);
    return;
  }

  mem.fill(0); ioPorts.fill(0); ioLog = []; patDisplay = ''; execTrace = [];
  for (let item of p2.output) {
    if (item.type === 'data' && item.bytes) {
      for (let j = 0; j < item.bytes.length; j++) wb(pa(0x80, item.addr + j), item.bytes[j]);
    } else if (item.type === 'data' && item.words) {
      for (let j = 0; j < item.words.length; j++) ww(pa(0x80, item.addr + j * 2), item.words[j]);
    } else if (item.type === 'instr') {
      for (let j = 0; j < item.bytes.length; j++) wb(pa(0x80, item.addr + j), item.bytes[j]);
    }
  }

  asmErrLines.clear();
  labels = p2.lbls;
  instrLines = p2.instrLineSet;
  asmLines = p2.output.filter(x => x.type === 'instr');
  asmOutput = p2.output;
  pLen = asmLines.length;
  progOrg = p2.org;

  AX=BX=CX=DX=SI=DI=BP=0;
  CS=DS=SS=ES=0x80;
  SP=0xFFF0;
  IP=p2.org;
  FLAGS=0x0002;
  halt=false; cy=0; ic=0;
  curInstr='\u2014'; curDesc='\u2014'; lastDiff='\u2014';
  stepPast=[]; stepFuture=[];
  motorDacVal=0; piezoOn=false; diskPulses=0; motorAngle=0;

  sLog(`Assembled ${pLen} instructions. CS:IP=${hex16(CS)}:${hex16(IP)} SP=${hex16(SP)}`, 0);
  setSt('READY');
  renderAll();
}

function isInstruction(tok) {
  if (!tok) return false;
  const instrs = 'MOV,ADD,SUB,MUL,IMUL,DIV,IDIV,AND,OR,XOR,NOT,TEST,CMP,INC,DEC,NEG,PUSH,POP,PUSHA,POPA,PUSHF,POPF,JMP,JZ,JNZ,JC,JNC,JE,JNE,JB,JNB,JA,JAE,JBE,JG,JGE,JL,JLE,JO,JNO,JS,JNS,JP,JNP,JCXZ,CALL,RET,IRET,INT,CLI,STI,HLT,LOOP,LOOPZ,LOOPNZ,IN,OUT,NOP,LEA,XCHG,CLC,STC,CMC,CLD,STD,ROL,ROR,RCL,RCR,SHL,SHR,SAR,SAL,MOVSB,MOVSW,STOSB,STOSW,LODSB,LODSW,CMPSB,CMPSW,SCASB,SCASW,CBW,CWD,REP,REPE,REPZ,REPNE,REPNZ,OFFSET'.split(',');
  return instrs.includes(tok.toUpperCase());
}
function isDirective(tok) {
  return ['ORG','EQU','DB','DW','END','INCLUDE','OFFSET','BYTE','WORD','PTR'].includes((tok||'').toUpperCase());
}

function evalExpr(expr, defs, lbls, curAddr) {
  expr = expr.trim();
  expr = expr.replace(/\$/g, String(curAddr));
  let resolved = expr.replace(/\b([A-Za-z_]\w*)\b/g, (m) => {
    let u = m.toUpperCase();
    if (u === 'H' || u === 'B' || u === 'O' || u === 'D') return m;
    if (defs[u] !== undefined) return String(defs[u]);
    if (lbls[u] !== undefined) return String(lbls[u]);
    return m;
  });
  resolved = resolved.replace(/\b0([0-9A-Fa-f]+)[Hh]\b/g, '0x$1');
  resolved = resolved.replace(/\b([0-9][0-9A-Fa-f]*)[Hh]\b/g, (m, p1) => '0x' + p1);
  try {
    let val = Function('"use strict"; return (' + resolved + ')')();
    if (typeof val !== 'number' || isNaN(val)) return null;
    return Math.floor(val) & 0xFFFF;
  } catch(e) {
    let v = parseInt(expr.replace(/[Hh]$/, ''), 16);
    if (!isNaN(v)) return v & 0xFFFF;
    return null;
  }
}

function parseNum(s, defs, lbls, curAddr) {
  if (!s) return null;
  s = s.trim();
  if (/^OFFSET\s+/i.test(s)) {
    let sym = s.replace(/^OFFSET\s+/i, '').trim();
    return evalExpr(sym, defs, lbls, curAddr);
  }
  return evalExpr(s, defs, lbls, curAddr);
}

function parseDBArgs(argStr, defs, lbls, curAddr) {
  let bytes = [];
  let i = 0, s = argStr;
  while (i < s.length) {
    if (s[i] === '"' || s[i] === "'") {
      let q = s[i], j = i + 1;
      while (j < s.length && s[j] !== q) j++;
      for (let k = i + 1; k < j; k++) bytes.push(s.charCodeAt(k));
      i = j + 1;
      if (i < s.length && s[i] === ',') i++;
    } else if (s[i] === ',') { i++; }
    else {
      let j = s.indexOf(',', i);
      if (j === -1) j = s.length;
      let tok = s.slice(i, j).trim();
      if (tok) {
        let v = parseNum(tok, defs, lbls, curAddr);
        if (v !== null) bytes.push(v & 0xFF);
      }
      i = j + 1;
    }
  }
  return bytes;
}

function parseDWArgs(argStr, defs, lbls, curAddr) {
  let words = [];
  let parts = argStr.split(',');
  for (let p of parts) {
    let v = parseNum(p.trim(), defs, lbls, curAddr);
    if (v !== null) words.push(v & 0xFFFF);
  }
  return words;
}
