# Known issues

This is a living list of what is known to be wrong, missing or not yet verified
in workbench86. It replaces the older self-assessment (`docs/ANALYSIS.md`), which
claimed the project had no serious defects. That claim was not true: a later
review reproduced several defects with a headless harness. Fixed defects are no
longer listed here; they are in `CHANGELOG.md`, and each engine fix has a pinned
test in `tests/engine.test.js`.

Entries are not ranked by severity. If you hit something that is not listed here,
please open an issue with a minimal reproduction.

## Not yet seen on a board

The upload path changed in v18. It was checked with an offline harness that
models the PAT monitor, not on a real board. The April 2026 build, the last one
seen working on a board, sent only `C 0080:0100` and `G 0080:0100`. Still to be
confirmed with a board:

- `C 0080:<ORG>` and `G 0080:<ORG>` for an ORG other than 0100H.
- Multi-ORG programs, uploaded as one `C 0080:...` block per segment.
- The `T 0080:xxxx` form sent by the terminal's T button.
- The check that stops an upload when the board prints `PAT:`, `ERROR` or a form
  feed in change-memory mode. It assumes the monitor never prints those there.
- Text on the keypad display through `INT 28H` `WRITE` with `BL=DKD`
  (`docs/hardware-guide.md`, section 7.3).
- Lighting the 7-segment display by writing 7-segment codes into `KYDBUF`
  (`0000:047D`). While the board is connected, `INT 28H` `WRCHAR` text goes to
  the serial terminal instead (observed on a board in April 2026).
- Recovery from serial line errors (`Warning W01`) on the students' own USB
  adapters. The failure and the fix were reproduced only with the offline
  harness.
- The pitch of each key in `examples/assignments/pa24-organ-keypad.asm`. The
  simulator plays the same fixed tone for every key.

## Still open

### Hardware

- The address of the keypad and display controller on the physical board has
  not been identified. Several probe programs ship under `examples/scripts/`
  instead of one supported path.
- Live per-port forwarding to the physical board is not implemented. The
  supported hardware path is program upload (Upload and Run), not a live port
  bridge while the simulator runs.
- The Intel HEX upload path (`L`, `/t1`) has no button and is called from the
  browser console. It assumes `ORG 0100H` and sends `G 0100` without the
  `0080:` segment.

### Assembler

These lines assemble without an error, but the bytes are not what the source
says. No shipped example uses them.

- A shift or rotate count other than 1 or `CL` is assembled as a count of 1:
  `SHL AL,2` gives `D0 E0`, which is `SHL AL,1`. The 80286 on the board has
  the immediate-count form. The transpiler turns `x = x << n` into such a
  line, so a translated program shifts by 1 too.
- Two- and three-operand `IMUL` is assembled as one-operand `IMUL`:
  `IMUL BX,CX` gives `F7 EB`, which is `IMUL BX`.
- Operands beyond the ones an instruction takes are ignored: `ADD AX,BX,CX`
  gives `ADD AX,BX`, and `INC AX,BX` gives `INC AX`.
- `DUP` is not supported: `DB 4 DUP(0)` gives the single byte `04`.
- A `B` suffix is read as a hex digit, not as binary: `MOV AL,10110B` loads
  `0BH`.
- The operator keywords `AND`, `OR`, `SHL` and `MOD` are not evaluated inside
  an expression: `MOV AL,0FH AND 3` loads `0FH`.
- `BYTE PTR` on the memory operand of `MUL`, `IMUL`, `DIV`, `IDIV`, `NOT`,
  `NEG`, a shift or a rotate is ignored and the word form is assembled:
  `MUL BYTE PTR [BX]` gives `F7 27`, which is `MUL WORD PTR [BX]`. `INC`,
  `DEC` and `MOV` honour it.

The assembler rejects these with an error:

- `LDS`, `LES`, `INTO`, `LOCK`, `WAIT` and `ESC`.
- Indirect `JMP` and `CALL` through a register or memory (`JMP BX`,
  `CALL [BX]`), which fail with `Unknown label`. The CPU model executes those
  opcodes (`FF /2` and `FF /4`); only the assembler lacks them.
