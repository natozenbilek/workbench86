# Hardware connection and troubleshooting guide

This is the document to open when the board "does not work".

workbench86 is a browser page. It assembles 8086 assembly, runs it in a simulator, and
can also push the assembled bytes to a physical trainer board over a serial line
using the browser's WebSerial API. This guide covers only the physical side:
cabling, browser requirements, the first connection, what the terminal output
means, and what to do when a step fails.

Everything below was checked against the code in `app/serial/core.js`,
`app/serial/upload.js`, `app/editor/features.js`, `core/cpu/core.js`,
`core/assembler/parser.js` and `index.html`. Anything not confirmed there is
marked as a hypothesis or as untested.

---

## 1. What you need

| Item | Notes |
|---|---|
| DIGIAC 2000 chassis, powered | With the 80286 CPU card fitted |
| Keypad and display module | Fitted on the chassis |
| Applications Module | The peripherals your program will drive |
| The board's RS-232 serial lead | Legacy boards expose RS-232 only |
| USB to RS-232 adapter | Required on any modern laptop, plus its driver |
| A Chromium-family browser | Chrome, Edge, Opera or Brave |
| workbench86 served over https or from localhost | Not opened from `file://` |

Two requirements catch almost every first-time user:

1. **Browser.** Uploading uses the WebSerial API, which exists only in
   Chromium-family browsers. Firefox and Safari load the page and run the
   simulator perfectly well, but they cannot connect to the board. The page's own
   message names Chrome and Edge; Opera and Brave expose the same API.
2. **Secure context.** WebSerial needs a secure context. Serve the page over
   https, or from `localhost`. Double-clicking `index.html` so that the address
   bar shows `file:///...` will not give you a serial connection.

To serve it locally, run this from the project folder and then open
<http://localhost:8000>:

```
python3 -m http.server 8000
```

### Link settings

You do not configure these anywhere. The page opens the port with fixed
settings (`app/serial/core.js`):

| Setting | Value |
|---|---|
| Baud rate | 9600 |
| Data bits | 8 |
| Parity | none |
| Stop bits | 2 |
| Flow control | none (DTR and RTS are asserted by the page after opening) |

Written the short way: 9600 8N2. If you also use a terminal program such as
minicom or PuTTY on the same board, set it to the same values.

---

## 2. What the board is

The board is a **DIGIAC 2000 Microprocessor Training System** made by LJ
Technical Systems (LJ Create). It is modular:

| Module | Contents |
|---|---|
| Chassis | Power supply, backplane, card slots |
| CPU card | Interchangeable. workbench86 targets the **80286** card |
| Keypad and display module | Hex keypad plus a 7-segment display |
| Applications Module | The peripherals listed below |

The Applications Module carries LED bars, a DC motor with an optical disc
encoder, a potentiometer, an ADC and a DAC, an ultrasonic transmitter and
receiver, an optical link, and a piezo sounder. Programs reach them through the
MUART ports at `80H` to `9EH`; the full port map is in the project README. For
the connection checks in this guide only two matter: `UPORT1` (`90H`) and
`UPORT2` (`92H`), which drive the two 8-bit LED bars.

One naming note: at Hacettepe University this board is called "PAT" locally.
That is a lab term, not a vendor product name, but it survives in two places you
will see: the **PAT RESET** button on the board and the ROM monitor's `PAT:`
prompt.

---

## 3. First connection

The goal of this section is one thing: a `PAT:` prompt in the page's terminal.
Do not go past it.

1. Install the driver for your USB to RS-232 adapter and confirm your operating
   system lists the adapter. If the OS does not see it, the browser will not
   see it either.
2. Power the board and let the monitor start.
3. Connect the board's serial port to the adapter, and the adapter to the laptop.
4. Open workbench86 in Chrome, Edge, Opera or Brave, over https or from
   `http://localhost:...`.
5. Click **Device** in the page header (top right).
6. The **browser**, not the page, now shows its own port picker. Pick the port
   belonging to your adapter and grant permission. You are granting permission
   to exactly one port.
7. On success the status bar logs `Board connected (9600 8N2)`, the dot beside the
   button turns to its connected state, the button label changes to
   **Disconnect**, and the terminal prints:
   `Connected. Press PAT RESET, wait for "PAT:" prompt, then use buttons.`
8. Press the **PAT RESET** button on the board. The ROM monitor restarts and
   prints its banner, ending with the prompt:

   ```
   PAT:
   ```

9. If nothing arrives, press PAT RESET again, then work through the
   troubleshooting table in section 8.

