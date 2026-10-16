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
- `Warning W03` with a real Prolific adapter on Windows. It was checked only with
  stubbed serial ports.

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
- `Warning W03` is shown like an error: in red in the status bar and in the
  banner above the editor that otherwise shows assembler errors. The status bar
  has no style for warnings.

### Files

- Files are kept only in this browser, on this computer, for this site.
  Another browser or computer does not have them, and the live site,
  `http://localhost:8000` and a copy opened from `file://` each keep their own.
  Two copies of workbench86 at different paths of one site share them. A
  private window keeps them until it is closed, and clearing the site data
  deletes them. Download what you need elsewhere, one file at a time or with
  Download all as zip.
- Safari deletes the files after seven days of Safari use in which the site was
  not opened (its tracking prevention clears a site's storage then). Safari
  users have no folder to fall back on, so a zip backup is their only copy.
- On a shared computer, the next person who opens workbench86 in the same
  browser sees your files. There is no sign-in and no way to hide them.
- Two workbench86 tabs share the files. When both change one file before
  either has saved it, the text saved second moves to `<name>-2` instead of
  replacing the other; nothing is merged. The open tabs are shared too, so a
  reload opens the tabs of whichever tab saved last. Without
  `BroadcastChannel` (Safari before 15.4) the tabs do not hear about each
  other, so a file changed in both becomes such a copy even when the changes
  were minutes apart.
- A folder bound to My files in one tab shows in another workbench86 tab only
  after that tab is reloaded.
- Without storage (site data blocked, some private windows), or after storage
  fails, the page works as v18 did and a reload loses everything; a line above
  the editor says so once. A tab that could not restore every saved file does
  not save until it is reloaded. Storage that has not answered after 3 seconds
  holds the page up that long; the saved files then come back when it answers.
- A copy made by editing an example can have the example's file name, such as
  `pa01-subtract-byte.asm`, but New and Rename still refuse every name an
  example uses.
- My files in a folder needs the File System Access API, so it works only in
  Chrome and Edge, and only where the browser keeps files, because the folder's
  handle and the copies of its files are kept there too. Only the folder's top
  level is listed, without hidden files, files over 1 MB or anything past the
  first 300.
- Changes other programs make in the folder are picked up only when the
  workbench86 window gets the focus again, or with Read the folder again.
- A file that is in the folder cannot be deleted from the page; delete it in
  Explorer or Finder. Edits reach the folder only with `Ctrl+S`.
- A file of the folder whose name a sample or a file kept in the browser
  already uses gets a separate internal name, such as `labs/fibonacci.asm`.
  Copy Path and the tab's tooltip show that name.
- Load files from a zip flattens the zip's folders, so two files with the same
  name in different folders become `name` and `name-2`. It loads at most 300
  files of 1 MB each, does not read a zip over 64 MB, and leaves out encrypted
  files and compression methods other than stored and deflated. Deflated files
  need a browser with `DecompressionStream` (Chrome and Edge 103, Firefox 113,
  Safari 16.4 or later).
- Download all as zip does not compress the files.

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
- The transpiler is deliberately restricted: no `if`/`else`, no user-defined
  functions, no nested control flow. Its register allocation can also collide
  with `CX`, which the generated delay loops use.
- At a window width of 1024 px or less the layout does not fit: the debug panel
  becomes narrow and the editor only a few lines high.

### Tooling

- There is no automated browser test suite. The engine is exercised by a
  headless harness and the example corpus; the user interface is checked by
  hand.
