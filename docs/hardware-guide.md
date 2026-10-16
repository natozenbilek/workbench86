# Hardware connection and troubleshooting guide

This is the document to open when the board "does not work".

workbench86 is a browser page. It assembles 8086 assembly, runs it in a simulator, and
can also push the assembled bytes to a physical trainer board over a serial line
using the browser's WebSerial API. This guide covers only the physical side:
cabling, browser requirements, the first connection, what the terminal output
means, and what to do when a step fails.

For a step-by-step walkthrough with screenshots, see the How to use page,
<https://natozenbilek.github.io/workbench86/howto/>, which the app header also
links to (Turkish: add `?lang=tr`).

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
| A browser with the Web Serial API | Chrome or Edge |
| workbench86 served over https or from localhost | Not opened from `file://` |

Two requirements catch almost every first-time user:

1. **Browser.** Uploading uses the Web Serial API. The page has been used with
   Chrome and Edge, and its own messages name only those two. Another browser
   can connect only if it exposes the API (`navigator.serial`); otherwise the
   page still loads and the simulator works, but **Device** and **Upload and
   Run** are greyed out.
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
4. Open workbench86 in Chrome or Edge, over https or from
   `http://localhost:...`.
5. Click **Device** in the page header (top right).
6. The **browser**, not the page, now shows its own port picker. Pick the port
   belonging to your adapter and grant permission. You are granting permission
   to exactly one port.
7. On success the status bar logs `Board connected (9600 8N2)`, the dot beside the
   button turns to its connected state, the button label changes to
   **Disconnect**, and the terminal prints:
   `Connected. Press PAT RESET, wait for "PAT:" prompt, then use buttons.`
   The debug panel locks at the same moment (see "Board mode" in section 4).
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

1. Write or open a program in an `.asm` tab. Debug it in the simulator first
   (section "Board mode" below explains why).
2. Press **PAT RESET** on the board and wait for a new `PAT:` in the terminal.
   **Do this before every upload.** A `PAT:` that is already on screen does not
   prove the board is listening: after a program that ends in an endless loop,
   the board is still running that program and ignores the page.
3. Press **Upload and Run** in the header. It assembles the code that is in the
   editor at that moment, so the board gets exactly what you see; you do not need
   to press Assemble first. If the assembler reports an error, nothing is sent
   and the status bar shows `Error A02: Upload cancelled. Fix the assembler errors first:`
   followed by the error. Upload works from an `.asm` tab only; for a C or other
   language tab, use Translate to ASM first.
4. While the upload runs, the button shows a counter such as `Uploading 31/142`,
   then `Waiting for PAT:`, and the header pill shows **UPLOADING**. A second
   Upload, the terminal's **G**, **T** and **Send**, and **Simulate anyway** are
   refused until it ends. **Disconnect** stays available and stops the upload at
   once.
5. Watch the terminal. It shows both what the page sends (lines starting `TX:`)
   and what the board sends back, interleaved in one stream.

This is the terminal for `examples/hardware/hw-led-all-on.asm` (18 bytes, ends in
an endless loop). It was produced by the project's offline harness, which runs
this build's upload code against a modelled monitor. The lines the page writes
are exact. The board's echo lines (`C 0080:0100`, `0080:0100 00 B0 B0` and so on)
come from the model; a real monitor's echo may look different.

```
=== UPLOAD: 18B @ 100H (C + ESC exit) ===

PAT: [OK] PAT:
TX: C 0080:0100
C 0080:0100
0080:0100 00 B0 B0
0080:0101 00 FF FF
   ... one line per byte ...
0080:0111 00 FE FE
0080:0112 00
[OK] segment @0100: 18 bytes.

PAT:
PAT: [OK] PAT: prompt
TX: G 0080:0100
G 0080:0100

--- Program is running on the board. Press PAT RESET before the next upload.
```

In the offline harness the page sends this program exactly as the April 2026
build did, byte for byte and at the same pace. That build is the last one known
to work on a board. For a program at another ORG only the four address digits
after `C` and `G` differ.