Connecting is harmless to a running board: opening the port deasserts DTR and
RTS for 100 ms and then asserts both. It does not by itself reset the board,
which is why step 8 is a physical button press.

---

## 4. Uploading and running a program

1. Write or open a program, then press **Assemble** in the debug panel toolbar
   (or Ctrl+Enter). Fix any assembler errors first. Upload refuses to run if
   nothing has been assembled.
2. Check that the last line in the terminal is `PAT:`. That means the board is
   sitting in its monitor and is listening.
3. Press **Upload and Run** in the header.
4. Watch the terminal. It shows both what the page sends (lines starting `TX:`)
   and what the board sends back, interleaved in one stream.

A short program (the 18-byte all-LEDs-on example) produces roughly this, with
the monitor's own echo mixed in:

```
=== UPLOAD: 18B @ 100H (C + ESC exit) ===
[OK] PAT:
TX: C 0100
B0 FF E6 80 E6 82 E6 84 E6 86 E6 88 B0 FF E6 92 EB FE
[OK] segment @0100: 18 bytes.
[...] Exiting C mode (ESC+CR)...
[OK] PAT: prompt received
TX: G 0100
--- G TIMEOUT ---
```

### Reading that output

| Line | What it means |
|---|---|
| `=== UPLOAD: 18B @ 100H ... ===` | Header: how many bytes, and the ORG they go to |
| `[OK] PAT:` | The page sent a bare CR LF and the prompt came back, so the board is listening |
| `[WARN] No PAT: prompt` | It did not come back. The upload stops here |
| `TX: C 0100` | Enter change-memory mode at address 0100H |
| The stream of hex pairs | One byte per line. After each byte the page waits for the monitor's colon prompt before sending the next |
| `[!]` between bytes | That byte's prompt did not come back within 2 seconds. The page carries on, but the byte may not have been stored |
| `[OK] segment @0100: 18 bytes.` | All bytes of that segment were sent |
| `[...] Exiting C mode (ESC+CR)...` | ESC (`1B`) then CR (`0D`) leaves change-memory mode |
| `TX: G 0100` | Start execution at that address |
| `=== SUCCESS ===` | The `PAT:` prompt returned within 8 seconds, so the program handed control back to the monitor (normally through `INT 28H` with `AH=4`, EXIT) |
| `--- G TIMEOUT ---` | No prompt within 8 seconds. **Expected** for any program ending in an endless loop (`JMP $`, machine code `EB FE`), which is how the LED examples keep their pattern lit. Press PAT RESET to get the monitor back |

Non-printable bytes are shown, not hidden. Characters 32 to 126 appear as text,
CR starts a new line, LF is dropped, `0C` appears as `[FF]`, and everything else
appears as its hex value in brackets, so an ESC shows up as `[1B]`.

### The monitor commands the page drives

| Command | What the page sends | Effect |
|---|---|---|
| `C addr` | `C 0100` + CR LF | Enter change-memory mode at `addr`. The monitor then takes one byte per line as two hex digits and prompts with a colon after each |
| ESC then CR | Bytes `1B 0D` | Leave change-memory mode and return to the `PAT:` prompt |
| `G addr` | `G 0500` + CR LF | Start execution at `addr` |
| `L` | `L` + CR LF, then `/t1` | Begin an Intel HEX load, on ROM revisions that support it |

`/t1` is sent immediately after `L` as a loader option. What it selects is not
documented in the code and could not be verified against a monitor manual here,
so treat it as a fixed part of that sequence rather than something to tune.

### The terminal controls

| Control | Behaviour |
|---|---|
| Input box plus **Send** | Sends what you type followed by CR LF, one character every 2 ms |
| **G** button | Sends `G` at the ORG of the last assembled program |
| **T** button | Always sends `T 0100`, regardless of ORG. Only meaningful for `ORG 0100H` programs |
| **Copy** | Copies the whole terminal log to the clipboard. Use it when reporting a problem |

### Expected behaviour that looks like a bug

Once **Upload and Run** has started the program, **the right-hand debug panel
stops advancing. That is correct.** Execution has moved to the board's own CPU,
and no register or memory state comes back over the link. The panel is live only
in the simulator.

The working order is therefore:

1. Debug in the simulator, where Step, Run and Step Back all work.
2. Only when the program is correct, send it to the board and watch the physical
   LEDs, motor or sounder.

You cannot watch both at once.

---

## 5. The two upload paths and how to choose

Lab boards in the wild carry two incompatible ROM monitor revisions, so two
upload paths exist.

