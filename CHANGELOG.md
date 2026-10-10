# Changelog

All notable changes to workbench86 are documented in this file.
The format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
the project adheres to incremental versioning (v1, v2, ... vN) rather than
semantic versioning, because each version corresponds to a single deployed
build of the static asset.

The version is the build number. It is in the `?v=N` query strings of
`index.html`, in the first line of the terminal's Copy log and on the first
card of the How to use page. The public git history is shorter than this file
and has no tags: its first commit ("workbench86: the bench for the DIGIAC 2000
lab trainer, in a browser", 2026-08-14) carries v17, and the commit named "v2"
(2026-10-10) carries v18. Builds before v17 are not in the public history.

## v18 (2026-10-10)

Board verification of the new upload path is still pending. The upload and
serial changes below were checked with the offline harness, which runs this
build's code against a modelled PAT monitor, and in Chrome against a fake serial
port, not on a real board.

### Upload and the serial link
- Every failure the page can detect now carries a short code in the terminal
  and the status bar (`Error U01`, `Error C04`, `Warning W01`, ...), so a report
  from the lab says where it stopped. The codes and what to do are listed in
  docs/hardware-guide.md and docs/lab-hizli-kullanim.md. Copy puts one line in
  front of the log: build version, browser, last code and last upload.
- Error C07 (added 2026-10-16): on Windows, when a Prolific PL2303 adapter (USB
  vendor 067B) is listed but does not open, the page says it is most likely
  the driver refusing the chip, not a busy port, and what to do. Several
  groups hit this in the lab on 2026-10-16; `chrome://device-log` showed
  `Failed to open serial port: FILE_ERROR_FAILED`.
- When some bytes of an upload got no reply, the terminal says how many
  (`Warning W02`) instead of leaving only `[!]` marks in the byte stream.
- Restored the segment prefix of the April 2026 build: every `C` and `G` of
  Upload and Run, and the terminal's G button, now send `C 0080:hhhh` and
  `G 0080:hhhh`. The prefix was added on 2026-04-09 while testing on a real
  board, after the monitor's segment was seen at FFFF following some resets. It
  was lost in the module split of 2026-04-11 and was missing from v14 to v17.
  In the offline harness the bytes sent for an ORG 0100H program are again
  identical to that build's; for another ORG only the address digits differ.
- The terminal's T button sends `T 0080:` and the ORG of the last upload instead
  of always `T 0100`. G and T use the ORG of the last upload, not that of
  whichever program is open.
- Upload and Run assembles the code in the editor itself. With assembler errors,
  or from a tab that is not `.asm`, it sends nothing and says why.
- One job at a time on the line. Upload, G, T, Send and the console helpers share
  a busy flag; while it is set the Upload button shows `Uploading n/N` or
  `Waiting for PAT:` and is disabled, and the others refuse. Disconnect stops a
  running job at once. Leaving the page during an upload asks first.
- A program that keeps running after `G` is no longer reported as
  `--- G TIMEOUT ---`. The terminal says it is running on the board and asks for
  PAT RESET before the next upload, and the page reports `Board is back at PAT:`
  when the prompt returns. An `ERROR` line after `G` is reported as a failure.
- When the first CR LF gets no `PAT:`, nothing else is sent and the message says
  to press PAT RESET.
- The upload stops without `G` when the board leaves change-memory mode part way
  through (PAT RESET pressed, or an error).
- Serial line errors (`BreakError`, `FramingError`, `ParityError`,
  `BufferOverrunError`) no longer stop the read loop. They are printed in the
  terminal and reading goes on. Earlier builds stopped reading at the first such
  error while still showing "connected". That is the most likely cause of the
  "serial port error" reported in the October 2026 lab, but it was reproduced
  only offline. A lost link now disconnects with
  `Board link lost`, a port that cannot be opened gets a message naming the
  likely cause, and a write error stops the job.
- Trimming the receive buffer in a long session no longer produces false `[!]`
  markers or false aborts. The buffer is cleared on connect.
- Multi-ORG uploads wait 200 ms before each later `C`.
- `probeDisplay()` ends with EXIT again, as in the April 2026 build.

### Simulator
- Board mode: while a board is connected the debug panel is locked, with a banner,
  Step, Run, Reset and the speed menu disabled, and the header pill showing
  BOARD, UPLOADING or BOARD RUNNING. Connecting stops a running simulation and
  the Ports dialog is blocked. Disconnect or Simulate anyway unlocks; the next
  Upload locks again.
- Enter put 0DH and then a stray `E` (45H) into the keyboard queue read by
  `GETIN`. It now puts only 0DH.
- The PAT Display card starts open. Enter in the Memory address box does what the
  View button does.
- Running a program that uses the MUART timer or `WTNMS` below Max speed shows a
  hint in the status bar. The default speed is unchanged.
- `MOV mem,imm` dropped an explicit `DS:` on BP-based addresses, so on the board
  (SS=0F80, DS=0080) the byte went to the stack segment.
- The Current instruction card shows `(none)` before the first step instead of a
  dash. An emptied I/O log shows `No I/O activity yet.`, as it does on load.

### Editor and files
- The welcome screen, shown when no tab is open, has three buttons: New file,
  Open a file from this computer, and Start with assignment PA01. The Open
  dialog also accepts `.inc` files.
- Ctrl+Z acts only in the editor, and switching tabs starts a fresh undo history.
  Before, undo in one tab could write another tab's text into it. Ctrl+F also opens the find
  bar only from the editor.
- Explorer: a toolbar with New, Open and Download, a My files folder, per-row
  Rename, Delete, Download and Copy buttons, context menus, F2 and Del, and
  keyboard navigation that no longer captures Enter in the editor. Ctrl+S
  downloads the open file under its real file name.
- Clicking your own file in the tree no longer resets it to its template. Close,
  Close All and Close Others ask before discarding edits, and Close Others no
  longer reverts the active tab.
- Translate to ASM opens the generated `.asm` tab and assembles it there.

### How to use page
- A new page at `howto/`: a step-by-step guide in 57 cards, in Turkish and
  English, with screenshots and diagrams. It covers serial basics (RS-232, TX
  and RX, 9600 8N2), working in the simulator, uploading to the board (PAT
  RESET, a fresh `PAT:`, `C` and `G` with the 0080 segment and the address
  arithmetic), board mode and the error codes.
- The app header links to it as **How to use**. At a window width of 1024 px or
  less it is the first item of the overflow menu; on wider screens the overflow
  button is hidden, because Ports, Export and Guide are already shown.
- The TR | EN switch is remembered by the browser, and `?lang=tr` or `?lang=en`
  in the address picks the language. The page opens in the app's theme.
- **Present** (or the F key) shows one card at a time, full screen. The arrow
  keys, Page Up and Page Down, Home and End move between cards; on a touch
  screen, a tap or a sideways swipe.
- Speaker notes, in Turkish only, are shown when the address has `?notes`.
- The page ships its own fonts, Atkinson Hyperlegible Next and JetBrains Mono,
  under the SIL Open Font License 1.1 (`howto/fonts/FONTS.md`), so it looks the
  same offline.

### Appearance
- Larger type: no visible text is below 12px (it was 8px to 11px in places), with
  font fallbacks for Windows lab PCs. Checked text reaches a contrast of 4.5:1 or
  more in both themes. Header tooltips open below the buttons.
- Bumped the cache-busting query string in `index.html` from `?v=17` to `?v=18`.

### Documentation
- `docs/hardware-guide.md` and `docs/lab-hizli-kullanim.md` describe the new
  messages, the `0080:` forms, board mode, PAT RESET before every upload, and what
  to do after a serial port error. The READMEs describe board mode and the new
  shortcuts. The ISA guide and the hardware guide carry the April 2026 board notes:
  the `WRITE` call to the keypad display through `INT 28H` (not checked on a
  board), `KYDBUF`, and registers clobbered by `INT 28H`.
- Corrected the ERROR 30 explanation in the hardware guide. Loading at 0100H did
  not by itself make `G` run empty memory; the recorded cases were interrupt
  vectors set to the handler's ORG (pa28, pa29) and `G` to an ORG where nothing
  was loaded.
- `docs/KNOWN_ISSUES.md` now lists only open items, including what still needs a
  board and the pa26 vector that points at unloaded memory.
- The ISA guide, the READMEs and `docs/KNOWN_ISSUES.md` mark `TONE` (15H) and
  `NOTOFF` (16H) as simulator only. The PAT monitor does not support them; on the board the piezo is toggled
  through `UPORT1`, as the manifest songs do.
- The hardware guide, the ISA guide and the lab handout add two more April 2026
  board observations. While the board is connected to the PC, `INT 28H` `WRCHAR`
  text goes to the serial terminal, not to the 7-segment display; a way to light
  the display through `KYDBUF` is still unconfirmed. The monitor resets the MUART
  ports on EXIT, so LEDs go off when a program exits.
- Dashes in UI text, log lines, comments, example headers and docs were replaced
  with colons, commas or parentheses. Ranges read `0 to 255`.
- Correction to v15: see the note under v15 below.
- Documentation pass of 2026-10-16. Apart from Error C07 above, the app's
  behaviour did not change and the build is still v18:
  - `README.md` and `README.tr.md` brought up to date with v18, with new
    screenshots.
  - `docs/KNOWN_ISSUES.md`: lines the assembler accepts but encodes wrongly
    (shift and rotate counts other than 1 or `CL`, two- and three-operand
    `IMUL`, extra operands, `DUP`, binary literals, operator keywords,
    `BYTE PTR` on `MUL`, `DIV`, `NOT`, `NEG`, shifts and rotates) and the
    forms it rejects; the import and export limits; Run not recorded for Back;
    the Watch `DS:` form; the ignored PIC mask; the fixed peripheral inputs;
    IR0 and IR1 never raised; the fixed piezo tone; the simulator's SS and SP
    against the board's; the console-only Intel HEX path; two more items to see
    on a board; My files lost on a reload; the pa26 vector in the simulator.
  - `docs/hardware-guide.md`: a link to the How to use page, the browser
    requirement as the code checks it, the Intel HEX path's `G 0100` without a
    segment, what Copy copies, and the keypad item reworded.
  - `docs/lab-hizli-kullanim.md`: the same browser wording, a link to the
    Turkish How to use page, Back and Fwd, a greyed-out Device button told
    apart from an empty port list, the pa24 note, and My files lost on a
    reload.
  - `CONTRIBUTING.md`: the broken sentence about new instructions,
    `./tests/run.sh` in the pull request flow, the Turkish files, the Google
    Fonts request, the Ports dialog, and a release checklist of every place
    the version appears.
  - `tests/run.sh` now works from a path that contains spaces;
    `tests/README.md` says it needs a POSIX shell.
  - A new `examples/README.md`.
  - `index.html` has a description and Open Graph tags. `howto/index.html`
    loads `howto.css` and `howto.js` with `?v=18`.
  - `docs/figures/`: the memory map's stack and segment-end addresses (107F0H,
    107FFH, 10800H), the retired name PAT-286, the example count, C++ in the
    transpiler box, and the order of the interrupt and timer steps.
  - This file: the How to use page, the welcome screen, the note on versions
    and commits at the top, and notes on v15, v16 and v17.