### Reading that output

| Line | What it means |
|---|---|
| `=== UPLOAD: 18B @ 100H ... ===` | Header: how many bytes, and the ORG they go to |
| `[OK] PAT:` | The page sent a bare CR LF and the prompt came back, so the board is listening |
| `[WARN] No PAT: prompt.` then `[Error U01] The board did not answer. ...` | It did not come back. Nothing else is sent. Usually the previous program is still running: press PAT RESET, wait for `PAT:`, upload again |
| `TX: C 0080:0100` | Enter change-memory mode at 0080:0100. The page waits for the address digits in the board's echo |
| `[WARN] No response to C command` | The echo did not come. The upload stops |
| The stream of hex pairs | One byte per line. After each byte the page waits for the monitor's colon prompt before sending the next |
| `[!]` between bytes | That byte's prompt did not come back within 2 seconds. The page carries on, but the byte may not have been stored. Earlier builds could print a false `[!]` in a long session, when the page trimmed its receive buffer; this build counts the trimmed characters, so a `[!]` now means the prompt really did not arrive |
| `[ABORT] The board left change-memory mode. Upload stopped, G not sent.` then `[Error U04] ...` | The board printed `PAT:`, an `ERROR` line or the start of its reset banner while bytes were still going out. The rest would have been typed at the command prompt, so the page stops |
| `[ABORT] link closed during upload` | Disconnect was pressed, or the link was lost. Nothing more is sent |
| `[OK] segment @0100: 18 bytes.` | All bytes of that segment were sent |
| `[OK] PAT: prompt` | ESC (`1B`) then CR (`0D`) left change-memory mode and the prompt came back |
| `[WARN] No PAT: prompt after segment` | It did not come back. The upload stops without `G` |
| `TX: G 0080:0100` | Start execution at that address |
| `=== SUCCESS ===` | The `PAT:` prompt returned within 8 seconds, so the program handed control back to the monitor (normally through `INT 28H` with `AH=4`, EXIT) |
| `=== FAILED: the board reported ERROR 30 ... ===` | The monitor printed an `ERROR` line after `G`, for example `ERROR 30` and a register dump. The status bar repeats the line |
| `--- Program is running on the board. Press PAT RESET before the next upload.` | No prompt within 8 seconds. **Expected** for any program ending in an endless loop (`JMP $`, machine code `EB FE`), which is how the LED examples keep their pattern lit. The header pill shows **BOARD RUNNING** and the page keeps listening |
| `[OK] Board is back at PAT: (the program returned, or PAT RESET was pressed).` | A `PAT:` arrived after that message. The board is ready for the next upload |

Non-printable bytes are shown, not hidden. Characters 32 to 126 appear as text,
CR starts a new line, LF is dropped, `0C` appears as `[FF]`, and everything else
appears as its hex value in brackets, so an ESC shows up as `[1B]`.

### The monitor commands the page drives

| Command | What the page sends | Effect |
|---|---|---|
| `C seg:addr` | `C 0080:0100` + CR LF | Enter change-memory mode at `addr` in segment 0080. The monitor then takes one byte per line as two hex digits and prompts with a colon after each |
| ESC then CR | Bytes `1B 0D` | Leave change-memory mode and return to the `PAT:` prompt |
| `G seg:addr` | `G 0080:0500` + CR LF | Start execution at `addr` |
| `T seg:addr` | `T 0080:0500` + CR LF | Sent by the terminal's **T** button |
| `L` | `L` + CR LF, then `/t1` | Begin an Intel HEX load, on ROM revisions that support it |

Every `C`, `G` and `T` that Upload and Run and the terminal buttons send names
segment 0080; only the console-only Intel HEX path in section 5 still sends
`G 0100` without it. With an offset alone the monitor uses the segment it
currently holds, and the April 2026 board sessions saw that segment become FFFF
after some resets during probe tests. The April 2026 build
sent `C 0080:0100` and `G 0080:0100`, and that is the form seen working on a
board. `C` and `G` at other offsets, and `T` in this form, have not been seen on
a board yet.

