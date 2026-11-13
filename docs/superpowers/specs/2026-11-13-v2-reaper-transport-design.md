# PTAH V2 — Reaper transport from the page (design)

- **Date:** 2026-11-13
- **Status:** approved in conversation (approach A, layout B from the mockups), builder-checked
- **Repo:** `~/projects/ptah-v2` (V1 is never modified)
- **Origin:** finding F of the 3A owner check,
  `docs/ledgers/step3a-owner-findings-2026-11-12.md`
- **Builds on:** the 3A design
  (`2026-11-11-v2-step3a-app-shell-perform-design.md`): the Perform page, the
  Emergency row, the palette, the `ptah` virtual MIDI input.

## 1. Intent

At the kit, between songs, the drummer wants to start Reaper, stop it, and
go back to the beginning without reaching for the laptop. The page (laptop
or phone) already shows the band and the emergencies; it gains the three
transport controls. Nothing about who owns time changes: Reaper stays the
master clock, PTAH follows it as today. This is one path back to Reaper,
nothing more.

## 2. Goals, non-goals, anti-goals

Goals
- Start, Stop and Go to beginning of Reaper from the page, laptop and phone,
  and from the palette.
- One Reaper checkbox to set up, done once; survives Reaper restarts.
- The page never lies: a transport button that cannot reach Reaper says so.

Non-goals
- Reaper's transport state or position fed back to the page (that is the
  OSC path, approach B, later if wanted). The page keeps inferring
  "playing" from the clock as today.
- Record, pause, loop, tempo, song selection in Reaper. Only the three.
- Driving any DAW other than Reaper; the messages are standard MMC and
  notes, but only Reaper is set up and tested.

Anti-goals (a failure even if it works)
- An accidental Stop mid-song from a stray touch or key.
- A second MIDI port that confuses the clock path: the output must never
  be mistaken for the input in Reaper, and nothing PTAH sends may reach a
  Reaper track as notes.
- Any change to the Perform column's existing rows' geometry (the 2C
  "nothing shifts" rule); the new row is added below, fixed height.

## 3. Constraints

- The engine's MIDI layer: `ptah_io::midi::out::MidirOut::virtual_port(name)`
  creates a CoreMIDI/ALSA virtual output; the input side already creates
  the `ptah` virtual input from `settings.devices[].virtualPortName`.
- The render thread stays allocation- and lock-free; sending MIDI happens
  off it (the MIDI worker or the owner thread), as the input does.
- Spec copy, tokens, motion, touch targets, hold timing (600 ms) and the
  one-hairline rule of 2C/3A bind the page.
- Reaper: a virtual input appears in Preferences → MIDI Devices; it must be
  enabled with "Enable input for control messages". Whether Reaper acts on
  MIDI Machine Control natively on such an input is not confirmed by any
  source found; the design carries a fallback that MIDI-learn can bind.
- No new dependencies expected (midir already does virtual outputs).

## 4. Approaches considered

- **A. MMC over a second virtual MIDI port** (chosen): the engine opens an
  output; a `transport` command sends MMC Play / Stop / Locate 0, and in the
  same burst three plain notes on a reserved channel as the MIDI-learn
  fallback. No network; one Reaper checkbox; no feedback.
- B. OSC to Reaper's built-in OSC surface: `/play`, `/stop`, `/time 0` over
  UDP to the laptop; Reaper answers with transport state and position. More
  setup (an OSC device and ports in Reaper), a network stack at the venue;
  the only path with a documented reply. Kept as the upgrade: the page
  controls and the `transport` command are the same, only the sender
  changes.
- C. Reaper's web remote (HTTP action URLs, `/_/TRANSPORT`): same shape as
  B over HTTP; less common; not chosen.

Why A: it is what the owner asked for ("reuse the MIDI connection"), it
reuses a path already trusted on stage, and it costs one checkbox.

## 5. The design

### 5.1 The port

