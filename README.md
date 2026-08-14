# workbench86

Türkçe: [README.tr.md](README.tr.md)

workbench86 is the bench for the DIGIAC 2000 lab trainer, in a browser. You write 8086 real-mode assembly, run it in a simulator whose debugger steps backwards as well as forwards, watch the trainer board's I/O ports react, and upload the assembled bytes to the physical board over WebSerial.

Live demo: <https://natozenbilek.github.io/workbench86/>

![The workbench86 main window. The file explorer is on the left, an assembly program is open in the editor in the middle, and the debug panel on the right shows the general purpose registers, the segment registers and the flag row filled in after a few steps.](docs/screenshots/overview.png)

## Why this exists

The target board is the DIGIAC 2000 Microprocessor Training System from LJ Technical Systems, specifically its 80286 CPU card. In the lab that card is called "PAT". That is a local term used at Hacettepe University, not a name the vendor uses. The board is used in BBM436 Microprocessors Lab at Hacettepe University Computer Engineering, and at Istanbul Technical University.

The board is modular. A chassis holds the CPU card and a keypad and display module, and an Applications Module carries the peripherals: LEDs, a DC motor with an optical disc encoder, a potentiometer, an ADC and a DAC, an ultrasonic transmitter and receiver, an optical link and a piezo sounder.

The way you write for this board is Merlin, the command line assembler that comes with it. You write the program, assemble it, and deposit the bytes into the board's ROM monitor, which is also where `PATCALLS.INC` and the INT 28H call set come from. What Merlin does not give you is a view of the machine: there is no register or memory display while the program runs, no way to go back one instruction after you miss what happened, and no way to try anything at all without a physical board in front of you, which in practice means waiting for a lab session.

workbench86 puts a full IDE around the same workflow without changing it. It does not replace the board, and it does not replace Merlin's conventions either: a program written against `INCLUDE PATCALLS.INC` assembles here unchanged, so the existing lab material still works. The byte stream the simulator executes is the byte stream the upload sends, so the simulator is where you get a program right before it goes to hardware.

workbench86 is a single page application. There is no build step, no backend and no runtime dependency. It is about 5.8 kLOC of JavaScript across 32 files and 1.6 kLOC of CSS across 7 files, all vanilla. It runs from any static host, and most of it runs from `file://`.

## Quick start

Clone the repository and open `index.html`:

```bash
git clone https://github.com/natozenbilek/workbench86.git
cd workbench86
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

The editor, the assembler, the simulator and the debugger all work this way. Two things do not. The example corpus is loaded with `fetch`, which the browser blocks over `file://`, and WebSerial needs a secure context. For both, serve the directory over HTTP:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

Your first program:

1. In the Explorer, open `demos` and click `fibonacci.asm`.
2. Press `Ctrl+Enter` to assemble and load it.
3. Press `Step` to execute one instruction. The Current instruction card at the top of the debug panel shows the mnemonic and the registers that changed.
4. Hold `Run` at 20 Hz to watch the sequence build up in the registers.
5. Press the left arrow button to step back. Registers, memory, ports and peripheral state all rewind together.

## Feature tour

### Editor

Multi tab, with the open file tracked per tab. Syntax highlighting for assembly and for the five languages the transpiler reads. Hovering a mnemonic or a register shows what it does. Find and replace is on `Ctrl+F` and supports regular expressions. The command palette on `Ctrl+Shift+P` reaches every action by name. Ghost completion suggests a label or directive at the cursor, and `Tab` accepts it. The undo stack is the editor's own, not the browser's.

### Debug panel

![The workbench86 debug panel. Cards for the current instruction, the general purpose and segment registers, the control registers, the flag row, the stack around SS:SP and a hex and ASCII memory view are stacked in a single scrolling column.](docs/screenshots/debugger.png)

The right hand panel is a column of collapsible cards.

| Card | Contents |
|---|---|
| Current instruction | Mnemonic, a plain description of the effect, and the register diff for the step just taken |
| General purpose registers | AX through DI, with the high and low bytes and their ASCII shadow |
| Segment registers | CS, DS, SS, ES |
| Control | IP, FLAGS as hex, and the 20 bit physical address |
| Flags | OF, DF, IF, TF, SF, ZF, AF, PF, CF |
| PAT Display | INT 28H output, drawn as a 7 segment display |
| Stack | Words around SS:SP, with the current SP marked |
| Memory | Hex and ASCII view at an address you type, or following CS:IP or SS:SP |
| Execution Trace | The last retired instructions with their register diffs |
| Watch | Expressions such as `AX`, `DS:1000`, `[SI]` or a label |
| I/O Log | The recent IN and OUT operations, with a timeline strip above them |