`/t1` is sent immediately after `L` as a loader option. What it selects is not
documented in the code and could not be verified against a monitor manual here,
so treat it as a fixed part of that sequence rather than something to tune.

### The terminal controls

| Control | Behaviour |
|---|---|
| Input box plus **Send** | Sends what you type followed by CR LF, one character every 2 ms |
| **G** button | Sends `G 0080:` and the entry ORG of the last upload (before any upload, the ORG of the last assembled program), then waits up to 8 seconds for `PAT:`, like Upload and Run |
| **T** button | Sends `T 0080:` and the same ORG, then waits up to 5 seconds for `PAT:` |
| **Copy** | Copies the terminal log to the clipboard, with a header line in front (see "Error codes" in section 8). Use it when reporting a problem. The terminal keeps only the recent part of a long session: once the log passes 8000 characters it is cut back to the last 6000 |

G, T and Send need a connection and refuse while another job is running, so
their commands never mix with an upload on the line.

### Board mode: the debug panel is locked while connected

While a board is connected, **the right-hand debug panel is locked. That is
correct.** A banner reads **Board connected**, and Step, Run, Reset and the speed
menu are disabled. The header pill shows **BOARD**, **UPLOADING** during an
upload and **BOARD RUNNING** after a `G` until the board is back at `PAT:`. The
program runs on the board's own CPU, and no register or memory state comes back
over the link, so the panel cannot show it. The editor, Assemble and the Explorer
keep working.

To use the simulator again, press **Disconnect**, or press **Simulate anyway** on
the banner. Simulate anyway keeps the connection; the next Upload locks the panel
again.

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
| Monitor commands | `C` per segment, ESC CR, `G 0080:<ORG>` | `L`, `/t1`, HEX records, `G 0100` (no segment) |
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
  segments**, each with its own `C 0080:<address>` command and a 200 ms pause
  before each later one. The gaps between them are **skipped**, not filled with
  zeros.
- Execution starts at the first instruction's ORG. That is the address the final
  `G` uses (`G 0080:0500` for `ORG 0500H`), and it is the address you would type
  by hand.

Skipping the gaps matters for upload time. Measured with the project's offline
harness (not on a board): `examples/assignments/pa27-display-interrupts.asm` fell
from 5895 bytes sent, of which 5864 were zero fill, to about 31 bytes;
`examples/assignments/pa29-motor-speed-display.asm` fell from 291 to 142.

### The historical failure worth recognising

Builds before June 2026 loaded every program at 0100H and started it there,
whatever the ORG said. The code itself still ran from 0100H, so a program that
uses only relative jumps, such as pa19 and pa25, worked with any ORG. Addresses
computed from the ORG pointed elsewhere, and two cases ended in an `ERROR 30`:

1. **An interrupt vector set to the handler's ORG address.** pa28 and pa29 do
   this; pa29 points the timer vector at 0080:0600. The whole program, handler
   included, had been written from 0100H, so nothing was loaded at 0600 and the
   first timer interrupt ran whatever was in that memory.
2. **`G` to an ORG where nothing was loaded.** The terminal's G button sent `G`
   at the program's ORG while the code sat at 0100H.

A student's board reported this:

```
ERROR 30 : Invalid Opcode Exception
 IP   AX   BX   CX   DX   SI   DI   BP   DS   CS   ES   SS   SP   FL
F801 FE91 0000 0000 0000 0000 0000 0000 0080 0080 0080 0F80 0800 0046
```

Which of the two cases produced this dump was not recorded. Programs with
`ORG 0100H` were not affected by either. The same failure can still happen today
if a program installs a vector that points where it loads no code;
`examples/assignments/pa26-irq2-counter.asm` points its IR2 vector at 0080:0800,
where nothing is loaded (see `docs/KNOWN_ISSUES.md`).