- `JMP SHORT label`, and `XCHG` with a memory operand.
- The aliases `XLATB`, `JPE` and `JPO` (`XLAT`, `JP` and `JNP` work).
- The 80186 and 80286 additions other than `PUSHA` and `POPA`: `ENTER`,
  `LEAVE`, `BOUND`, `PUSH` with an immediate, `INSB`/`INSW` and
  `OUTSB`/`OUTSW`.

### Simulator

- Only Step records history. Run, at any speed, adds nothing to Back or to
  the Execution Trace, so after a Run, Back returns to the state before the
  last Step, not to a point inside the run.
- Import reads only the `addr: bb bb bb` form that Export writes. Intel HEX
  records are not decoded: a `:LLAAAATT...` line has its colon first, so its
  length, address, type and checksum bytes are loaded as data at `0080:0000`.
- Import sets IP to 0100H but does not count as an assembled program. On a
  fresh page Step and Run then answer `No program assembled.` and `No
  program.`, and Reset assembles the editor text over the imported bytes.
- Export dumps only the addresses from the first instruction to 8 bytes past
  the start of the last one. Data outside that range, such as a table after
  the code or a separate data `ORG`, is left out.
- The Watch box suggests `DS:1000`, but a segment register name before the
  colon is not understood and the value shows as `?`. A numeric segment works:
  `0080:1000`.
- The PIC mask written to port 42H is stored but ignored: every enabled
  request is serviced. The timer clock select written to port 80H is ignored
  too.
- The Applications Module inputs have had no controls since v15: the
  potentiometer always reads 80H, nothing is ever in front of the ultrasonic
  pair, and the optical link is never blocked.
- Only timer 1 raises an interrupt request. IR0 and IR1 have vectors, but
  nothing in the simulator raises them.
- The piezo plays a fixed 1 kHz tone while `PZO` is high, so a pitch made by
  toggling `PZO` at audio rate (the Manifest songs, pa24) is not reproduced.
- After Assemble, SS is 0080 and SP FFF0. On the board SS was 0F80 and SP 0800
  (`docs/hardware-guide.md`, section 6), so stack behaviour can differ.

### Example programs

- `examples/assignments/pa26-irq2-counter.asm` installs an `INT 22H` vector
  (`0000:0088`), which it uses for IR2, pointing at `0080:0800`, but the
  program loads nothing at that address. An IR2 interrupt on a board would run
  whatever is in that memory. In the simulator IR2 is `INT 25H`
  (`0000:0094`), so this vector is not used there either.

### Not implemented

- Far `CALL`, far `JMP` and far `RET`. The CPU model is real mode only; there
  is no protected mode.
- No FPU.

### Limitations

- The simulated MUART timer counts executed instructions (one tick per 50), not
  time, so even at Max it does not follow real time. Below Max, timer programs
  and loops paced with `WTNMS` take minutes; the status bar says so when such a
  program is run below Max.
- `INT 28H` `TONE` (15H) and `NOTOFF` (16H) work only in the simulator. The PAT
  monitor does not support them, so a program for the board toggles the piezo
  through `UPORT1`.
- `INCLUDE` accepts only `PATCALLS.INC`, because the PATCALLS constants are built
  into the assembler rather than read from a file. Any other `INCLUDE` line is an
  assembler error (`Unknown instruction: INCLUDE`).
- Nothing you write is kept across a page reload: the open tabs and the files
  in My files are lost. Only the theme and the panel widths are remembered.
  Save your work to disk before closing the tab (Download button in the
  Explorer, or Ctrl+S).
- The transpiler is deliberately restricted: no `if`/`else`, no user-defined
  functions, no nested control flow. Its register allocation can also collide
  with `CX`, which the generated delay loops use.
- At a window width of 1024 px or less the layout does not fit: the debug panel
  becomes narrow and the editor only a few lines high.

### Tooling

- There is no automated browser test suite. The engine is exercised by a
  headless harness and the example corpus; the user interface is checked by
  hand.
