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
  (`app/guide/data.js`) and the instruction list in `README.md` and
  `README.tr.md`. Ship a test program in `examples/` with an entry in
  `examples/manifest.json`, and add a case to `tests/engine.test.js`.
- **New peripherals.** Add the port address constant and the backing
  state variables to `core/io/state.js`, the read and write behaviour to
  `core/io/ports.js` (`ioRead` / `ioWrite` and their per-port helpers),
  and a readout to `app/render/io.js` (the I/O log and its timeline)
  or `app/panels/display.js` if the peripheral needs its own panel. A new
  MUART register also goes into `PORT_DEFS` in `app/editor/features.js`,
  which builds the Ports dialog. Document the port assignment in
  `app/guide/data.js`.
- **UI polish.** Accessibility fixes (ARIA, keyboard navigation), better
  diagnostics, command-palette entries.
- **Examples.** Practical assignments, algorithm demos and hardware
  sketches under `examples/{assignments,demos,hardware,scripts}/`. Add
  the file to `examples/manifest.json` (see `examples/README.md`).
- **Translations and documentation.** `README.md` (English),
  `README.tr.md` (Turkish), `docs/KNOWN_ISSUES.md`,
  `docs/hardware-guide.md`, `docs/lab-hizli-kullanim.md` (the Turkish lab
  handout, which stays in Turkish), the How to use page
  (`howto/index.html`) and the in-app guide (`app/guide/data.js`). The How
  to use page carries both languages: every card has a `data-l="tr"` and a
  `data-l="en"` version, and each diagram a `.tr.svg` and an `.en.svg`
  file. Keep the two in step.

## What we will not accept

- Build steps, package managers, bundlers or any runtime dependency.
  The project is plain HTML / JS / CSS and stays that way.
- Frameworks (React, Vue, Angular, jQuery and the rest). The DOM is
  small enough to drive directly.
- Online telemetry, analytics, remote loaders. The page must keep
  working offline. Its only remote request is the Google Fonts
  stylesheet in `index.html`; without it the fallback fonts in
  `styles/variables.css` apply. The How to use page ships its own fonts
  in `howto/fonts/`.
- Code obfuscation or minification in the source tree. Commit readable
  code; minify at deploy time if needed.

## Code conventions

- Code and comments are written in English, including example programs.
  The Turkish material is intentional: `README.tr.md`,
  `docs/lab-hizli-kullanim.md` and the Turkish half of `howto/` (the
  `data-l="tr"` blocks, the speaker notes and the `*.tr.svg` diagrams).
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
  tag carrying the current `?v=N` query string. The same goes for files
  that `howto/index.html` loads.

## Pull request flow

1. Open an issue first if the change touches more than one file. We
   prefer to align on the design before code review.
2. Branch from `main`. Keep the diff focused, one PR per logical
   change.
3. Run `./tests/run.sh` before pushing (see `tests/README.md`). Both
   suites must report `"failed": 0`; the script then exits with status 0.
   A fix in `core/` comes with a pinned case in `tests/engine.test.js`.
   The suites cover `core/` only. The project ships no automated browser
   test suite, so check changes under `app/` by hand in a browser.
4. If the change touches the ISA or the I/O bus, also re-validate
   against a physical DIGIAC 2000 trainer when one is available.
5. Update the documentation:
   - `README.md` and `README.tr.md` for user-visible changes
   - `docs/hardware-guide.md`, `docs/lab-hizli-kullanim.md` and
     `howto/index.html` if the change affects uploading or the steps
     they show
   - `docs/KNOWN_ISSUES.md` if the change fixes a listed defect or adds
     a new limitation
   - `CHANGELOG.md` under an "Unreleased" heading
6. Open the PR. CI runs nothing yet, so include a brief reviewer
   checklist in the PR body.

## Reviewer checklist (for maintainers)

- [ ] Code reads in the project style, and is written in English.
- [ ] `./tests/run.sh` passes.
- [ ] No new runtime dependency, no new build step.
- [ ] Documentation updated where appropriate.
- [ ] Diff stays under a few hundred lines, or is split into smaller
      PRs.

## Releases

A release is a deploy of the static directory. Its version is the build
number in `CHANGELOG.md` (`v17`, `v18`, and so on). The repository has no
release tags, and the public history does not have one commit per build.

Bump the version in the same commit as the release, everywhere it appears:

- the `?v=N` query string on every `<link>` and `<script>` tag in
  `index.html` (39 of them at v18). If you forget, returning visitors
  keep running the previously cached build, which is exactly what
  happened between v14 and v17;
- `WB_VERSION` in `app/serial/core.js`, which heads the terminal's Copy
  log;
- in `howto/index.html`: the `?v=N` on its stylesheets and script, the
  two `<code>vN</code>` tags on the first card, and the speaker notes
  that name the current version;
- the version drawn in `howto/img/d-version-check.en.svg` and `.tr.svg`
  and in `howto/img/doodles/doodle-cizirti.en.svg` and `.tr.svg`;
- the heading in `CHANGELOG.md`, which turns the "Unreleased" entries
  into `vN (date)`.

To list these places, run `grep -rnE 'v=?18' index.html app/ howto/`
with the old number in place of 18. Notes that tell what changed in an
older build keep their number.

## Code of conduct

Be kind. Assume the other person is also tired. If a review feels
adversarial, take a break and come back to it.
