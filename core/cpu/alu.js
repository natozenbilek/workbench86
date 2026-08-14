// ============================================================
// workbench86 CPU - ALU Operations & Condition Code Testing
// ============================================================

// === ALU HELPER ===
function doALU(grp, a, b, wide) {
  let mask = wide ? 0xFFFF : 0xFF;
  let res;
  switch(grp) {
    case 0: res = a + b; wide ? setFlagsArith16(res, a, b, false) : setFlagsArith8(res, a, b, false); break;
    case 1: res = a | b; wide ? setFlagsLogic16(res) : setFlagsLogic8(res); break;
    // ADC/SBB pass the carry-in as its own operand: b+gf(CF) leaves the operand
    // width when b is 0FFH/0FFFFH, which used to lose CF and AF.
    case 2: { let ci = gf(CF); res = a + b + ci; wide ? setFlagsArith16(res, a, b, false, ci) : setFlagsArith8(res, a, b, false, ci); break; }
    case 3: { let ci = gf(CF); res = a - b - ci; wide ? setFlagsArith16(res, a, b, true, ci) : setFlagsArith8(res, a, b, true, ci); break; }
    case 4: res = a & b; wide ? setFlagsLogic16(res) : setFlagsLogic8(res); break;
    case 5: res = a - b; wide ? setFlagsArith16(res, a, b, true) : setFlagsArith8(res, a, b, true); break;
    case 6: res = a ^ b; wide ? setFlagsLogic16(res) : setFlagsLogic8(res); break;
    case 7: res = a - b; wide ? setFlagsArith16(res, a, b, true) : setFlagsArith8(res, a, b, true); break;
    default: res = a;
  }
  return res & mask;
}

// === CONDITION CODE TESTING ===
function testCC(cc) {
  switch(cc) {
    case 0: return gf(OF)===1;
    case 1: return gf(OF)===0;
    case 2: return gf(CF)===1;
    case 3: return gf(CF)===0;
    case 4: return gf(ZF)===1;
    case 5: return gf(ZF)===0;
    case 6: return gf(CF)===1||gf(ZF)===1;
    case 7: return gf(CF)===0&&gf(ZF)===0;
    case 8: return gf(SF)===1;
    case 9: return gf(SF)===0;
    case 10: return gf(PF)===1;
    case 11: return gf(PF)===0;
    case 12: return gf(SF)!==gf(OF);
    case 13: return gf(SF)===gf(OF);
    case 14: return gf(ZF)===1||(gf(SF)!==gf(OF));
    case 15: return gf(ZF)===0&&(gf(SF)===gf(OF));
  }
  return false;
}