**Check which build you are on.** Open a program whose ORG is not 0100H, for
example `ORG 0500H`, and press Upload and Run. The terminal must show
`TX: C 0080:0500` and `TX: G 0080:0500`. If it shows `C 0500` without `0080:`, or
the address 0100, your browser is running an old cached build: force a reload
(Ctrl+Shift+R) and try again.

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
3. Press Upload and Run (it assembles first).
4. All eight LEDs of the Port 2 bar should light and stay lit. The program ends
   in an endless loop, so `--- Program is running on the board. Press PAT RESET
   before the next upload.` in the terminal is expected.
5. Press PAT RESET, wait for `PAT:`, then upload
   `examples/hardware/hw-led-all-off.asm` to clear them again.

That program is 18 bytes: it writes `FFH` into `UCRREG1`, `UCRREG2`, `UCRREG3`,
`UMODEREG` and `UPORT1CTL`, writes the pattern byte to `UPORT2` (`92H`), then
spins forever.

It spins instead of calling EXIT because the monitor resets the MUART ports on
EXIT (`INT 28H` `AH=4`), so the LEDs go off as soon as a program exits (observed
on a board in April 2026). A program that must keep LEDs lit ends in a loop and is
stopped with PAT RESET.

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
| 1 | `probeDisplay()` | Keyboard display buffer at `0000:047D` | Sets DS to 0000, writes `FFH` into the 8 bytes `047D` to `0484`, then returns to the monitor with `INT 28H` `AH=4` (EXIT) so the monitor can refresh the display from that buffer |
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
4. Probes 2 to 4 end in an endless loop, so the terminal shows
   `=== RUNNING (press RESET to stop) ===` and the board stays in that state.
   Probe 1 ends with EXIT, so it should come back to `PAT:` and show
   `=== SUCCESS ===`.
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

### 7.3 Notes from the April 2026 board sessions

These two notes come from the April 2026 lab sessions with a real board. They
are notes, not verified specs, and nothing in this build depends on them. The
display note was taken from the course's `MESSAGE.ASM` and `PATCALLS.INC` at the
time.

- **Text on the keypad display.** The monitor's `WRITE` call (`AH=2`) with
  device `BL=3` (`DKD`, the keypad display), `DI` pointing at the text and `CX`
  holding its length:

  ```
          MOV     DI, OFFSET MSG  ; text
          MOV     CX, 5           ; length
          MOV     BL, 3           ; DKD, the keypad display
          MOV     AH, 2           ; WRITE
          INT     28H             ; USER = 40 decimal = 28H
  MSG     DB      "HELLO"
  ```

  `KYDBUF` (`0000:047DH`) is the monitor's own display buffer; probe 1 writes
  into it. The April notes wrote this call as `INT 40H` and said it is the
  same as `INT USER`. But in `PATCALLS.INC`, `USER` is 40 decimal, which is
  28H, so the call is `INT 28H`. `INT 40H` is a different interrupt (it
  assembles to `CD 40`). This route has not been checked on a board yet.
- **Registers across INT 28H.** On real hardware, `INT 28H` may clobber
  registers, especially `DX`. Save the registers you need before the call.

---

## 8. Troubleshooting

