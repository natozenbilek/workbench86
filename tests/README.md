# Tests

The engine runs outside a browser. `tests/run.sh` concatenates `tests/stubs.js`
with the files under `core/` and executes the result, so the assembler and the
CPU can be driven without a page, a DOM or a device.

```bash
./tests/run.sh            # every suite
./tests/run.sh engine     # one suite
```

`node` is used when it is on the PATH. Otherwise the script falls back to
`osascript -l JavaScript`, which runs JavaScriptCore and is present on any
macOS install. The exit status is non zero if any suite reports a failure.

## Suites

`engine.test.js` has two halves. The first is a differential check of results
and flags against hand computed 8086 values: shift and rotate overflow, BCD
adjust, signed and unsigned multiply, signed compare, string moves with the
direction flag set. The second half pins defects that differential testing
found and that are now fixed, so a regression fails the suite instead of
passing quietly. Among them: the borrow `SBB` produced when the subtrahend
plus carry overflowed the operand width, an out of range `DIV` quotient being
truncated instead of faulting, an undefined label resolving to a hex number
rather than raising an error, and the reverse debugger failing to undo the
first write to a memory page that was clean when the snapshot was taken.

`examples.test.js` walks `examples/manifest.json` and requires every program to
assemble and then execute without reaching an unknown opcode or an
unimplemented path. Programs that end in a deliberate infinite loop are cut off
at the step cap, which is not a failure. This is the practical regression
check: a change that breaks encoding or dispatch shows up here immediately.

## Writing a test

`tests/stubs.js` provides the helpers. `assemble(src)` returns `{ok, log}` and
never throws. `step(cap)` runs until `HLT` or the cap. `peek(seg, off)` reads a
byte. `flags()` returns the flag bits. `check(name, actual, expected)` compares
with `JSON.stringify`, and the file ends with `report('name')`.

Two things to know. Engine globals such as `AX`, `FLAGS`, `mem`, `halt` and
`curInstr` are in scope directly, because everything shares one global scope.
And never name anything `run` at the top level: `osascript` treats a global
`run` function as the script entry point and calls it instead of evaluating the
file, which makes a suite silently print a number and pass.

## Scope

This is not a browser test suite. It covers `core/`, which is the assembler,
the CPU, the I/O model and the interrupt logic. Nothing under `app/` is
exercised, so the editor, the panels, the file tree and the serial bridge are
still checked by hand.