### Run controls

Assemble is `Ctrl+Enter` or the button. Step, step back and step forward are single instruction moves. Run and Pause toggle free running at 5, 20, 100 or 500 Hz, or as fast as the browser allows. Reset restores the initial state. Clicking a line number sets a breakpoint.

### Export and import

The Export dialog shows the assembled bytes as a hex dump, copies them to the clipboard or downloads them as a file. It also imports a hex dump, either Intel HEX or the plain `addr: bb bb bb` form, which loads a program into the simulator without going through the assembler.

## How the assembler works

The assembler reads Intel mnemonic syntax and produces one flat byte image. Labels are resolved by running the encoding pass again until no address moves, up to eight passes, so a forward reference that shortens an instruction settles instead of producing a wrong offset.

Directives: `ORG`, `EQU`, `DB`, `DW`, `END` and `INCLUDE PATCALLS.INC`. Expressions accept `OFFSET`, `BYTE PTR` and `WORD PTR`, the location counter `$`, and arithmetic on labels and constants.

Addressing modes: register, immediate, direct `[disp16]`, register indirect, based, indexed and based plus indexed, each with an optional segment override and an optional size qualifier.

`INCLUDE PATCALLS.INC` defines the port addresses and the INT 28H function numbers as constants, so a program can write `OUT UPORT1, AL` instead of `OUT 90H, AL`. The file is built into the assembler and is not read from disk.

## How the simulator works

The CPU model is 8086 real mode with a 1 MB memory image, the full register file, and FLAGS computed properly, including AF and OF on the arithmetic instructions. String operations run under the `REP`, `REPE`, `REPZ`, `REPNE` and `REPNZ` prefixes. Interrupts are taken from the modelled controller when IF is set.

Reverse execution is exact, not approximate. Before each step the engine captures the registers, the port array, the peripheral state and the interrupt state, and hands the memory undo journal to that snapshot. The journal records the byte that was at an address before the first write since the previous snapshot, one entry per address, so undoing a step means replaying that journal. Stepping forward again works the same way in reverse, which is why memory comes back byte for byte in both directions. The history is 500 steps deep. Older steps are dropped as new ones arrive.

### Instruction coverage

Implemented:

- Data movement: `MOV`, `XCHG`, `PUSH`, `POP`, `PUSHA`, `POPA`, `PUSHF`, `POPF`, `LEA`, `IN`, `OUT`, `XLAT`, `CBW`, `CWD`, `LAHF`, `SAHF`, and `PUSH` and `POP` of the segment registers.
- Arithmetic: `ADD`, `SUB`, `ADC`, `SBB`, `INC`, `DEC`, `NEG`, `CMP`, `MUL`, `IMUL`, `DIV`, `IDIV`, and the BCD and ASCII adjust instructions `DAA`, `DAS`, `AAA`, `AAS`, `AAM`, `AAD`.
- Logic, shifts and rotates: `AND`, `OR`, `XOR`, `NOT`, `TEST`, `SHL`, `SAL`, `SHR`, `SAR`, `ROL`, `ROR`, `RCL`, `RCR`.
- String operations: `MOVS`, `STOS`, `LODS`, `CMPS` and `SCAS` in byte and word forms, with the repeat prefixes.
- Near control flow: `JMP`, the conditional jumps, `JCXZ`, `LOOP`, `LOOPE`, `LOOPZ`, `LOOPNE`, `LOOPNZ`, `CALL`, `RET`, `INT`, `IRET`.
- Flag control: `CLC`, `STC`, `CMC`, `CLD`, `STD`, `CLI`, `STI`.
- Prefixes: the segment overrides `CS:`, `DS:`, `ES:` and `SS:`.
- Also `NOP` and `HLT`.

Not implemented:

- Far `CALL`, far `JMP` and far `RET`.
- Protected mode.
- The FPU.

## Ports and peripherals

The Intel 8256 MUART is modelled at ports 0x80 to 0x9E. The interrupt controller sits below it at 0x40 and 0x42.