| Symptom | Likely cause | What to do |
|---|---|---|
| No `PAT:` prompt after RESET | Board is not in the monitor, or the link settings differ, or the wrong port was granted | Press PAT RESET again. Confirm the terminal is showing anything at all; garbage characters mean the port is right but the settings are wrong, silence means the wrong port or a dead cable. Disconnect, click Device again, pick a different port |
| **Device** button is greyed out, tooltip `WebSerial: Chrome/Edge only` | The browser does not expose the Web Serial API, or the page is not in a secure context | Open the page in Chrome or Edge, served over https or localhost. The simulator still works in any browser |
| Alert `WebSerial API is not supported in this browser.` | Same cause, hit at click time | Same fix |
| Opened from `file://`, no connection | WebSerial requires a secure context | Serve the folder: `python3 -m http.server 8000`, then open <http://localhost:8000>. Do not double-click `index.html` |
| The browser's port picker is empty | Adapter driver missing, adapter not plugged in, or the port is held by another program | Install the driver and confirm the OS lists the adapter. Close minicom, PuTTY, screen or the Arduino IDE: only one program may hold the port |
| `Error C01: Could not open the serial port. Another program or tab is probably using it. ...` | The port is open in another tab or program | Close other workbench86 tabs and programs such as minicom, PuTTY or a serial monitor. Unplug and replug the USB adapter, then click Device again |
| `Warning W03: This USB adapter has a Prolific PL2303 chip. ...` (Windows) | The port picked in Device belongs to a Prolific adapter (USB vendor 067B). Copies of this chip do not open with Prolific's current driver. The page says so once, before the port opens, and then opens it as usual | Nothing, if the board connects. If `Error C07` follows, see "Prolific PL2303 adapters on Windows" below |
| `Error C07: Could not open the USB adapter (Prolific PL2303 chip). ...` (Windows) | Prolific's current Windows driver refuses older and copied PL2303 chips: the port is listed but does not open, Device Manager shows the adapter as `THIS IS NOT PROLIFIC`, `PHASED OUT` or Code 10, and `chrome://device-log` shows `Failed to open serial port: FILE_ERROR_FAILED` | See "Prolific PL2303 adapters on Windows" below |
| `Error B01: The board reported "ERROR 33 : Uninitialized Interrupt Vector"` | The CPU took an interrupt whose vector nobody set. Likely causes: a DOS or BIOS call such as `INT 21H` or `INT 10H` (the board has neither; the monitor's services are `INT 28H`), `INT 40H` written for `INT 28H` (`USER` is 40 decimal), or an interrupt enabled with `STI` or in the MUART before its vector was written, or written to the wrong vector number. Seen in the lab on 2026-10-16 | Exit with `MOV AH,4` and `INT 28H`. Write each vector before enabling its interrupt. Send the terminal's **Copy** text and the `.asm` if it stays |
| `=== FAILED: the board reported ERROR 30 : Invalid Opcode Exception ===` and a register dump | The CPU ran memory where no code was loaded: `G` went to an address where nothing was written, or an interrupt vector points where the program loads no code | Check that `TX: C 0080:xxxx` matches your `ORG`. If the address is 0100 for a program with another ORG, or has no `0080:`, you are on an old cached build (Ctrl+Shift+R). Check that every vector your program installs points at code it uploads. See section 6 |
| Nothing happens on Upload and Run, status bar says `Error C06: Connect to device first!` | No serial connection | Click Device and grant a port |
| Status bar says `Error A02: Upload cancelled. Fix the assembler errors first:` | The code in the editor does not assemble. Nothing was sent | Fix the error shown, then Upload and Run again |
| Status bar says `Error A01: Upload cancelled: Upload sends assembly. ...` | The active tab is not an `.asm` file | Use Translate to ASM, open the `.asm` tab, then Upload and Run |
| Status bar says `Error U06: Upload in progress. Wait for it to finish.` or `Error U06: Waiting for the board. Try again in a moment.` | Another job (an upload, G, T or Send) is still using the line | Wait for it to end, or press Disconnect to stop it |
| Terminal shows `[WARN] No PAT: prompt.` and stops | The board is not at the monitor prompt. Usually the previous program is still running: it ended in a loop, and a `PAT:` left on screen from before does not mean the board is ready | Press PAT RESET, wait for a new `PAT:`, retry. Press PAT RESET before every upload |
| Terminal shows `[WARN] No response to C command` | The monitor did not echo the address, so this ROM revision may not accept `C` in this form | Reset and retry once. If it repeats, try the Intel HEX path (section 5) |
| Upload takes minutes | Per-byte protocol: each byte waits for a prompt, up to 2 seconds, plus a fixed 50 ms | Expected for large programs. Confirm the byte count in the header line is close to your real program size. Thousands of bytes for a small program means gap filling, that is, the old build (section 6). The HEX path is faster where the board supports it |
| `[!]` markers appear between bytes, program misbehaves | A byte's prompt did not arrive within 2 seconds: bytes dropped or mangled on an unreliable adapter or cable. Earlier builds could also print a false `[!]` in long sessions; this one no longer does | Do not trust that run. Press PAT RESET and upload again. Try a different USB port, cable or adapter, and re-run the LED probe (section 7.1) to confirm the link before blaming your code |
| `[ABORT] The board left change-memory mode. Upload stopped, G not sent.` then `[Error U04] ...` | PAT RESET was pressed during the upload, or the monitor printed an error while bytes were going in | Press PAT RESET, wait for `PAT:`, upload again |
| `--- Program is running on the board. Press PAT RESET before the next upload.` | The program did not return to the monitor within 8 seconds | Normal for programs ending in an endless loop, which includes all the LED examples. Look at the hardware, not the terminal. Press PAT RESET before the next upload; the terminal then shows `[OK] Board is back at PAT:`. If you expect a return, end the program with `INT 28H`, `AH=4` |
| On-board display stays dark while connected to the PC | `INT 28H` `WRCHAR` text goes to the serial terminal while the board is connected (observed on a board in April 2026) | Look for the text in the page's terminal. See the note under this table |
| Step, Run and Reset are disabled and a **Board connected** banner covers the debug panel | Board mode: the program runs on the board's CPU and sends no state back | Nothing to fix. Press Disconnect or **Simulate anyway** to use the simulator. See section 4 |
| Terminal shows `[Warning W01] Serial line error (BreakError). Still listening.` (or `FramingError`, `ParityError`, `BufferOverrunError`) | A line error, which some adapters report when PAT RESET is pressed | Nothing to fix. The page keeps reading. Press PAT RESET if you were about to upload |
| `[Error C04] Board link lost (...). Click Device to reconnect.` | Adapter unplugged, board powered off, or a fatal read error. The page has disconnected | See "After a serial port error" below |
| `[Error C05] Serial write error: ... Click Disconnect, then Device to reconnect.` | The page could not write to the port. The upload stopped without `G` | Click Disconnect, then Device, press PAT RESET, upload again |
| Program works in the simulator, faults on the board | Stack assumptions, or a peripheral difference | Check `SS`: on the board it was `0F80` while `CS` and `DS` were `0080`. Set up your own stack. See section 6 |

### After a serial port error

Earlier builds stopped reading after the first serial error while the header
still said "connected", so later uploads could not work. That was reproduced with
the offline harness, not yet on a board. This build handles it like this:

- A line error (`BreakError`, `FramingError`, `ParityError`, `BufferOverrunError`)
  is printed in the terminal and the page keeps reading. Nothing to do.
- If the link is really gone, the page disconnects by itself and prints
  `Board link lost (...)`. Check the cable and the adapter, click **Device**, pick
  the port, press PAT RESET and wait for `PAT:`, then upload again.
- If **Device** then says `Could not open the serial port`, close other tabs and
  programs that use the port, unplug and replug the adapter, and click
  **Device** again.

### Prolific PL2303 adapters on Windows (Error C07)

Many cheap USB to RS-232 adapters carry a copy of Prolific's PL2303 chip (USB
`067B:2303`). Prolific's current Windows driver refuses copies and older chips:
Chrome lists the port, often as `USB-Serial Controller (COMx)`, but it does not
open. Several groups hit this in the lab on 2026-10-16. Mac and Linux are not
affected; their own drivers accept these chips.