## v17 (2026-08-13)

### Added
- The headless engine harness now ships in the repository as `tests/`, with a
  runner (`tests/run.sh`), a differential suite that checks results and flags
  against hand computed 8086 values, a pinned regression for every defect fixed
  in this release, and a suite that assembles and runs the whole example corpus.
- Added screenshots to the README.

### Changed
- Renamed the project to **workbench86**, "the bench for the
  DIGIAC 2000 lab trainer". This retires the earlier names used during
  development: "PAT-286 Workbench", "PAT-286 Virtual Lab" and "RealMode
  Workbench". Hardware names are deliberately untouched: the DIGIAC 2000
  board, the PAT ROM monitor, the `PAT:` serial prompt, `PATCALLS.INC` and the
  PAT RESET button belong to the trainer, not to this tool, and keep their
  names.
- Bumped the cache-busting query string on every `<link>` and `<script>` in
  `index.html` from `?v=14` to `?v=17`. It had not been touched since v14, so
  returning visitors kept being served the cached v14 files after the v15 and
  v16 deploys.
- Renamed `examples/pratikler/` to `examples/assignments/` (28 programs), with
  the matching paths and category values in `examples/manifest.json` and the
  references in `app/files/tree.js` and `app/main/editor.js`.
- Translated the remaining Turkish content in the code, the code comments and
  the example programs to English. `docs/lab-hizli-kullanim.md` stays in
  Turkish on purpose: it is the quick-start handout for the lab students who
  use the tool.