| Port | Symbol | Access | Function |
|---|---|---|---|
| 0x40 | `PIC0` | W | Interrupt controller command. Writing 0x20 clears the pending request. |
| 0x42 | `PIC1` | W | Interrupt controller mask. |
| 0x80 | `UCRREG1` | W | Control register 1. Also selects the timer clock. |
| 0x82 | `UCRREG2` | W | Control register 2. |
| 0x84 | `UCRREG3` | W | Control register 3. |
| 0x86 | `UMODEREG` | R/W | Port 2 mode. 0x00 is ADC input, 0x03 is DAC output. |
| 0x88 | `UPORT1CTL` | R/W | Port 1 direction, one bit per line. A 1 makes that line an output. |
| 0x8A | `UIRQEN` | W | IRQ enable. Bit 0 enables timer 1. |
| 0x8C | `UIRQADR` | R | IRQ acknowledge. Reading it clears the pending request. |
| 0x90 | `UPORT1` | R/W | Port 1 data. Bit map below. |
| 0x92 | `UPORT2` | R/W | Port 2 data. DAC value on write, ADC result on read. |
| 0x94 | `UTIMER1` | W | Timer 1 reload value. Writing it restarts the count. |
| 0x9E | `USTATUS` | R | Status register. |

`PATCALLS.INC` also defines `URCVBUF` at 0x8E and `UTIMER2` through `UTIMER5` at 0x96, 0x98, 0x9A and 0x9C. The assembler accepts those names and a write to them lands in the port array, but nothing in the model reacts to them.

### Port 1 bit assignments

| Bit | Name | Driven by | Function |
|---|---|---|---|
| 0 | `EN` | program | DAC enable, active low. The model does not consult this bit. The DAC path is gated by the mode register at 0x86 instead. |
| 1 | `WR` | program | ADC start. A 1 to 0 transition begins a conversion. |
| 2 | `BSY` | model | ADC busy. Reads back high once the conversion has finished. |
| 3 | `RD` | program | ADC read enable, active low. Port 2 returns the converted value while this bit is low. |
| 4 | `DSC` | model | Optical disc encoder pulse. Toggles at a rate set by the DAC value, so a program can count motor revolutions. |
| 5 | `PZO` | program | Piezo sounder. A change on this bit starts or stops the tone. |
| 6 | `UTX` | program | Ultrasonic transmitter trigger. |
| 7 | `URX` | model | Ultrasonic receiver. Reads low only when the transmitter is on and an object is in range, otherwise high. |

The direction register at 0x88 decides which side wins on a read. Bits marked as outputs read back from the output latch. The rest read the value the model supplies.

### Interrupts

| Source | INT | Vector address |
|---|---|---|
| External IR0 | 20H | 0000:0080H |
| External IR1 | 21H | 0000:0084H |
| Timer 1 underflow, IR2 | 25H | 0000:0094H |
| PAT monitor call | 28H | 0000:00A0H |

A request whose vector is still empty is left pending rather than taken, the way a real controller holds its request line until it is acknowledged. A handler installed later still gets serviced, and a lower numbered request that does have a handler is not starved by the one that does not.

### Modelled peripherals

The LEDs are the bit patterns driven on port 1 and port 2. The DC motor takes the DAC value on port 2 while the mode register holds 0x03, and its encoder produces pulses on the `DSC` line. The potentiometer supplies the ADC reading returned on port 2 in mode 0x00. The optical link, when blocked, attenuates that reading. The ultrasonic pair behaves as described in the bit table. The piezo drives a WebAudio oscillator, so it makes real sound, and `INT 28H` with `AH=TONE` sets its frequency and duration. Timer 1 counts down and raises IR2 on underflow. Browser keypresses feed a queue that `INT 28H` with `AH=GETIN` drains.

Peripheral state is read through the I/O Log and its timeline, the PAT Display card, and the Ports dialog, which reads and writes the MUART registers directly. There is no graphical panel that draws the Applications Module.

## Hardware bridge

The bridge sends the assembled bytes to the board over WebSerial and starts them there. The serial parameters are 9600 baud, 8 data bits, no parity, 2 stop bits.

Two upload paths exist because lab boards carry two incompatible ROM monitor revisions. One deposits bytes one at a time through the monitor's `C` command and leaves memory edit mode with `ESC` followed by `CR`. The other sends Intel HEX records, for boards that answer `L`. A program with more than one `ORG` is deposited as separate contiguous segments, so the zero fill between two far apart origins is never transmitted.