On Windows the page recognises the adapter when you pick its port in Device:
before the port opens it prints `Warning W03` (once per page), then opens the
port anyway, because a genuine chip, or a copy with the old driver, works. If
the open fails, `Error C07` follows. A student fixed that on Windows like this:

1. With the adapter plugged in, open Device Manager. Under Ports (COM & LPT),
   right-click the `THIS IS NOT PROLIFIC PL2303...` entry, choose Uninstall
   device, tick "Attempt to remove the driver for this device", and unplug the
   adapter.
2. Install an older Prolific driver. Prolific no longer offers these, so they
   come from copies on the web; the class used a copy from a third-party GitHub
   repository with two versions:
   - First try the driver package 3.8.38.2 (a `.cab` file). Copy its four files
     (`ser2pl.inf`, `ser2pl.cat`, `ser2pl.sys`, `ser2pl64.sys`) into a folder,
     then Update driver, Browse my computer for drivers, Let me pick from a list,
     Have Disk, and choose that folder. Its catalog is signed by Microsoft
     (Windows Hardware Compatibility Publisher) and Windows checks that signature
     before installing, so a modified package does not install. No program runs.
   - If the adapter still shows `THIS IS NOT PROLIFIC`, the fix that worked in
     the lab was the 3.3.2.105 installer, run as administrator. It is an
     InstallShield `setup.exe` without a digital signature, so where it came from
     cannot be checked. On 2026-10-16 VirusTotal listed no detections for it
     (SHA-256 `81993c22b2daa5cd3c0efaee68cfc4a7100fd5956ea8da06346cf42cf3373aff`).
     Running it is the student's own decision.