- One virtual MIDI **output** named by a new settings key
  `transportPortName` (string, default `"ptah transport"`; `null` disables
  the feature). It is distinct from the input's `virtualPortName` so Reaper
  shows two devices: `ptah` (Reaper's output to us) and `ptah transport`
  (our output to Reaper). A settings file whose two names are equal is an
  error-level issue in `ptah check` (the venue of confusion the anti-goal
  names).
- Owned by the engine, not by the MIDI input worker (which only exists
  when a device is enabled, and not at all under `--fake-io`): a
  `TransportSink` trait in `ptah-engine` (`send(action) -> Result`), with
  the midir virtual-output implementation in `ptah-io` and a recording fake
  under `--fake-io`, handed in through `EngineConfig` like the output sinks.
  Opened once at engine start whenever `transportPortName` is set, kept
  open for the run, closed at shutdown. Creation failure is a fault
  `transport.unavailable` (state, warning) with the OS message as subject;
  the engine runs on. `GET /api/v1/server` gains `transport: { port:
  string|null, open: bool }` so the page can tell before it offers the
  controls. (`/server` is where the page already reads the run's facts;
  the field is additive.)
- `--fake-io` fakes the output like the rest: the fake records what was
  sent; `GET /api/v1/status` `counters.transport` gives `{ sent, failed }`
  per action for tests and for `/debug`.

### 5.2 The messages

One `transport` action sends, in this order, on the output:

| Action | MMC (SysEx, device id `7F` = all) | Fallback note (channel 16, velocity 127, note-off 10 ms later) |
| --- | --- | --- |
| `play` | `F0 7F 7F 06 02 F7` (Play) | note 0 |
| `stop` | `F0 7F 7F 06 01 F7` (Stop) | note 1 |
| `home` | `F0 7F 7F 06 44 06 01 00 00 00 00 00 F7` (Locate 00:00:00:00) | note 2 |

Both are always sent; a Reaper that honours MMC acts on the SysEx and
ignores the notes. The input is enabled in Reaper for control messages
only (not as a track input), so the notes can reach no track; the owner
check verifies that with an armed track set to all inputs. A Reaper that
does not honour MMC gets the three actions learned once from the notes. Channel
16 and notes 0–2 are chosen to collide with nothing a show maps (the
engine's own input is a different port anyway). The three byte strings
are constants with a unit test each; nothing is configurable beyond the
port name.

### 5.3 The command and the API

- Engine command `Transport { action: Play | Stop | Home }`. It never
  enters the render thread's command rings: like `LoadShow`, which the
  server's owner routes to the loader instead of the API ring, `transport`
  is routed by the owner to `Engine::transport(action)`, a synchronous
  call into the sink (a few bytes written on the owner thread, never on the
  render thread), whose `Result` the owner turns into the usual ack shape
  itself, with no ack ring involved. Ack `ok`, or refusal `"transport port unavailable"` when
  the output is disabled or failed to open, `"transport send failed"` on
  an OS error (counted in `counters.transport.failed`).
- `POST /api/v1/commands` `{ "type": "transport", "action": "play" |
  "stop" | "home" }` → the usual ack shape. Documented in `docs/api.md`
  "Commands" and `docs/engine.md` "Commands and acks".
- `ptah tui`: no change (the TUI is a readout).

### 5.4 The page

- A **Transport** section of its own, directly under Emergency, chosen by
  the owner from two mockups (2026-11-13; the merged two-row section was
  the other). Its label row (`TRANSPORT`, 28 px, no keys on the right) and
  then three buttons in one 40 px row, label on the left and the key
  caption on the right (`Start  P`, `Stop  S hold`, `Go to start  H`), with
  the 8 px gap and 20 px side padding of Emergency. No second hairline:
  the column keeps its one hairline above Emergency; the label row's
  spacing separates the two sections. Hold buttons keep the 2 px hold line
  along the bottom edge. On a coarse pointer the ds tap rule lifts the hit
  area to 44 px as it does in the Shell strip. The section costs 76 px
  (28 + 40 + 8): Emergency moves up by that much and the scrolling middle
  gives it up, on the laptop column and the phone alike; a one-time layout
  change accepted by design (the Perform boards are re-baselined once with
  that diff named), not a shift at run time: nothing moves when a value
  changes. Three buttons:
  - **Start** — a press. Caption key `P`.
  - **Stop** — a **hold** of 600 ms, exactly like Blackout: press-and-hold
    with the ring, key `S` held. A tap does nothing but show the ring
    start, as Blackout does. This is the anti-goal's guard.
  - **Go to start** — a press. Caption key `H`. Allowed while playing (it
    is a locate; Reaper keeps playing from 0).
- Keys `P`, `S`, `H` follow the Emergency rules: only on the board, never
  while typing or while a dialog is open, no auto-repeat. (`L`, `B`, `F`,
  `R`, `C`, `F2`, `⌘K` stay what they are.)
- Palette, group `Transport`: `Start Reaper`, `Stop Reaper` (the palette is
  a deliberate act, no hold, as for Blackout), `Go to start`.
- No status word of its own: the band and the clock readout already say
  whether Reaper plays (`locked`), is stopped or lost, and a second readout
  could only disagree with them. The row has one state beyond "ready":
  when `/server` says the port is not open, the three buttons are
  disabled, their key captions replaced by the dim word `no transport`,
  and the title reads `transport port not open (settings.transportPortName)`.
  The row's geometry is identical in both states.
- A refused or failed command shows as a fault toast with the engine's
  message, as every command does.
- Phone: the row renders at 390 px with the same 44 px targets; the palette
  entries are reachable through the Commands button added in 3A.
- Checklist: no new row. (Reaper's state remains inferred; the checklist's
  port row keeps `waiting for Reaper` / `Reaper connected`.)

### 5.5 Stories, boards, tests

- ds: Transport row stories (normal, stage, phone, `no transport`,
  `stopped`, `playing`), under the axe, tap, no-shift and visual gates;
  boards `perform-transport` at COLUMN and PHONE (the existing Perform
  boards gain the row only if the row is part of the Perform composition
  by default — it is — so the Perform boards are re-baselined once, with
  the diff explained as the added row below the column and nothing else
  moved; the no-shift play must prove the rows above did not move).
- Engine: unit tests for the three byte strings; an engine test that a
  `transport` command under `--fake-io` acks ok, records the MMC and the
  note pair in the fake output in order, and bumps `counters.transport`;
  a refusal test with `transportPortName: null`; the `ptah check` issue for
  equal port names.
- Server: `/server` carries `transport`; the command route round-trips.
- Web: unit tests for the row's state words and the key rules; the e2e
  gains one step: on the board, hold `S` 600 ms → `POST /commands`
  `transport stop` acked and `counters.transport.stop.sent == 1`; press
  `P` → `play` sent; `H` → `home` sent.
- Owner check (added to the 3A owner ledger as criterion 6): with Reaper's
  `ptah transport` input enabled for control messages, Start starts Reaper,
  the hold on Stop stops it, Go to start relocates; record whether MMC
  acted directly or the three notes had to be learned.

### 5.6 Documentation

- `docs/app.md`: a "Transport" section: the three controls, the keys, the
  hold, and the Reaper setup in four lines (Preferences → MIDI Devices →
  `ptah transport` → **only** "Enable input for control messages", not
  "Enable input", so nothing PTAH sends can reach a track; if
  Start does nothing, Actions → Transport: Play / Stop / Go to start →
  Add MIDI learn → press the control on the page).
- `docs/engine.md`: the command, the ack messages, the fault, the counters,
  the settings key; `docs/api.md`: `/server.transport`, the command body;
  `schemas/settings.schema.json` + `packages/model-tools` mirror:
  `transportPortName`.

## 6. Left to the builder

- Where the MIDI worker holds the output and how the owner thread hands it
  the action (a channel like the input events, or the worker polling a
  small ring), as long as nothing touches the render thread.
- The exact CSS of the row (reusing Emergency's module), and whether the
  section is split or renamed, within the no-shift and one-hairline rules.
- Test fixtures for the fake output's record.

## 7. Builder check

A fresh builder read the document and asked four questions; all four are
settled in the text above. The calls made, for the owner to glance at:

1. **Layout** (§5.4): shown to the owner as two mockups (laptop and
   phone, normal and stage): A, a merged "Emergency · Transport" section
   with two 72 px rows; B, a separate Transport section with a label row
   and one 40 px row of inline-key buttons. The owner chose **B**. The
   controller's one adjustment: no second hairline (the column's
   one-hairline rule), the label row's spacing does the separation.
   Emergency moves up by 76 px; accepted as a one-time change; the boards
   are re-baselined once.
2. **Reaper flags** (§5.2, §5.6): the `ptah transport` input is enabled for
   control messages only, never as a track input, so the fallback notes can
   reach no track; they stay always sent.
3. **Engine seam** (§5.1, §5.3): the port is an engine-owned
   `TransportSink` with a midir implementation and a `--fake-io` fake,
   opened whenever the setting is set regardless of MIDI devices; the owner
   calls `Engine::transport` synchronously and builds the ack itself.
4. **Status word** (§5.4): dropped. The band already carries the clock
   state; the row only has the `no transport` disabled state.