| | Per-byte `C` path | Intel HEX path |
|---|---|---|
| Status | Default. Wired to **Upload and Run** | Alternative, no button in this build |
| Monitor commands | `C` per segment, ESC CR, `G` | `L`, `/t1`, HEX records, `G` |
| Load address | The program's own ORG, per segment | Hardcoded 0100H |
| Speed | Slow: waits for a prompt per byte, plus 50 ms | Faster: up to 32 data bytes per record |
| Tolerance | High. Confirms each byte, marks failures with `[!]` | Lower. A dropped character corrupts a record |

**How to tell which path your board wants.** With the board at the `PAT:` prompt,
type `L` in the terminal input box and press Send. If the monitor answers with a
loader prompt or simply waits, that revision supports `L` and the HEX path is
available. If it answers with an error or just reprints `PAT:`, use the default
path.

**When an upload fails, trying the other path is the correct response**, not a
workaround. A board that ignores `C` and a board that ignores `L` look nearly
identical from the page: the bytes go out and nothing sensible comes back.

The HEX path has no button in this build. It is a global function, so it is
called from the browser's developer console (F12) while connected. It assumes
`ORG 0100H`, because both the record addresses and the final `G` are fixed at
0100H:

```js
// after Assemble, with an ORG 0100H program:
let end = Math.max(...asmOutput.map(i =>
  i.addr + (i.bytes ? i.bytes.length : i.words ? i.words.length * 2 : 0)));
uploadHexAndRun(Array.from(mem.slice(0x800 + 0x100, 0x800 + end)), 'HEX PATH');
```

Records are emitted as `:LLAAAA00<data><checksum>` with at most 32 data bytes
each, followed by the end record `:00000001FF`.

---

## 6. Load addresses and ORG

- A program is deposited at the address its `ORG` directive specifies.
- A program with several `ORG` directives is deposited as several **contiguous
  segments**, each with its own `C <address>` command. The gaps between them are
  **skipped**, not filled with zeros.
- Execution starts at the first instruction's ORG. That is the address the final
  `G` uses, and it is the address you would type by hand.

Skipping the gaps matters for upload time. Measured with the project's offline
harness (not on a board): `examples/assignments/pa27-display-interrupts.asm` fell
from 5895 bytes sent, of which 5864 were zero fill, to about 31 bytes;
`examples/assignments/pa29-motor-speed-display.asm` fell from 291 to 142.

### The historical failure worth recognising

An earlier published version always deposited at 0100H and always ran `G 0100`,
whatever the ORG said. Any program whose ORG was not 0100H was written to the
wrong place, so `G` jumped into unprogrammed memory and the monitor reported:

```
ERROR 30 : Invalid Opcode Exception
 IP   AX   BX   CX   DX   SI   DI   BP   DS   CS   ES   SS   SP   FL
F801 FE91 0000 0000 0000 0000 0000 0000 0080 0080 0080 0F80 0800 0046
```

Programs that happened to use `ORG 0100H` worked, which made the failure look
random: two examples ran, the rest did not.

**Check which build you are on.** Assemble a program whose ORG is not 0100H, for
example `ORG 0500H`, and press Upload and Run. The terminal must show
`TX: C 0500` and `TX: G 0500`. If it shows `C 0100` and `G 0100` instead, your
browser is running the old cached build: force a reload (Ctrl+Shift+R) and try
again.

### Reset-state gotcha: the segment registers are not all equal

The dump above was taken on a real board. Read the segment registers in it:

| Register | Value on the board |
|---|---|
| CS | 0080 |
| DS | 0080 |
| ES | 0080 |
| **SS** | **0F80** |
| SP | 0800 |

**Do not assume SS follows CS and DS.** If your program pushes, calls, or uses
BP-relative locals, set up your own stack (load `SS` and `SP` yourself) instead
of inheriting whatever the monitor left. Note also that after Assemble the
simulator sets `CS=DS=SS=ES=0080` and `SP=FFF0`, so stack behaviour can differ
between the simulator and the board even when the program is byte-identical.

---

## 7. Verifying the link with the probes

Run a probe **before** debugging a larger program. It separates two very
different problems: "my program is wrong" and "the link is wrong". If the probe
works, the cable, the adapter, the monitor and the upload protocol are all fine,
and you can go back to your own code with confidence.

In this build the **Ports** dialog holds only the MUART register table with
**Read Current** and **Write**. Those buttons act on the simulator's port array,
not on the board (there is no live port bridge; see section 9). The probe
routines are loaded on the page but have no buttons, so run them from the
browser's developer console (F12) while connected. If a later build adds probe
buttons, they call these same functions.

### 7.1 LED probe: run this one first

The simplest check needs no console at all:

1. Connect, press PAT RESET, wait for `PAT:`.
2. Open `examples/hardware/hw-led-all-on.asm` from the Explorer.
3. Assemble, then Upload and Run.
4. All eight LEDs of the Port 2 bar should light and stay lit. The program ends
   in an endless loop, so `--- G TIMEOUT ---` in the terminal is expected.
5. `examples/hardware/hw-led-all-off.asm` clears them again.

That program is 18 bytes: it writes `FFH` into `UCRREG1`, `UCRREG2`, `UCRREG3`,
`UMODEREG` and `UPORT1CTL`, writes the pattern byte to `UPORT2` (`92H`), then
spins forever.

The same 18-byte stub exists in code, so from the console you can also run:

| Call | Effect |
|---|---|
| `testLedAll()` | Pattern `FF`: all eight Port 2 LEDs on |
| `testLedOff()` | Pattern `00`: all off |
| `directLedTest(0x01)` | Pattern `01`: a single LED (D0) on |
| `testExit()` | Uploads 7 bytes that call `INT 28H` `AH=4` and return to the monitor. Useful to see `=== SUCCESS ===` rather than a timeout |

### 7.2 Display probes: four rival candidates, none confirmed

The address of the keypad and display controller on this board **has not been
identified**. Four probe programs ship, each testing a different candidate. They
are mutually exclusive guesses, so run them one at a time.

| Probe | Console call | Candidate | What it writes |
|---|---|---|---|
| 1 | `probeDisplay()` | Keyboard display buffer at `0000:047D` | Sets DS to 0000, writes `FFH` into the 8 bytes `047D` to `0484`, then loops |
| 2 | `probeDisplay2()` | 8279 controller at ports `20H`/`21H` | `D1H` to `21H` (clear), delay, `80H` to `21H` (write display RAM), then eight `FFH` writes to `20H`, then loops |
| 3 | `probeDisplay3()` | 8279 at `40H`/`41H` | Same sequence on `40H`/`41H` |
| 4 | `probeDisplay4()` | 8279 at `60H`/`61H` | Same sequence on `60H`/`61H` |

Procedure:

1. Connect, press PAT RESET, wait for `PAT:`.
2. Run **one** probe.
3. Look at the physical 7-segment display on the board. **Success looks like all
   eight digits lit with every segment on**, that is a row of eight solid `8`
   shapes. Anything else, including a partially lit or unchanged display, counts
   as a failure for that candidate.
4. The probe ends in an endless loop, so the terminal shows
   `=== RUNNING (press RESET to stop) ===` and the board stays in that state.
5. **Press PAT RESET before the next probe.** The board must be reset between
   probes; the previous one is still running.
6. Repeat for the next candidate.

There is also an assembly version of candidate 1 that you can assemble and
upload the normal way: `examples/scripts/keyboard-display-nezih.asm` writes
7-segment codes spelling a word into `0000:047D` onwards and then loops. If
letters appear on the display, that address is the right one.

That the controller is an 8279 at all is an assumption built into probes 2 to 4;
it has not been verified. If one of these probes lights the display, **please
report which one**, with the exact call you used, to the lab maintainer and in
the project issue tracker. That single observation closes the largest open
question in this project.

---

## 8. Troubleshooting