3. Plug the adapter into the same USB port. Device Manager should show
   `Prolific USB-to-Serial Comm Port (COMx)` with the older driver version. If
   it still shows the new name, choose Update driver, Browse my computer for
   drivers, Let me pick from a list, and select the older version.
4. Optional: Windows Update may put the new driver back. System Properties
   (`sysdm.cpl`), Hardware, Device Installation Settings, No stops that, but it
   stops automatic driver downloads for every device.

An adapter with an FTDI, CH340 or CP2102 chip avoids all of this.

### Error codes

Every failure the page can detect prints a short code, in the terminal as
`[Error U01] ...` and in the status bar as `Error U01: ...`. Warnings use
`Warning W01`. The letters keep them apart from the board's own numeric
`ERROR 30` lines. When a student reports a problem, the code says where it
stopped. **Copy** also puts one line in front of the log with the build
version, the browser, the last code and the last upload (file, ORG, segments,
bytes).

| Code | Meaning | What to do |
|---|---|---|
| C01 | The serial port could not be opened; another tab or program is using it | Close other workbench86 tabs and programs such as minicom or PuTTY, unplug and replug the adapter, click Device |
| C02 | The port is still open from an earlier connection and could not be reopened | Unplug and replug the adapter, click Device |
| C03 | Other error while opening the port | Unplug and replug the adapter, click Device |
| C04 | Board link lost: adapter unplugged, board off, or a fatal read error | Check the cable, click Device, PAT RESET |
| C05 | Writing to the port failed | Disconnect, then Device |
| C06 | Not connected | Click Device |
| C07 | Windows could not open a Prolific PL2303 adapter; usually its driver refuses the chip | See "Prolific PL2303 adapters on Windows" above, or use an adapter with an FTDI, CH340 or CP2102 chip |
| U01 | The board did not answer the first CR; usually the previous program is still running | PAT RESET, wait for `PAT:`, Upload again |
| U02 | No reply to the `C` command | PAT RESET and try again; if it repeats, copy the log |
| U03 | No `PAT:` after writing a segment | PAT RESET and try again |
| U04 | The board left change-memory mode during the upload (PAT RESET pressed, or an error); `G` was not sent | PAT RESET, wait for `PAT:`, Upload again |
| U05 | The connection closed during the upload | Reconnect with Device, Upload again |
| U06 | Another job (upload, G, T) is still running | Wait for it to finish |
| U09 | Unexpected result | Copy the log and report it |
| A01 | The active tab is not an `.asm` file | Translate to ASM, open the `.asm` tab |
| A02 | The code does not assemble; nothing was sent | Fix the assembler errors |
| A03 | The program is empty | Write or open a program |
| B01 | The board printed an `ERROR` line after `G`, for example `ERROR 30 : Invalid Opcode Exception` or `ERROR 33 : Uninitialized Interrupt Vector` | ERROR 30: check that `TX: C 0080:xxxx` matches your ORG and that interrupt vectors point at loaded code (section 6). ERROR 33: see the troubleshooting table |
| W01 | Serial line error (Break, Framing, Parity, Overrun); the page keeps listening | Usually nothing; some adapters do this during PAT RESET. If it repeats, check the cable |
| W02 | Some bytes got no reply from the board during the upload | If the program misbehaves, PAT RESET and upload again |
| W03 | Windows: the adapter picked in Device has a Prolific PL2303 chip, and copies of it do not open with Prolific's current driver. Said once, before the port opens; the page then opens it anyway | Nothing, if the board connects. If C07 follows, see "Prolific PL2303 adapters on Windows" above |