### Fixed
Engine and assembler defects, each reproduced with a headless harness before
being fixed:

- Segment register `PUSH` and `POP` (`PUSH ES/CS/SS/DS`, `POP ES/SS/DS`) were
  missing entirely, which broke one of the shipped example programs.
- The reverse debugger could not undo the first write to a memory page that
  was still clean when the snapshot was taken.
- A pending IRQ with no installed vector was dispatched anyway: it pushed a
  return frame onto the stack and cleared the interrupt flag permanently.
- `SBB` computed the wrong borrow when the subtrahend plus the incoming carry
  overflowed the operand width.
- An undefined label whose name looked like a hexadecimal number was silently
  resolved as a number instead of raising an unknown-label error.
- The start-of-conversion edge detection for the ADC was dead code, so the
  converter never went through its busy cycle.
- Shift and rotate instructions never set the overflow flag.
- `DIV` and `IDIV` silently truncated an out-of-range quotient instead of
  raising a divide error.
- Mnemonics served by the no-operand table silently discarded any operands
  written after them. `RET 2` became a plain `RET`, so the stack was not
  adjusted on return; it now assembles to `C2 iw`, and `NOP 5` is an error.
- The Intel HEX upload path emitted a single record whose length field
  overflowed past 255 bytes.

User interface:

- `app/ui/resize-handles.js` read the grid column widths from
  `getComputedStyle` before layout had settled, got no usable value and fell
  back to its minimum constants, so a fresh visit rendered the three panels at
  200px each and left most of the window empty. The initialiser now measures
  the container and sizes the columns to fill it, keeps the proportions the
  user has dragged, and refits on window resize.

### Documentation
- `README.md` is now bilingual: English in `README.md`, Turkish in
  `README.tr.md`.
- `docs/ANALYSIS.md` deleted and replaced by `docs/KNOWN_ISSUES.md`. The old
  file was an internal self-assessment whose summary table claimed zero
  serious bugs. The defects listed above show that the claim was wrong, so the
  document was replaced by an honest list of what is fixed and what is still
  open, with no severity scores and no metrics.
- `CONTRIBUTING.md` updated for the new name and the current source layout.

## v16 (2026-06-03)

### Changed
- Renamed the project from "PAT-286 Workbench" to **RealMode Workbench**. The
  former name reused the trainer's local lab designation ("PAT"); the new name
  describes the tool itself, a browser-based 8086 real-mode workbench.

  Correction recorded in v17: this entry originally stated that the live
  deployment moved to the site root (`https://natozenbilek.github.io/`). That
  move never happened. The deployment has stayed in its subdirectory,
  `https://natozenbilek.github.io/workbench86/`, and the in-page "natozenbilek"
  link still points one level up to the site root.

### Fixed
- **`TEST r/m, r` (opcodes 0x84 / 0x85)** were produced by the assembler but had
  no branch in the execution dispatcher, so a register-to-register `TEST`
  (e.g. `TEST AX, BX`) fell through to the "Unknown opcode" fault and halted.
  Added the handler in `core/cpu/exec.js`: it ANDs the operands, sets the logic
  flags (SF/ZF/PF, clears CF/OF) and discards the result, matching the 8086.

### Documentation
- The paper under `docs/paper/` rewritten: removed unsubstantiated
  classroom-deployment figures (the system is presented as an engineering
  contribution, with no claims from a controlled study); corrected the host
  department; added cross-institution motivation (Hacettepe Computer and
  Electrical Engineering, Istanbul Technical University, and an independently
  built emulator of the same board at the Lebanese American University) with
  references. Final length 9 pages.
- The appendix under `docs/paper/` cleaned for layout: zero overfull boxes,
  no undefined references; 42 pages. Both PDFs recompiled.

  Note recorded in v18: the paper and the appendix are kept outside the public
  repository, which has no `docs/paper/`.