Once the program is running on the board, the debug panel stops updating. That is expected. Execution has moved to the board's own CPU, and no register or memory state comes back over the wire. Debug in the simulator, then upload.

The full procedure is in [docs/hardware-guide.md](docs/hardware-guide.md): the adapter you need, the secure context requirement, the connect sequence, what each monitor command does, load addresses, the link probes and a troubleshooting table. Go there when the board does not respond.

![The MUART port dialog in workbench86. The trainer's control, port, timer and status registers are listed by symbolic name next to their port addresses, each with an editable byte value, and buttons to read the current values or write them back.](docs/screenshots/hardware.png)

Chromium family browsers only. Firefox and Safari can run everything else but cannot upload.

## Transpiler

The transpiler turns small C, C++, Python, Java and Go snippets into assembly, so a student can see the same loop in both forms. It reads variable declarations, `for` and `while` loops, port calls such as `outport(PORT2, x)` and `port_init(...)`, `delay_ms()`, shifts and simple arithmetic, and emits a listing with `ORG 0100H` and `INCLUDE PATCALLS.INC` at the top.

It is not a compiler. There is no `if` or `else`, no user defined functions, and no nested control flow. It exists to make the mapping from a loop in a high level language to a loop in assembly visible, and it stops there.

## Example corpus

52 assembly programs ship with the tool, in four folders.

`examples/assignments/` holds 28 lab assignments, numbered PA01 to PA29 with PA18 absent. They follow the lab schedule: byte arithmetic and register copies, memory fills and string copies, comparisons and bit inspection, LED output, the motor disc counter, ultrasonic proximity, the potentiometer driving the motor, stack operations, the hex display, the piezo, the keypad organ, and finally interrupt vectors, the IR2 counter, the timer and motor speed on the display.

`examples/demos/` holds 9 algorithm programs: bubble sort, Fibonacci, factorial, string reversal through the stack, block copy with `REP MOVSB`, memory fill with `REP STOSB`, a `CALL` and `RET` demonstration, hex to ASCII on the display, and a countdown.

`examples/hardware/` holds 9 device level sketches, mostly LED patterns (blink, chase, knight rider, dice, all on, all off), plus a binary counter, a serial hello through `INT 28H`, and a piezo beep.

`examples/scripts/` holds 6 probes written while bringing the hardware bridge up: a display test, a keyboard and display test, a piezo test, a port bit scanner and two manifest programs.

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Ctrl+Enter` | Assemble and load |
| `Ctrl+Z` / `Ctrl+Y` | Undo / redo |
| `Ctrl+F` | Find and replace |
| `Tab` | Insert a tab, or accept the ghost completion |
| `Ctrl+Shift+P` | Command palette |
| `F1` | ISA reference guide |
| `?` | Keyboard shortcut list |
| `Escape` | Close the open dialog or panel |
| `Alt+1` / `Alt+2` / `Alt+3` | Focus the explorer, the editor, the debug panel |
| Up and down arrows | Move through files, or scroll the focused panel |
| `Enter` | Open the selected file |
| Click a line number | Toggle a breakpoint |

## Directory layout

```
workbench86/
├── index.html                    entry point, loads every script
├── core/
│   ├── cpu/
│   │   ├── core.js               memory, registers, snapshots, undo journal
│   │   ├── decode.js             fetch, ModR/M, string operations
│   │   ├── alu.js                ALU and condition tests
│   │   ├── exec.js               opcode dispatch
│   │   └── int28.js              PAT monitor calls
│   ├── assembler/
│   │   ├── parser.js             lines, expressions, directives, passes
│   │   └── encoder.js            instruction encoding
│   ├── io/
│   │   ├── state.js              port map, peripheral state, timer, audio
│   │   └── ports.js              IN and OUT handlers
│   └── transpiler/
│       ├── compiler.js           high level language to assembly
│       └── bridge.js             UI glue
├── app/
│   ├── main/                     editor.js, sim.js
│   ├── render/                   core.js, io.js
│   ├── editor/                   tooltips.js, features.js
│   ├── files/                    core.js, tree.js
│   ├── panels/                   layout.js, display.js
│   ├── highlighter/              render.js, constants.js
│   ├── guide/                    data.js, ui.js
│   ├── serial/                   core.js, upload.js
│   ├── ui/                       command palette, search, resize, keyboard nav
│   └── examples.js               loads the example manifest
├── styles/                       7 stylesheets, no preprocessor
├── examples/                     52 .asm programs plus manifest.json
│   ├── assignments/
│   ├── demos/
│   ├── hardware/
│   └── scripts/
├── tests/                       headless engine tests, run.sh
└── docs/
    ├── KNOWN_ISSUES.md           what is fixed and what is still open
    ├── hardware-guide.md         board connection and troubleshooting, English
    ├── lab-hizli-kullanim.md     lab quick start, Turkish
    └── screenshots/
```

## Browser support

| Browser | Simulator | WebSerial upload |
|---|---|---|
| Chrome 89 and later | Yes | Yes |
| Edge 89 and later | Yes | Yes |
| Other Chromium browsers such as Opera and Brave | Yes | Yes, if the build keeps the Web Serial API |
| Firefox | Yes | No, the API is not implemented |
| Safari | Yes | No, the API is not implemented |

WebSerial also needs a secure context, so upload works over `https://` or `http://localhost` but not from `file://`.

The layout is three columns and assumes a desktop width. It is usable on a tablet and cramped on a phone.

## Testing

The engine is exercised by a headless harness that concatenates the files under `core/` and runs them outside the browser, so the assembler and the CPU can be driven without a page, a DOM or a device:

```bash
./tests/run.sh
```

Two suites. One is a differential check of results and flags against hand computed 8086 values, plus a pinned case for every defect that differential testing has found so far. The other walks the example corpus and requires all 52 programs to assemble and run without reaching an unknown opcode. Details are in [tests/README.md](tests/README.md).

Nothing under `app/` is covered, so the editor, the panels and the serial bridge are still checked by hand. There is no automated browser test suite.

workbench86 has also been tested on the physical board in the lab by a student other than the author. That session is how a bug in the program load path was found, one that only appeared with programs whose `ORG` was not the default address. It is fixed.

## Known limitations

- WebSerial is Chromium only. Firefox and Safari can run the simulator and everything around it, but cannot upload to a board.
- `INCLUDE` accepts only `PATCALLS.INC`. Any other include path is ignored without an error.
- The transpiler is deliberately restricted. No `if` or `else`, no user defined functions, no nested control flow.
- Editor contents are not persisted. Reloading the page loses whatever is in the tabs.
- Far `CALL`, far `JMP` and far `RET` are not implemented, and neither are protected mode or the FPU. The CPU model is a real mode subset.
- Reverse debugging is capped at 500 steps. Beyond that the oldest steps are gone and you have to reset and run again.
- There is no automated browser test suite.
- There is no graphical panel for the Applications Module. Peripheral state is read through the I/O Log, the Ports dialog and the PAT Display card.
- While a program runs on the board, the debug panel shows nothing. The board sends no state back.

## Contributing

Issues and pull requests are welcome. The project is plain ES2017 JavaScript and plain CSS with no build step, no bundler and no framework, and it stays that way.

A few conventions worth knowing before you start:

- Two space indent, single quoted strings, functions at module level scope.
- A new peripheral needs a port handler in `core/io/ports.js`, its backing state in `core/io/state.js`, and an entry in the port documentation in `app/guide/data.js`.
- A new instruction needs a case in `core/cpu/exec.js`, encoding in `core/assembler/encoder.js`, a tooltip in `app/editor/tooltips.js`, and a row in `app/guide/data.js`.
- Assemble and run the example corpus before pushing. It is the regression suite.

Longer notes are in [CONTRIBUTING.md](CONTRIBUTING.md). For anything larger than a one file patch, open an issue first.

## Acknowledgements

workbench86 was built for the Microprocessors laboratory (BBM436) in the Department of Computer Engineering at Hacettepe University. My thanks to Assoc. Prof. Dr. Harun Artuner, who teaches the course, for setting the problem and for his guidance while I worked on it. The design and the implementation are my own.

The port map, the INT 28H call set and the C command upload protocol were reconstructed by observing the board's own ROM monitor. The Intel 8086 user's manual and the Intel 8256 MUART datasheet were the reference for the instruction and peripheral semantics.

## License

MIT. See [LICENSE](LICENSE).