### The dark display

The reported symptom is that the on-board display appears to go dark while the
board is connected to a PC.

**Observed on a board in April 2026:** while the board is connected to the PC,
text printed with `INT 28H` `WRCHAR` goes to the serial line and shows up in the
page's terminal, not on the 7-segment display. The display simply has nothing to
show. Whether `WRBYTE` and the other text calls do the same was not recorded.

**Still unconfirmed: a way to light the display.** A program that needs the
physical 7-segment display should drive it without the `INT 28H` text calls. The
April 2026 build tried writing 7-segment codes straight into `KYDBUF`
(`0000:047D`), as `examples/scripts/keyboard-display-nezih.asm` does, but it is not
confirmed that this lights the display, and the controller address in section 7.2
is still unknown. If you test it on a board, please report the result.

---

## 9. Known unsolved items

Stated plainly, so you do not spend a lab session rediscovering them.

1. **Keypad and display controller address: unknown.** Four rival probes ship
   (section 7.2) and none has been confirmed on hardware.
2. **The board's keypad: not visible to the page.** The only input path
   modelled is `INT 28H` `GETIN`, which in the simulator reads the PC keyboard,
   and there is no live port bridge (item 4). What `GETIN` returns for a
   program running on a board that is connected to the PC, a key from the
   keypad or a character from the serial line, has not been recorded.
3. **The dark display: cause seen, no fix confirmed** (see section 8). While the
   board is connected, `WRCHAR` text goes to the serial terminal. A way to light
   the display, such as writing to `KYDBUF`, has not been confirmed.
4. **No live per-port bridge.** The supported hardware path is program upload
   only: assemble, then Upload and Run. There is no mirroring of individual
   `IN`/`OUT` operations to the board while the simulator runs. The Ports dialog
   reads and writes the simulator's port array, never the board.
5. **The upload path of this build is verified offline only.** The April 2026
   build was seen working on a board with `C 0080:0100` and `G 0080:0100`.
   `C 0080:<ORG>` and `G 0080:<ORG>` at other ORGs, the per-segment upload of
   multi-ORG programs, and the new checks of this build were verified with the
   offline harness and in the simulator, not on a real board. A confirmation
   from a lab board is wanted.
6. **The `T 0080:xxxx` form has not been seen on a board.** The T button now
   traces at the ORG of the last upload instead of always 0100.
7. **The `[ABORT]` check rests on one assumption.** It stops an upload when the
   board prints `PAT:`, `ERROR` or a form feed during change-memory mode, which
   assumes the monitor never prints those in that mode. One real change-memory
   transcript would confirm it.
8. **The Intel HEX path is hardcoded to 0100H** for both the record addresses
   and the final `G`, its `G` has no `0080:` prefix, and it has no button in
   the user interface.
9. **The probe routines have no buttons in this build** and must be called from
   the browser console.

If you resolve any of these on a physical board, especially item 1, record what
you did and what you saw, and pass it to the lab maintainer. The register dump
in section 6 came from exactly that kind of report, and it is why this guide can
warn you about `SS`.
