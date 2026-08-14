// Engine regression tests.
//
// Two groups. The first is a differential check of flag and result semantics
// against hand computed 8086 values. The second pins defects that were found
// by differential testing and fixed, so they cannot come back silently.

// --- 1. differential: results and flags against the 8086 ---------------------

assemble('MOV AL,40H\nSHL AL,1\nHLT'); step();
check('SHL 40H,1 result', AX & 0xFF, 0x80);
check('SHL 40H,1 CF/OF', [flags().CF, flags().OF], [0, 1]);

assemble('MOV AL,0C0H\nSHL AL,1\nHLT'); step();
check('SHL 0C0H,1 CF/OF', [flags().CF, flags().OF], [1, 0]);

assemble('MOV AL,81H\nROL AL,1\nHLT'); step();
check('ROL 81H,1 result/CF', [AX & 0xFF, flags().CF], [0x03, 1]);

assemble('MOV AL,81H\nSHR AL,1\nHLT'); step();
check('SHR 81H,1 result/CF', [AX & 0xFF, flags().CF], [0x40, 1]);

assemble('MOV AL,80H\nSAR AL,1\nHLT'); step();
check('SAR 80H,1 result/OF', [AX & 0xFF, flags().OF], [0xC0, 0]);

assemble('MOV AL,80H\nNEG AL\nHLT'); step();
check('NEG 80H CF/OF', [flags().CF, flags().OF], [1, 1]);

assemble('MOV AX,7FFFH\nADD AX,1\nHLT'); step();
check('ADD 7FFF+1', [AX, flags().OF, flags().SF, flags().CF], [0x8000, 1, 1, 0]);

assemble('STC\nMOV AX,7FFFH\nINC AX\nHLT'); step();
check('INC 7FFF preserves CF', [AX, flags().OF, flags().CF], [0x8000, 1, 1]);

assemble('MOV AL,9\nADD AL,9\nDAA\nHLT'); step();
check('DAA 9+9 is BCD 18', AX & 0xFF, 0x18);

assemble('MOV AL,50H\nADD AL,50H\nDAA\nHLT'); step();
check('DAA 50+50 is BCD 00 with carry', [AX & 0xFF, flags().CF], [0x00, 1]);

assemble('MOV AX,0FFFFH\nMOV BX,0FFFFH\nMUL BX\nHLT'); step();
check('MUL FFFF x FFFF', [DX, AX], [0xFFFE, 0x0001]);

assemble('MOV AL,0FFH\nMOV BL,2\nIMUL BL\nHLT'); step();
check('IMUL -1 x 2', [AX, flags().CF, flags().OF], [0xFFFE, 0, 0]);

assemble('MOV AL,7FH\nCMP AL,80H\nHLT'); step();
check('CMP 7F,80 signed flags', [flags().CF, flags().OF, flags().SF], [1, 1, 1]);

assemble('MOV AX,10\nMOV BL,0\nDIV BL\nHLT'); step();
check('DIV by zero faults', halt, true);

assemble('MOV SI,2000H\nMOV DI,3000H\nMOV BYTE PTR [2000H],0AAH\n' +
         'MOV BYTE PTR [1FFFH],0BBH\nSTD\nMOV CX,2\nREP MOVSB\nCLD\nHLT'); step();
check('REP MOVSB with DF set', [peek(0x80, 0x3000), peek(0x80, 0x2FFF)], [0xAA, 0xBB]);

// --- 2. pinned regressions ---------------------------------------------------

// SBB produced no borrow when the subtrahend plus carry overflowed the width.
assemble('MOV AL,05H\nSTC\nSBB AL,0FFH\nHLT'); step();
check('SBB byte borrow', [AX & 0xFF, flags().CF], [0x05, 1]);
assemble('MOV AX,0005H\nSTC\nSBB AX,0FFFFH\nHLT'); step();
check('SBB word borrow', [AX, flags().CF], [0x0005, 1]);

// ADC must stay correct while SBB is fixed.
assemble('MOV AX,1\nMOV BX,0FFFFH\nSTC\nADC AX,BX\nHLT'); step();
check('ADC carry out', [AX, flags().CF], [0x0001, 1]);

// DIV truncated an out of range quotient instead of faulting.
assemble('MOV DX,0010H\nMOV AX,0000H\nMOV BX,0002H\nDIV BX\nHLT'); step();
check('DIV quotient overflow faults before writing', [halt, DX], [true, 0x0010]);

// An undefined label was silently resolved as a hex number.
check('undefined label is an error', assemble('MOV AX,1\nJMP DONE1\nHLT').ok, false);
check('undefined hex looking label is an error', assemble('MOV AX,1\nJMP CAFE\nHLT').ok, false);
check('real hex target still assembles', assemble('JMP 0100H\nHLT').ok, true);

// Segment register PUSH and POP were missing, which broke a shipped example.
check('PUSH DS assembles', assemble('PUSH DS\nHLT').ok, true);
check('POP DS assembles', assemble('POP DS\nHLT').ok, true);
check('POP CS is rejected', assemble('POP CS\nHLT').ok, false);

// RET with an immediate silently assembled as a plain RET.
assemble('MOV AX,1234H\nPUSH AX\nMOV BX,5\nPUSH BX\nCALL SUB1\nHLT\nSUB1: RET 2'); step();
check('RET imm16 adjusts SP', SP, 0xFFEE);

// Mnemonics with no operands silently discarded whatever they were given.
check('NOP with an operand is an error', assemble('NOP 5\nHLT').ok, false);
check('AAM with a base assembles', assemble('AAM 16\nHLT').ok, true);

// The reverse debugger could not undo the first write to a clean page.
assemble('MOV AL,55H\nMOV [3000H],AL\nHLT');
var snap = captureSnap();
execOne(); execOne();
var afterWrite = peek(0x80, 0x3000);
restoreSnap(snap);
check('step back undoes a write to a fresh page', [afterWrite, peek(0x80, 0x3000)], [0x55, 0x00]);

// A pending IRQ with no installed vector corrupted the stack and cleared IF.
assemble('MOV AL,01H\nOUT UIRQEN,AL\nMOV AL,02H\nOUT UTIMER1,AL\nSTI\nL0: NOP\nJMP L0');
var spBefore = SP;
step(3000);
check('IRQ without a vector leaves the stack alone', SP, spBefore);
check('IRQ without a vector leaves IF set', (FLAGS >> 9) & 1, 1);

// The ADC start of conversion edge was dead code, so BSY never went busy.
assemble('MOV AL,0FFH\nOUT UPORT1CTL,AL\nMOV AL,02H\nOUT UPORT1,AL\n' +
         'MOV AL,00H\nOUT UPORT1,AL\nHLT'); step();
check('ADC starts on the WR falling edge', [adcBusy, adcConvCount], [true, 3]);

report('engine');