- `README.md` updated for the new name and a note that the debug panel is live
  only in the simulator (it does not mirror a program running on the physical
  board after **Upload and Run**).

## v15 (2026-05-27)

### Removed
- `app/peripherals.js` (167 LOC). The SVG "applications module" panel was
  defined but never wired into `index.html`; the script tag, the host
  container element and the entry-point invocation were all absent, so the
  panel was invisible in production for the entire history of the project.
- `styles/peripherals.css` (77 LOC). Stylesheet for the removed module.
- `renderAppModule()` and `updateMotor()` from `app/render/io.js`
  (195 LOC reduced to 52). Both functions targeted DOM elements created by the
  removed SVG module.
- `motorAnimLoop()` and `motorAnimFrame` from `app/main/editor.js`. The
  animation loop only called `updateMotor()`, which is gone.
- `toggleObject()` and `toggleOptical()` from `app/main/sim.js`. UI hooks
  that were only callable from the removed SVG buttons.

### Changed
- `potChanged()` in `app/main/sim.js` made null-safe; it now no-ops if the
  slider element is absent.
- `index.html`: removed the orphan `<link>` to `styles/peripherals.css`.

### Preserved
- The peripheral state variables `motorDacVal`, `diskPulses`, `motorAngle`,
  `potValue`, `objectNear`, `opticalBlocked`, `piezoOn` and `piezoFreq`
  remain in `core/io/state.js`. The read and write handlers in
  `core/io/ports.js` continue to consult them; they sit at their reset
  values until a future UI re-introduces controls.

### Added
- The paper under `docs/paper/` (revised, 4 pages).
- The appendix under `docs/paper/` (12 + 7 = 19 sections).
- `docs/paper/*.pdf` (compiled PDFs of both).

  Note recorded in v18: the paper, the appendix and their PDFs are kept outside
  the public repository, which has no `docs/paper/`.
- `docs/figures/fig1_architecture.svg`,
  `docs/figures/fig2_memory_map.svg`,
  `docs/figures/fig3_exec_pipeline.svg`.
- `docs/ANALYSIS.md` (internal audit report; removed again in v17).
- `LICENSE` (MIT).
- `CHANGELOG.md` (this file).
- `CONTRIBUTING.md` (contribution guidelines).

### Verified
- All distributed example programs (`examples/{pratikler,demos,hardware,scripts}/*.asm`,
  the first of these folders renamed to `assignments` in v17)
  re-assembled and re-executed on the v15 tree without modification.
- Hardware bridge re-validated against the reference PAT-286 board over
  the 9600 8N2 serial line (both `uploadHexAndRun` and `uploadViaC`
  paths).

  Correction recorded in v18: there is no record of this board check. The
  v15 tree carried the v14 serial code, and `uploadHexAndRun` has no caller
  in the page, so the HEX path cannot have been exercised from the user
  interface. Do not rely on this entry.
- Browser matrix: Chrome 121, Edge 121, Firefox 124 (sim only),
  Safari 17.4 (sim only).

## Earlier versions (v1 to v14)

Incremental development versions reflected in the `?v=N` query strings
appended to script and stylesheet `<link>` tags in `index.html`. Each
version corresponds to a deploy of the static directory. Highlights:

- **v14**: feature freeze ahead of the audit; rich debugger panel with
  ten collapsible cards; tab-aware editor; command palette; WebSerial
  bridge with two upload paths; transpiler accepting C / C++ / Python /
  Java / Go subsets.
- **v10 to v13**: incremental UI polish (resize handles, keyboard
  navigation, ARIA roles, breakpoints in line gutter, execution-trace
  ring, snapshot-backed time travel with 500-entry history).
- **v6 to v9**: assembler hardening (fixed-point convergence for forward
  jumps, segment-override prefix detection, full ALU immediate group,
  DAA/DAS/AAA/AAS/AAM/AAD); peripheral simulation (DC motor with
  encoder, piezo via WebAudio, ultrasonic pair, potentiometer ADC,
  optical link, programmable timer with IRQ2).
- **v1 to v5**: initial assembler-and-simulator skeleton; MUART port range
  `0x80` to `0x9E`; INT 28H PAT monitor calls; ROM-monitor-compatible
  upload path over serial.