| Symptom | Likely cause | What to do |
|---|---|---|
| No `PAT:` prompt after RESET | Board is not in the monitor, or the link settings differ, or the wrong port was granted | Press PAT RESET again. Confirm the terminal is showing anything at all; garbage characters mean the port is right but the settings are wrong, silence means the wrong port or a dead cable. Disconnect, click Device again, pick a different port |
| **Device** button is greyed out, tooltip `WebSerial: Chrome/Edge only` | The browser has no WebSerial (Firefox, Safari), or the page is not in a secure context | Open the page in Chrome, Edge, Opera or Brave, served over https or localhost. The simulator still works in any browser |
| Alert `WebSerial API is not supported in this browser.` | Same cause, hit at click time | Same fix |
| Opened from `file://`, no connection | WebSerial requires a secure context | Serve the folder: `python3 -m http.server 8000`, then open <http://localhost:8000>. Do not double-click `index.html` |
| The browser's port picker is empty | Adapter driver missing, adapter not plugged in, or the port is held by another program | Install the driver and confirm the OS lists the adapter. Close minicom, PuTTY, screen or the Arduino IDE: only one program may hold the port |
| `ERROR 30 : Invalid Opcode Exception` with a register dump | `G` jumped to an address where your code was not written, so the CPU ran unprogrammed memory | Check the terminal: `TX: C xxxx` must match your `ORG`. If it says `C 0100` for a program with a different ORG, you are on the old cached build (Ctrl+Shift+R). See section 6 |
| Nothing happens on Upload and Run, status bar says `Connect to device first!` | No serial connection | Click Device and grant a port |
| Status bar says `Assemble a program first!` or `Program is empty!` | Nothing assembled, or the assembled program produced no bytes | Press Assemble (Ctrl+Enter) and clear any assembler errors first |
| Terminal shows `[WARN] No PAT: prompt` and stops | The board is not at the monitor prompt when the upload starts | Press PAT RESET, wait for `PAT:`, retry |
| Terminal shows `[WARN] No response to C command` | The monitor did not echo the address, so this ROM revision may not accept `C` in this form | Reset and retry once. If it repeats, try the Intel HEX path (section 5) |
| Upload takes minutes | Per-byte protocol: each byte waits for a prompt, up to 2 seconds, plus a fixed 50 ms | Expected for large programs. Confirm the byte count in the header line is close to your real program size. Thousands of bytes for a small program means gap filling, that is, the old build (section 6). The HEX path is faster where the board supports it |
| `[!]` markers appear between bytes, program misbehaves | Bytes dropped or mangled on an unreliable adapter or cable | Do not trust that run. Press PAT RESET and upload again. Try a different USB port, cable or adapter, and re-run the LED probe (section 7.1) to confirm the link before blaming your code |
| `--- G TIMEOUT ---` | The program did not return to the monitor within 8 seconds | Normal for programs ending in an endless loop, which includes all the LED examples. Look at the hardware, not the terminal. Press PAT RESET to recover the prompt. If you expect a return, end the program with `INT 28H`, `AH=4` |
| On-board display goes dark while connected to the PC | **Untested hypothesis**, see below | See the note under this table |
| The debug panel stops advancing after Upload and Run | Correct behaviour: the program is running on the board's CPU and sends no state back | Nothing to fix. Debug in the simulator first, then upload. See section 4 |
| Status bar reports `Serial read error` or `Serial write error` mid-upload | Adapter unplugged, board powered off, or the port was taken by another program | Reconnect the hardware, click Device to disconnect and connect again, press PAT RESET, upload again from the start |
| Program works in the simulator, faults on the board | Stack assumptions, or a peripheral difference | Check `SS`: on the board it was `0F80` while `CS` and `DS` were `0080`. Set up your own stack. See section 6 |

### The dark display

The reported symptom is that the on-board display appears to go dark while the
board is connected to a PC.

**Hypothesis, not a diagnosis, and untested on hardware:** the ROM monitor may
redirect `INT 28H` console output to the serial line when a host is attached. If
so, a program that prints with `WRCHAR` or `WRBYTE` sends its text to the page's
terminal instead of to the physical display, and the display simply has nothing
to show.

**Untested workaround that follows from that hypothesis:** a program that needs
the physical 7-segment display lit should drive it natively rather than through
`INT 28H` text calls. Which native path is correct depends on the unresolved
controller address in section 7.2, so this is currently a suggestion for
experiment, not a supported route. If you test it on a board, please report the
result.

---

## 9. Known unsolved items

Stated plainly, so you do not spend a lab session rediscovering them.

1. **Keypad and display controller address: unknown.** Four rival probes ship
   (section 7.2) and none has been confirmed on hardware.
2. **Physical keypad input: not available.** The only input path modelled is
   `INT 28H` `GETIN`, which in the simulator reads the PC keyboard. On a
   connected board nothing comes back from the board's own keypad, because the
   port-read function is a placeholder that returns the simulator's cached byte.
3. **The dark display: hypothesis only** (see section 8). Not reproduced or
   diagnosed here.
4. **No live per-port bridge.** The supported hardware path is program upload
   only: assemble, then Upload and Run. There is no mirroring of individual
   `IN`/`OUT` operations to the board while the simulator runs. The Ports dialog
   reads and writes the simulator's port array, never the board.
5. **Multi-segment upload verified offline only.** The per-ORG segment upload
   and the ORG-correct `G` were verified with an offline harness and in the
   simulator, not on a real board. A confirmation from a lab board is wanted.
6. **The Intel HEX path is hardcoded to 0100H** for both the record addresses
   and the final `G`, and has no button in the user interface.
7. **The terminal's T button always sends `T 0100`**, regardless of the
   program's ORG.
8. **The probe routines have no buttons in this build** and must be called from
   the browser console.

If you resolve any of these on a physical board, especially item 1, record what
you did and what you saw, and pass it to the lab maintainer. The register dump
in section 6 came from exactly that kind of report, and it is why this guide can
warn you about `SS`.
