# Changelog

All notable changes to workbench86 are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
the project adheres to incremental versioning (v1, v2, ... vN) rather than
semantic versioning, because each version corresponds to a single deployed
build of the static asset.

## v17 (2026-08-13)

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
  written after them.
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
