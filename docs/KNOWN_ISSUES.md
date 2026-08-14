# Known issues

This is a living list of what is known to be wrong or missing in workbench86.
It replaces the older self-assessment (`docs/ANALYSIS.md`), which claimed the
project had no serious defects. That claim was not true: a later review
reproduced the defects below with a headless harness.

Entries are not ranked by severity. They are grouped by whether they are
already fixed or still open. If you hit something that is not listed here,
please open an issue with a minimal reproduction.

## Fixed in v17

All of these were reproduced before the fix.

- Segment register `PUSH` and `POP` (`PUSH ES/CS/SS/DS`, `POP ES/SS/DS`) were
  missing from the assembler and the executor, which broke one of the shipped
  example programs.
- The reverse debugger could not undo the first write to a memory page that was
  still clean when the snapshot was taken, so stepping back left that byte at
  its new value.
- A pending IRQ with no installed vector was still dispatched: it pushed a
  return frame onto the stack and cleared the interrupt flag permanently,
  leaving the program with interrupts disabled and a corrupted stack.
- `SBB` computed the wrong borrow when the subtrahend plus the incoming carry
  overflowed the operand width.
- An undefined label whose name looked like a hexadecimal number was silently
  resolved as a number instead of raising an unknown-label error.
- The start-of-conversion edge detection for the ADC was dead code, so the
  converter never went through its busy cycle.
- Shift and rotate instructions never set the overflow flag.
- `DIV` and `IDIV` silently truncated a quotient that did not fit the
  destination instead of raising a divide error.
- Mnemonics handled by the no-operand table silently discarded any operands
  written after them, so a typo such as `NOP AX` assembled without complaint.
- The Intel HEX upload path emitted a single record whose length field
  overflowed past 255 bytes.

## Still open

### Not implemented

- Far `CALL`, far `JMP` and far `RET`. The CPU model is real mode only; there
  is no protected mode.
- No FPU.
- Live per-port forwarding to the physical board. The supported hardware path
  is program upload (assemble, then Upload and Run), not a live port bridge
  while the simulator runs.

### Limitations

- `INCLUDE` accepts only `PATCALLS.INC`. Any other include is ignored, because
  the PATCALLS constants are built into the assembler rather than read from a
  file.
- Editor contents are not persisted across a page reload. Save your work to
  disk before closing the tab.
- The transpiler is deliberately restricted: no `if`/`else`, no user-defined
  functions, no nested control flow. Its register allocation can also collide
  with `CX`, which the generated delay loops use.
- The address of the keypad and display controller on the physical board has
  not been identified. Several probe programs ship under `examples/scripts/`
  instead of one supported path.

### Tooling

- There is no automated browser test suite. The engine is exercised by a
  headless harness and the example corpus; the user interface is checked by
  hand.
