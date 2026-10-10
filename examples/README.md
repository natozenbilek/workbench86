# Example programs

These are the programs the Explorer lists. `manifest.json` names each one: the
app loads them from it, and `tests/examples.test.js` assembles and runs every
program in it.

| Folder | Programs | What is in it |
|---|---|---|
| `assignments/` | 28 | The lab assignments PA01 to PA29 (there is no PA18) |
| `demos/` | 9 | Small algorithms: sorting, factorial, Fibonacci, string operations, a subroutine call, counting on the PAT display |
| `hardware/` | 9 | Short programs for the board: LED patterns, a piezo beep and a serial message |
| `scripts/` | 6 | Probes for the board's display, piezo and port bits, and two songs by Manifest played on the piezo |

Each file starts with a comment that says what it does.

## Adding a program

1. Put the `.asm` file in the folder that fits.
2. Add an entry to `manifest.json`, for example:

   ```json
   { "name": "Sum of an array", "file": "demos/sum-array.asm", "category": "demos" }
   ```

   `name` is the key the app uses for the program; the Explorer shows the file
   name. `file` is the path under `examples/`. `category` is the Explorer
   folder: `assignments`, `demos`, `hardware` or `scripts` (any other value
   puts it in `demos`). Programs appear in manifest order.
3. Run `./tests/run.sh examples`. The new program must assemble and run without
   reaching an unknown opcode.

The `languages` folder in the Explorer is not part of this directory: its
samples are built into the app.
