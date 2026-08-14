// ============================================================
// workbench86 Guide Data - HTML content for ISA reference tabs
// ============================================================

const GUIDE_HTML = {
overview: `<h3>Overview</h3>
<p>workbench86 is an 8086 real-mode assembler, simulator and debugger for the DIGIAC 2000 lab trainer. Peripheral state is reported through the Port Monitor, the I/O log and the display card.</p>
<table><tr><th>Parameter</th><th>Value</th></tr>
<tr><td>CPU</td><td>Intel 8086 real-mode subset</td></tr>
<tr><td>Memory</td><td>1 MB (20-bit addressing, segment:offset)</td></tr>
<tr><td>User segment</td><td>CS=DS=SS=0080H &rarr; physical base 00800H</td></tr>
<tr><td>Code origin</td><td>ORG 0100H &rarr; physical 00900H</td></tr>
<tr><td>Stack</td><td>SP=FFF0H (descending)</td></tr>
<tr><td>I/O</td><td>Memory-mapped via Intel 8256 MUART</td></tr>
<tr><td>Interrupts</td><td>INT 28H (PAT Monitor), Timer IRQ2</td></tr></table>

<h4>Keyboard Shortcuts</h4>
<table><tr><th>Key</th><th>Action</th></tr>
<tr><td><code>Ctrl+Enter</code></td><td>Assemble &amp; Load</td></tr>
<tr><td><code>Ctrl+Z / Ctrl+Y</code></td><td>Undo / Redo</td></tr>
<tr><td><code>Ctrl+F</code></td><td>Find / Replace</td></tr>
<tr><td><code>F1</code></td><td>Toggle this guide</td></tr>
<tr><td><code>?</code></td><td>Keyboard shortcuts cheat sheet</td></tr>
<tr><td><code>Esc</code></td><td>Close modals</td></tr></table>

<h4>Debugging</h4>
<p>Click line numbers to toggle <strong>breakpoints</strong>. Use <strong>Back / Step / Forward</strong> to navigate execution history. The <strong>Run</strong> button pauses at breakpoints.</p>

<h4>High-Level Language Support</h4>
<p>Open a <code>.c</code>, <code>.py</code>, <code>.java</code>, or <code>.go</code> file and click <strong>Translate to ASM</strong>. Supported constructs: variable declarations, loops, port I/O (<code>outport</code>), delays (<code>delay_ms</code>), and basic arithmetic.</p>

<h4>Serial Upload</h4>
<p>Connect to a physical DIGIAC 2000 board (the PAT 80286 card) via USB (Chrome/Edge WebSerial). Click <strong>Device</strong> to pair, then <strong>Upload and Run</strong> to send your program.</p>

<p class="guide-note">All PA01&ndash;PA29 practical assignments and demo programs are available in the file explorer.</p>`,

registers: `<h3>Registers</h3>

<h4>General Purpose (16-bit, split into 8-bit halves)</h4>
<table><tr><th>16-bit</th><th>High</th><th>Low</th><th>Common Use</th></tr>
<tr><td><code>AX</code></td><td><code>AH</code></td><td><code>AL</code></td><td>Accumulator, I/O, INT function number</td></tr>
<tr><td><code>BX</code></td><td><code>BH</code></td><td><code>BL</code></td><td>Base pointer, addressing</td></tr>
<tr><td><code>CX</code></td><td><code>CH</code></td><td><code>CL</code></td><td>Counter (LOOP, REP, shifts)</td></tr>
<tr><td><code>DX</code></td><td><code>DH</code></td><td><code>DL</code></td><td>Data, MUL/DIV high word, I/O port</td></tr></table>

<h4>Index &amp; Pointer</h4>
<table><tr><th>Reg</th><th>Use</th></tr>
<tr><td><code>SI</code></td><td>Source index (string ops, general addressing)</td></tr>
<tr><td><code>DI</code></td><td>Destination index (string ops, general addressing)</td></tr>
<tr><td><code>SP</code></td><td>Stack pointer (auto-managed by PUSH/POP/CALL/RET)</td></tr>
<tr><td><code>BP</code></td><td>Base pointer (stack frame access, defaults to SS)</td></tr></table>

<h4>Segment Registers</h4>
<table><tr><th>Reg</th><th>Default</th><th>Use</th></tr>
<tr><td><code>CS</code></td><td>0080H</td><td>Code segment</td></tr>
<tr><td><code>DS</code></td><td>0080H</td><td>Data segment (default for MOV/arithmetic)</td></tr>
<tr><td><code>SS</code></td><td>0080H</td><td>Stack segment (default for BP-based addressing)</td></tr>
<tr><td><code>ES</code></td><td>0000H</td><td>Extra segment (string destination)</td></tr></table>

<p class="guide-note"><strong>Physical address</strong> = segment &times; 16 + offset.<br>
Example: DS:1000H &rarr; 0080H &times; 16 + 1000H = 01800H</p>

<h4>FLAGS Register</h4>
<table><tr><th>Bit</th><th>Flag</th><th>Name</th><th>Set When</th></tr>
<tr><td>0</td><td><code>CF</code></td><td>Carry</td><td>Unsigned overflow / borrow from MSB</td></tr>
<tr><td>2</td><td><code>PF</code></td><td>Parity</td><td>Low byte of result has even parity</td></tr>
<tr><td>4</td><td><code>AF</code></td><td>Aux Carry</td><td>Carry from bit 3 (BCD operations)</td></tr>
<tr><td>6</td><td><code>ZF</code></td><td>Zero</td><td>Result is zero</td></tr>
<tr><td>7</td><td><code>SF</code></td><td>Sign</td><td>Result is negative (MSB = 1)</td></tr>
<tr><td>8</td><td><code>TF</code></td><td>Trap</td><td>Single-step mode</td></tr>
<tr><td>9</td><td><code>IF</code></td><td>Interrupt</td><td>Hardware interrupts enabled (STI)</td></tr>
<tr><td>10</td><td><code>DF</code></td><td>Direction</td><td>String ops decrement SI/DI (STD)</td></tr>
<tr><td>11</td><td><code>OF</code></td><td>Overflow</td><td>Signed overflow</td></tr></table>`,

instructions: `<h3>Instruction Set</h3>

<h4>Data Movement</h4>
<table><tr><th>Instruction</th><th>Action</th></tr>
<tr><td><code>MOV dst, src</code></td><td>dst &larr; src</td></tr>
<tr><td><code>PUSH src</code></td><td>SP&minus;=2; [SS:SP] &larr; src</td></tr>
<tr><td><code>POP dst</code></td><td>dst &larr; [SS:SP]; SP+=2</td></tr>
<tr><td><code>PUSHA / POPA</code></td><td>Push / pop all GPRs</td></tr>
<tr><td><code>PUSHF / POPF</code></td><td>Push / pop FLAGS register</td></tr>
<tr><td><code>XCHG a, b</code></td><td>Swap a and b</td></tr>
<tr><td><code>LEA reg, [mem]</code></td><td>Load effective address (offset only)</td></tr>
<tr><td><code>IN AL/AX, port</code></td><td>Read from I/O port (imm8 or DX)</td></tr>
<tr><td><code>OUT port, AL/AX</code></td><td>Write to I/O port (imm8 or DX)</td></tr>
<tr><td><code>XLAT</code></td><td>AL &larr; [BX + AL] (table lookup)</td></tr>
<tr><td><code>CBW</code></td><td>Sign-extend AL &rarr; AX</td></tr>
<tr><td><code>CWD</code></td><td>Sign-extend AX &rarr; DX:AX</td></tr>
<tr><td><code>LAHF / SAHF</code></td><td>Load / Store AH from/to FLAGS low byte</td></tr></table>

<h4>Arithmetic</h4>
<table><tr><th>Instruction</th><th>Flags Affected</th></tr>
<tr><td><code>ADD / SUB</code></td><td>CF ZF SF OF PF AF</td></tr>
<tr><td><code>ADC / SBB</code></td><td>Add/subtract with carry/borrow</td></tr>
<tr><td><code>INC / DEC</code></td><td>ZF SF OF PF AF (not CF)</td></tr>
<tr><td><code>MUL src</code></td><td>Unsigned: AL&times;src &rarr; AX (byte) or AX&times;src &rarr; DX:AX (word)</td></tr>
<tr><td><code>IMUL src</code></td><td>Signed multiply</td></tr>
<tr><td><code>DIV src</code></td><td>Unsigned: AX/src &rarr; AL quot, AH rem (byte) or DX:AX/src (word)</td></tr>
<tr><td><code>IDIV src</code></td><td>Signed divide</td></tr>
<tr><td><code>NEG dst</code></td><td>Two's complement negate (dst = 0 &minus; dst)</td></tr>
<tr><td><code>CMP a, b</code></td><td>Flags from a&minus;b (result discarded)</td></tr>
<tr><td><code>DAA / DAS</code></td><td>BCD adjust after add / subtract</td></tr>
<tr><td><code>AAA / AAS</code></td><td>ASCII adjust after add / subtract</td></tr>
<tr><td><code>AAM / AAD</code></td><td>ASCII adjust after multiply / before divide</td></tr></table>

<h4>Logic &amp; Shifts</h4>
<table><tr><th>Instruction</th><th>Notes</th></tr>
<tr><td><code>AND / OR / XOR</code></td><td>CF=OF=0 after logic ops</td></tr>
<tr><td><code>NOT dst</code></td><td>Bitwise complement (flags unchanged)</td></tr>
<tr><td><code>TEST a, b</code></td><td>Flags from a AND b (no store)</td></tr>
<tr><td><code>SHL / SHR</code></td><td>Shift left / logical shift right by 1 or CL</td></tr>
<tr><td><code>SAR</code></td><td>Arithmetic shift right (preserves sign)</td></tr>
<tr><td><code>ROL / ROR</code></td><td>Rotate left / right</td></tr>
<tr><td><code>RCL / RCR</code></td><td>Rotate through carry left / right</td></tr></table>

<h4>String Operations</h4>
<table><tr><th>Instruction</th><th>Action</th></tr>
<tr><td><code>MOVSB / MOVSW</code></td><td>[DS:SI] &rarr; [ES:DI], adjust SI &amp; DI</td></tr>
<tr><td><code>STOSB / STOSW</code></td><td>AL/AX &rarr; [ES:DI], adjust DI</td></tr>
<tr><td><code>LODSB / LODSW</code></td><td>[DS:SI] &rarr; AL/AX, adjust SI</td></tr>
<tr><td><code>CMPSB / CMPSW</code></td><td>Compare [DS:SI] with [ES:DI], set flags</td></tr>
<tr><td><code>SCASB / SCASW</code></td><td>Compare AL/AX with [ES:DI], set flags</td></tr>
<tr><td><code>REP</code></td><td>Repeat CX times (MOVS, STOS, LODS)</td></tr>
<tr><td><code>REPE / REPZ</code></td><td>Repeat while ZF=1 (CMPS, SCAS)</td></tr>
<tr><td><code>REPNE / REPNZ</code></td><td>Repeat while ZF=0 (CMPS, SCAS)</td></tr></table>
<p class="guide-note"><code>CLD</code> &rarr; SI/DI increment; <code>STD</code> &rarr; SI/DI decrement.</p>

<h4>Control Flow</h4>
<table><tr><th>Instruction</th><th>Condition</th></tr>
<tr><td><code>JMP label</code></td><td>Unconditional (short or near)</td></tr>
<tr><td><code>JZ / JE</code> &middot; <code>JNZ / JNE</code></td><td>ZF=1 / ZF=0</td></tr>
<tr><td><code>JC / JB</code> &middot; <code>JNC / JAE</code></td><td>CF=1 / CF=0</td></tr>
<tr><td><code>JBE / JNA</code> &middot; <code>JA / JNBE</code></td><td>CF=1 or ZF=1 / CF=0 and ZF=0</td></tr>
<tr><td><code>JS</code> &middot; <code>JNS</code></td><td>SF=1 / SF=0</td></tr>
<tr><td><code>JO</code> &middot; <code>JNO</code></td><td>OF=1 / OF=0</td></tr>
<tr><td><code>JP</code> &middot; <code>JNP</code></td><td>PF=1 / PF=0</td></tr>
<tr><td><code>JL / JNGE</code> &middot; <code>JGE / JNL</code></td><td>SF&ne;OF / SF=OF</td></tr>
<tr><td><code>JLE / JNG</code> &middot; <code>JG / JNLE</code></td><td>ZF=1 or SF&ne;OF / ZF=0 and SF=OF</td></tr>
<tr><td><code>CALL / RET</code></td><td>Subroutine call / return</td></tr>
<tr><td><code>LOOP label</code></td><td>CX&minus;&minus;; jump if CX&ne;0</td></tr>
<tr><td><code>LOOPZ / LOOPNZ</code></td><td>+ ZF=1 / ZF=0 condition</td></tr>
<tr><td><code>JCXZ label</code></td><td>Jump if CX=0</td></tr>
<tr><td><code>INT n</code></td><td>Software interrupt</td></tr>
<tr><td><code>IRET</code></td><td>Return from interrupt</td></tr>
<tr><td><code>HLT</code></td><td>Halt (wakes on interrupt if IF=1)</td></tr></table>

<h4>Flag Control</h4>
<table><tr><th>Instruction</th><th>Action</th></tr>
<tr><td><code>CLC / STC / CMC</code></td><td>Clear / Set / Complement carry</td></tr>
<tr><td><code>CLD / STD</code></td><td>Clear / Set direction flag</td></tr>
<tr><td><code>CLI / STI</code></td><td>Clear / Set interrupt flag</td></tr>
<tr><td><code>NOP</code></td><td>No operation</td></tr></table>`,

addressing: `<h3>Addressing &amp; Directives</h3>

<h4>Addressing Modes</h4>
<table><tr><th>Mode</th><th>Syntax</th><th>Example</th></tr>
<tr><td>Register</td><td><code>reg</code></td><td><code>MOV AX, BX</code></td></tr>
<tr><td>Immediate</td><td><code>imm</code></td><td><code>MOV AL, 42H</code></td></tr>
<tr><td>Direct</td><td><code>[addr]</code></td><td><code>MOV AX, [1000H]</code></td></tr>
<tr><td>Register indirect</td><td><code>[BX]</code> <code>[SI]</code> <code>[DI]</code></td><td><code>MOV AL, [BX]</code></td></tr>
<tr><td>Based</td><td><code>[BX+disp]</code> <code>[BP+disp]</code></td><td><code>MOV AX, [BP+4]</code></td></tr>
<tr><td>Indexed</td><td><code>[SI+disp]</code> <code>[DI+disp]</code></td><td><code>MOV AL, [SI+2]</code></td></tr>
<tr><td>Based+Indexed</td><td><code>[BX+SI]</code> <code>[BP+DI]</code> etc.</td><td><code>MOV AX, [BX+SI+4]</code></td></tr>
<tr><td>Segment override</td><td><code>ES:[addr]</code></td><td><code>MOV AL, ES:[DI]</code></td></tr>
<tr><td>Symbolic indexed</td><td><code>label[BX]</code></td><td><code>MOV AL, TABLE[BX]</code></td></tr></table>

<h4>Size Specifiers</h4>
<table><tr><th>Keyword</th><th>Effect</th></tr>
<tr><td><code>BYTE PTR</code></td><td>Force 8-bit memory access</td></tr>
<tr><td><code>WORD PTR</code></td><td>Force 16-bit memory access</td></tr>
<tr><td><code>OFFSET label</code></td><td>Resolve label to its numeric address (immediate)</td></tr></table>

<h4>Assembler Directives</h4>
<table><tr><th>Directive</th><th>Syntax</th><th>Description</th></tr>
<tr><td><code>ORG</code></td><td><code>ORG 0100H</code></td><td>Set assembly origin address (default: 0100H)</td></tr>
<tr><td><code>EQU</code></td><td><code>NAME EQU value</code></td><td>Define a named constant</td></tr>
<tr><td><code>DB</code></td><td><code>DB 41H,'Hello',0</code></td><td>Define byte(s) &mdash; numbers, strings, or mixed</td></tr>
<tr><td><code>DW</code></td><td><code>DW 1234H, 5678H</code></td><td>Define word(s) (16-bit, little-endian)</td></tr>
<tr><td><code>INCLUDE</code></td><td><code>INCLUDE PATCALLS.INC</code></td><td>Load all port &amp; function constants</td></tr>
<tr><td><code>END</code></td><td><code>END</code></td><td>Mark end of source file</td></tr></table>

<h4>Numeric Formats</h4>
<table><tr><th>Format</th><th>Example</th><th>Value</th></tr>
<tr><td>Decimal</td><td><code>42</code></td><td>42</td></tr>
<tr><td>Hex (H suffix)</td><td><code>0FFH</code></td><td>255</td></tr>
<tr><td>Char literal</td><td><code>'A'</code></td><td>65 (41H)</td></tr>
<tr><td>Current address</td><td><code>$</code></td><td>Address of current instruction</td></tr>
<tr><td>Expressions</td><td><code>OFFSET MSG + 3</code></td><td>Evaluated at assembly time</td></tr></table>

<h4>PATCALLS.INC Constants</h4>
<p><code>INCLUDE PATCALLS.INC</code> defines all port addresses and INT 28H function numbers as EQU constants, so you can write <code>OUT UPORT1, AL</code> instead of <code>OUT 90H, AL</code>.</p>
<table><tr><th>Constant</th><th>Value</th><th>Meaning</th></tr>
<tr><td><code>UCRREG1</code></td><td>80H</td><td>Control register 1</td></tr>
<tr><td><code>UMODEREG</code></td><td>86H</td><td>Port 2 mode (03H=DAC, 00H=ADC)</td></tr>
<tr><td><code>UPORT1CTL</code></td><td>88H</td><td>Port 1 direction (bit=1 &rarr; output)</td></tr>
<tr><td><code>UIRQEN</code></td><td>8AH</td><td>IRQ enable (bit 0 = Timer 1)</td></tr>
<tr><td><code>UPORT1</code></td><td>90H</td><td>Port 1 data</td></tr>
<tr><td><code>UPORT2</code></td><td>92H</td><td>Port 2 data</td></tr>
<tr><td><code>UTIMER1</code></td><td>94H</td><td>Timer 1 reload value</td></tr>
<tr><td><code>EXIT</code></td><td>04H</td><td>Return to monitor</td></tr>
<tr><td><code>WRCHAR</code></td><td>0CH</td><td>Write character in AL</td></tr>
<tr><td><code>WRBYTE</code></td><td>0DH</td><td>Write AL as hex</td></tr>
<tr><td><code>TONE</code></td><td>15H</td><td>Sound BX Hz for CX ms</td></tr>
<tr><td><code>CLRSCR</code></td><td>12H</td><td>Clear display</td></tr></table>`,

io_ports: `<h3>I/O Ports &amp; Peripherals</h3>

<h4>MUART 8256 Port Map</h4>
<table><tr><th>Port</th><th>Addr</th><th>R/W</th><th>Function</th></tr>
<tr><td><code>UCRREG1</code></td><td>80H</td><td>W</td><td>Control register 1 (clock select)</td></tr>
<tr><td><code>UCRREG2</code></td><td>82H</td><td>W</td><td>Control register 2</td></tr>
<tr><td><code>UCRREG3</code></td><td>84H</td><td>W</td><td>Control register 3</td></tr>
<tr><td><code>UMODEREG</code></td><td>86H</td><td>R/W</td><td>Mode: 00H=ADC input, 03H=DAC output</td></tr>
<tr><td><code>UPORT1CTL</code></td><td>88H</td><td>R/W</td><td>Port 1 direction (bit=1 &rarr; output)</td></tr>
<tr><td><code>UIRQEN</code></td><td>8AH</td><td>W</td><td>IRQ enable (bit 0 = Timer 1)</td></tr>
<tr><td><code>UIRQADR</code></td><td>8CH</td><td>R</td><td>IRQ address (read clears IRQ flag)</td></tr>
<tr><td><code>UPORT1</code></td><td>90H</td><td>R/W</td><td>Port 1 data (8-bit)</td></tr>
<tr><td><code>UPORT2</code></td><td>92H</td><td>R/W</td><td>Port 2 data (DAC output / ADC input)</td></tr>
<tr><td><code>UTIMER1</code></td><td>94H</td><td>W</td><td>Timer 1 reload value</td></tr></table>

<h4>Port 1 Bit Assignments (0x90)</h4>
<table><tr><th>Bit</th><th>Name</th><th>Dir</th><th>Function</th></tr>
<tr><td>PB0</td><td>EN</td><td>Out</td><td>DAC enable (active low)</td></tr>
<tr><td>PB1</td><td>WR</td><td>Out</td><td>ADC start conversion (falling edge)</td></tr>
<tr><td>PB2</td><td>BSY</td><td>In</td><td>ADC busy (0=converting, 1=done)</td></tr>
<tr><td>PB3</td><td>RD</td><td>In</td><td>ADC read enable (active low)</td></tr>
<tr><td>PB4</td><td>DSC</td><td>In</td><td>Disk encoder pulse (motor speed)</td></tr>
<tr><td>PB5</td><td>PZO</td><td>Out</td><td>Piezo sounder on/off</td></tr>
<tr><td>PB6</td><td>UTX</td><td>Out</td><td>Ultrasonic transmitter</td></tr>
<tr><td>PB7</td><td>URX</td><td>In</td><td>Ultrasonic receiver (0=object detected)</td></tr></table>

<h4>Peripherals</h4>
<table><tr><th>Peripheral</th><th>Control</th><th>Notes</th></tr>
<tr><td><strong>LED Bar (P1)</strong></td><td>PORT1 bits 0&ndash;7</td><td>8 LEDs, active when direction=output</td></tr>
<tr><td><strong>LED Bar (P2)</strong></td><td>PORT2 bits 0&ndash;7</td><td>Active in DAC mode (MODE=03H)</td></tr>
<tr><td><strong>DC Motor</strong></td><td>PORT2 (DAC)</td><td>MODE=03H; value 00&ndash;FF &rarr; 0&ndash;3000 RPM</td></tr>
<tr><td><strong>Potentiometer</strong></td><td>PORT2 (ADC)</td><td>MODE=00H; returns 0&ndash;255</td></tr>
<tr><td><strong>Piezo</strong></td><td>PORT1 bit 5</td><td>Toggle PZO, or use INT 28H TONE</td></tr>
<tr><td><strong>Ultrasonic</strong></td><td>PORT1 bits 6&ndash;7</td><td>UTX=transmit, URX=receive</td></tr>
<tr><td><strong>Optical Link</strong></td><td>PORT2 read</td><td>Blocked &rarr; attenuated value</td></tr>
<tr><td><strong>Timer</strong></td><td>UTIMER1 + UIRQEN</td><td>Fires IRQ2 (INT 25H) on overflow</td></tr></table>

<h4>ADC Read Sequence</h4>
<ol>
<li>Set <code>UPORT1CTL</code> direction bits</li>
<li>Set <code>UMODEREG</code> = 00H (ADC mode)</li>
<li>Write PORT1: WR bit high then low &rarr; starts conversion</li>
<li>Poll PORT1 bit 2 (BSY) until 1 (done)</li>
<li>Read PORT2 for the result (0&ndash;255)</li>
</ol>

<h4>DAC Write Sequence</h4>
<ol>
<li>Set <code>UMODEREG</code> = 03H (DAC mode)</li>
<li>Set <code>UPORT1CTL</code> = 0FFH (all output)</li>
<li>Write desired value to PORT2 (0&ndash;255)</li>
</ol>

<h4>PAT Monitor Calls (INT 28H)</h4>
<p>Set <code>AH</code> to the function number, then <code>INT 28H</code>.</p>
<table><tr><th>AH</th><th>Name</th><th>Action</th></tr>
<tr><td>04</td><td><code>EXIT</code></td><td>Halt &amp; return to monitor</td></tr>
<tr><td>0AH</td><td><code>RDCHAR</code></td><td>Read one character &rarr; AL</td></tr>
<tr><td>0CH</td><td><code>WRCHAR</code></td><td>Write character in AL to display</td></tr>
<tr><td>0DH</td><td><code>WRBYTE</code></td><td>Write AL as 2-digit hex</td></tr>
<tr><td>0EH</td><td><code>GETIN</code></td><td>Get key &rarr; AL (0xFF if none)</td></tr>
<tr><td>0FH</td><td><code>WT1MS</code></td><td>Wait 1 ms</td></tr>
<tr><td>10H</td><td><code>WTNMS</code></td><td>Wait BX milliseconds</td></tr>
<tr><td>11H</td><td><code>CRLF</code></td><td>Output newline</td></tr>
<tr><td>12H</td><td><code>CLRSCR</code></td><td>Clear display</td></tr>
<tr><td>15H</td><td><code>TONE</code></td><td>Piezo at BX Hz for CX ms</td></tr>
<tr><td>16H</td><td><code>NOTOFF</code></td><td>Stop piezo tone</td></tr></table>

<h4>Timer &amp; Interrupts</h4>
<ol>
<li>Write reload value to <code>UTIMER1</code> (94H)</li>
<li>Enable timer IRQ: <code>OUT UIRQEN, 01H</code></li>
<li>Set interrupt vector at <code>0000:0094H</code> (INT 25H = 25&times;4)</li>
<li><code>STI</code> to enable interrupts</li>
<li>Timer fires IRQ2 &rarr; INT 25H when countdown reaches 0</li>
</ol>
<p class="guide-note">Send <code>20H</code> to PIC (port 40H) at end of ISR to acknowledge the interrupt.</p>`
};
