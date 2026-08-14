# Contributing to workbench86

Thank you for considering a contribution. workbench86 is a small educational
project; pull requests are welcome and reviewed within a week. The
guidelines below keep the codebase small and the review turnaround
short.

Before filing anything, read `docs/KNOWN_ISSUES.md`. It lists what is
already known to be broken or missing, so you can tell a new defect from
a documented one.

## What we accept

- **Bug reports.** Open an issue with a minimal reproduction. If the bug
  shows up only on the physical board, include the assembled hex dump
  (Export modal in workbench86).
- **New 8086 instructions.** A complete instruction touches four places:
  the mnemonic list in `isInstruction()` (`core/assembler/parser.js`) so
  the token is not mistaken for a label; the encoder branch in
  `encodeInstruction()` (`core/assembler/encoder.js`); the opcode branch
  in `execOne()` (`core/cpu/exec.js`), reusing the helpers in
  `core/cpu/alu.js` and `core/cpu/decode.js` for flags, ModR/M and
  string operations; and the keyword set in
  `app/highlighter/constants.js`. Also add the tooltip in
  `app/editor/tooltips.js`, a line in the in-app ISA reference
  (`app/guide/data.js`) and a row in the matching ISA table in
  Ship a test program in `examples/`
  with it.
- **New peripherals.** Add the port address constant and the backing
  state variables to `core/io/state.js`, the read and write behaviour to
  `core/io/ports.js` (`ioRead` / `ioWrite` and their per-port helpers),
  and a readout to `app/render/io.js` (port monitor, I/O log, I/O
  timeline) or `app/panels/display.js` if the peripheral needs its own
  panel. Document the port assignment in `app/guide/data.js`.
- **UI polish.** Accessibility fixes (ARIA, keyboard navigation), better
  diagnostics, command-palette entries.
- **Examples.** Practical assignments, algorithm demos and hardware
  sketches under `examples/{assignments,demos,hardware,scripts}/`. Add
  the file to `examples/manifest.json`.
- **Translations and documentation.** `README.md` (English),
  `README.tr.md` (Turkish), `docs/KNOWN_ISSUES.md`,
  `docs/lab-hizli-kullanim.md` (the Turkish lab handout, which stays in
  Turkish) and the in-app guide (`app/guide/data.js`).

## What we will not accept

- Build steps, package managers, bundlers or any runtime dependency.
  The project is plain HTML / JS / CSS and stays that way.
- Frameworks (React, Vue, Angular, jQuery and the rest). The DOM is
  small enough to drive directly.
- Online telemetry, analytics, remote loaders. The page must run
  offline.
- Code obfuscation or minification in the source tree. Commit readable
  code; minify at deploy time if needed.

## Code conventions

- Code and comments are written in English, including example programs.
  The only intentionally non-English file is
  `docs/lab-hizli-kullanim.md`.
- Two-space indent. Single-quote strings. Semicolons consistent with
  the surrounding file.
- Engine functions live at module-level scope, because the core scripts
  are loaded as plain globals from `index.html` with no module system.
  The self-contained UI add-ons in `app/ui/` wrap themselves in an IIFE
  instead.
- Names: `lowerCamelCase` for functions and variables;
  `UPPER_SNAKE_CASE` for module-level constants (`PORT_PORT1`,
  `TIMER_CYCLES_PER_TICK`).
- Files are short: aim for 300 LOC per file or fewer. Split into
  siblings when a file grows past that.
- Comments are sparse and explain *why*, not *what*. Section
  separators are a single line of `// === TITLE ===` followed by a
  blank line.
- New files must be added to `index.html` as a `<script>` or `<link>`
  tag carrying the current `?v=N` query string.

## Pull request flow

1. Open an issue first if the change touches more than one file. We
   prefer to align on the design before code review.
2. Branch from `main`. Keep the diff focused, one PR per logical
   change.
3. Re-assemble and re-run the example programs in `examples/` locally
   before pushing. The project ships no automated browser test suite;
   the `examples/` corpus plus a headless run of the engine is the
   regression harness.
4. If the change touches the ISA or the I/O bus, also re-validate
   against a physical DIGIAC 2000 trainer when one is available.
5. Update the documentation:
   - `README.md` and `README.tr.md` for user-visible changes
   - `docs/KNOWN_ISSUES.md` if the change fixes a listed defect or adds
     a new limitation
   - `CHANGELOG.md` under an "Unreleased" heading
6. Open the PR. CI runs nothing yet, so include a brief reviewer
   checklist in the PR body.

## Reviewer checklist (for maintainers)

- [ ] Code reads in the project style, and is written in English.
- [ ] All examples still assemble and run.
- [ ] No new runtime dependency, no new build step.
- [ ] Documentation updated where appropriate.
- [ ] Diff stays under a few hundred lines, or is split into smaller
      PRs.

## Releases

Each release is a tagged commit (`v15`, `v16`, `v17`, and so on) and a
deploy of the static directory. The version number is also reflected in
the `?v=N` query string on every `<link>` and `<script>` tag in
`index.html`. Bump it in the same commit as the release: if you forget,
returning visitors keep running the previously cached build, which is
exactly what happened between v14 and v17.

## Code of conduct

Be kind. Assume the other person is also tired. If a review feels
adversarial, take a break and come back to it.
