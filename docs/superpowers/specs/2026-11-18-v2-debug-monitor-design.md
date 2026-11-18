# PTAH V2 — Debug mode, piece 1: the Monitor (design)

Status: draft for the owner's approval, 2026-11-18.
Code: `~/projects/ptah-v2`, branch `debug-monitor`.
Step 4 of the master plan (Debug mode), first of four pieces agreed with the
owner on 2026-11-18, in this order:

1. **Monitor** (this document): the live signal path.
2. Look back: the last minutes on a timeline, from the flight recorder.
3. Why is this light doing that: per-channel provenance.
4. Probes on the running show, and the measured Reaper offset.

Each piece has its own design and plan.

Words: "the owner" is the band's drummer who runs PTAH. "A row" is a show
instance (a line of the Show screen). "The engine" is `ptah run`.

## 1. Intent

When nothing lights, or the wrong thing lights, the owner has no screen
that says where the signal stops. Past trouble was of exactly that kind: a
MIDI port named wrong, Reaper's reset burst counted as unmapped input, a
program that looked late. The Monitor shows one chain, left to right:
**what comes in → what it triggers → what goes out**, live. The broken link
is the column where things stop.

The page only watches. Nothing on it changes the show, the venue or the
engine.

## 2. Goals, non-goals, anti-goals

Goals

1. Every incoming note and control message is listed with the rows that
   listen to it, or `nothing listens`.
2. The rows playing now are listed, so a row that got a note but did not
   start is visible by its absence.
3. Each universe shows its 512 values, its output's state and its real
   frame rate; a cell names its fixture and channel.
4. The timing of the chain is shown in plain words: usual and worst.
5. `Pause` freezes the whole page at one instant, to read a moment.
6. The page costs the engine nothing more than a subscribed client does
   today: no change to the render thread.

Non-goals (later pieces)

- Scrolling back in time beyond what the page itself has kept (piece 2).
- Who wrote a channel and what the merge decided (piece 3).
- Node values of the running show; the measured Reaper offset (piece 4).
- Filtering by device or channel, exporting the list (later, if asked).

Anti-goals

- A wall of numbers: the page must read as three steps, not as a log.
- Clock pulses or Reaper's reset burst drowning the list.
- A list that jumps while the owner reads it.
- A second matcher: the page never decides itself what listens to an
  event (the one-engine rule the owner set for the Builder).

## 3. Approaches

How the page learns what each event triggered.

**A. The engine labels each event, off the render thread (chosen by the
owner).** The engine already decides, for each drained event, whether the
show in force maps it (the live health, on the telemetry side, with the
frame loop's own rules and the show's own lookup tables). That step is
extended to say *what* listens, and the answer travels with the event on
the `events` topic. No render-thread change; one source of truth. Limit: it
says which rows are mapped to the event, not whether a voice started (a row
at its polyphony limit still reads as listening); the `Playing now` column
is the cross-check.

**B. The render thread tags each event with what it did.** Exact, including
refusals. Rejected for now: new work in the most timing-sensitive code for
a rare case; it comes with piece 3, where the render path is opened anyway.

**C. The page matches events against the show file itself.** Rejected: a
second matcher in TypeScript.

## 4. The screen

Route `/debug`. A `Debug` tab, between Builder and Settings. One page.
Three columns from 1080 px of the page's own width; one column below
(same order); the same content on a phone (there is nothing to edit).

```
PTAH  Perform  Venue  Library  Show  Builder  Debug  Settings
[notes] [CC] [other]  [only what nothing listens to]      HILLDALE on Hilldale   [Pause Space]
┌───────────────────────────────┬──────────────────────┬─────────────────────────────┐
│ 1 COMING IN                   │ 2 PLAYING NOW        │ 3 GOING OUT                 │
│ ● ptah · message 0.1 s ago    │ ● pars pulse     2 b │ ● Main · USB Pro · sending  │
│   clock: locked 120.0 bar 12.3│ ● wash chase     6 b │   44 frames/s               │
│ ● SPD-SX · not plugged in     │ ○ strobe hit  ended  │ [512 cells, lit by value]   │
│ MESSAGES                      │ OVERRIDES            │ channel 17 · Par 3 · red·212│
│ bar    from ch message  → rows│ Master 100 %         │ TIMING · last 10 s          │
│ 12.1.0 ptah 1 note C3 100 pars│ Blackout … off       │              usual   worst  │
│ 12.2.0 ptah 2 note D3 90      │ PROBLEMS             │ Note in → frame out 11  21  │
│        nothing listens        │ SPD-SX not plugged in│ Frame out → wire     9  14  │
│ …                             │                      │ Work per frame     0.3 0.9  │
└───────────────────────────────┴──────────────────────┴─────────────────────────────┘
```

The owner saw and accepted this arrangement as a browser sketch
(`ptah-v2/.superpowers/brainstorm/97733-1794961240/content/monitor-proposal.html`).

### 4.1 The top bar

- Filter chips (toggles): `notes`, `CC`, `other`, and `only what nothing
  listens to`. Default: `notes` and `CC` on. Kept in the URL
  (`?show=notes,cc,other&unheard=1`), as the Library keeps its filter.
- What plays: `<show> on <venue>`, or `No show is playing`.
- `Pause` (key Space when no field has the focus): §4.5.

Message kinds:

| Chip | Messages |
| --- | --- |
| `notes` | note on, note off |
| `CC` | CC, 14-bit CC, NRPN, pitch bend, aftertouch |
| `other` | program change, start / stop / continue / song position, OSC, panic (CC 120 and 123 arrive as panic), the transport housekeeping the engine never counts as unmapped (Reaper's reset burst), and the raw CCs that are only a part of a 14-bit CC or an NRPN (§6.1 `part`) |

Clock pulses are never listed; the clock is one line (§4.2). Audio levels
are never listed.

### 4.2 Column 1: Coming in

**Devices.** One line per device of the settings, as the Settings page
words it (`message 0.1 s ago`, `silent`, `not plugged in`, `off`), from the
same source (`GET /devices`, once a second).

**Clock.** One line under the clock master's device (or alone when there is
none): `clock: locked, 120.0 bpm, bar 12.3` / `internal, 120.0 bpm` /
`free-run` / `stopped` / `waiting for Reaper`, from the `clock` topic, with
Perform's words for the clock states.

**Messages.** A fixed-height list, newest at the bottom, in a monospace
face. Columns: bar position, device name, channel, the message, the rows
that listen.

- Bar position: `bar.beat.sixteenth` of the event (§6.1 gives its beat),
  as Perform counts bars; `—` while the clock is stopped or waiting.
- Message words: `note C3  vel 100`, `note C3  off`, `CC 21 = 64`,
  `CC14 21 = 8192`, `NRPN 300 = 12`, `pitch bend +1200`, `aftertouch 64`,
  `aftertouch C3 64`, `program change 4`, `start`, `stop`, `continue`,
  `song position 16`, `OSC /lights/go 1` (the address from §6.1), `panic`. Note names as the rest
  of the app (60 = C3).
- What listens (§6.1), in plain words, names from the show:
  - a row: its name (`pars pulse`); several: joined by ` · `, at most
    three, then `+2`;
  - a setting of a row: `pars pulse: palette`;
  - an override: `blackout`, `master`, …;
  - a song: `song: Second chorus`; a song's section control: `section
    of Second chorus`;
  - nothing: `nothing listens`, in the attention colour;
  - a message the engine does not judge (start, stop, continue, song
    position, panic, housekeeping, a part of a larger message): nothing in
    that cell (it is neither heard nor a problem);
  - no show playing: `no show`, dim.
- A note off reads dim, with the same rows as its note on.
- The list holds the last 500 lines that pass the filters. It never
  re-flows: a new line pushes the oldest out at the top, each line has
  one fixed height, long cells end in `…` with the full text as the cell's
  title.
- Changing a filter re-filters what the page has kept (the page keeps the
  last 2000 events of all kinds).

### 4.3 Column 2: Playing now

**Rows.** One line per row with at least one voice (the `voices` topic):
its name and how long ago its oldest voice started, in beats (`2 b`). A
row whose last voice ended stays 2 s, dim, as `ended`. Order: the show's
row order (a line does not move while it is listed). Scenes count as rows,
by the scene's name. Fixed-height region with its own scroll when there
are more lines than fit.

Two limits, stated on the page in one dim line under the list (`refreshed
4 times a second: a very short hit may not show`): the engine publishes
voices every 250 ms, so a voice that starts and ends between two
publications is never seen; exact starts come with piece 3. On a `ptah
replay` the engine publishes no voices: the region says `not available on
a replay`.

**Overrides.** `Master <n> %`; `Blackout`, `Freeze`, `House lights` each
`on` (attention colour) or `off`, from the `state` topic. (Identify is on
no topic and is not shown.)

**Problems.** The active faults (`faults` topic) in Perform's plain words,
each with its age; empty: `none`.

No show: the Rows region says `No show is playing`.

### 4.4 Column 3: Going out

One block per universe of the playing venue, in venue order:

- A line: the universe's name, its output (`Enttec USB Pro` / `Art-Net
  <host>` / `sACN <universe>` / `no output`), its state in the Venue screen's words (`sending`, `not sent` for
  an sACN universe, or the output fault's plain words in the attention
  colour), and `<n> frames/s`:
  the frames really sent in the last 2 s (from the output's `sent` counter;
  §6.2).
- The 512 cells, 32 per row, each lit by its value (the `frames` topic, 20
  per second). No drawn grid lines beyond the cells' gaps.
- One fixed line under the cells for the pointed or focused cell:
  `channel 17 · Par 3 · red · 212`; unpatched: `channel 400 · no fixture ·
  0`. Fixture and channel names come from the venue and its fixture types,
  as Perform's rig derives them. The cells are reachable by keyboard (one
  tab stop per universe, arrows move).

**Timing · last 10 s** (the `metrics` topic's window):

| Line | From | usual / worst |
| --- | --- | --- |
| `Note in → frame out` | `end_to_end` | p50 / max |
| `Frame out → on the wire` | `publish_to_sent` (+ `sent_to_written` for a USB Pro), the slowest universe | p50 / max |
| `Work per frame` | `frame_work` | p50 / max |
| `Dropped` | the sum of the engine's drop counters (`metrics`) and the server's (`GET /status`, asked every 2 s) since the page opened | a count; in the attention colour above 0, with the breakdown as its title |

A value with no sample yet reads `—`. Milliseconds with one decimal under
10, none above.

No venue (the engine waits): the column says `No venue yet.`

### 4.5 Pause

`Pause` stops applying updates to all three columns at once; the bar reads
`Paused at bar 12.3` and the button `Resume`. While paused the message list
can be scrolled back through what the page has kept, and cells can be
pointed at. The page keeps receiving (so `Resume` is immediate and
`Dropped` stays true), but what arrives while paused is not shown after
`Resume` except the newest state (the list continues from now, with one
line `— paused 14 s —`). Leaving the page drops everything it kept.

### 4.6 Rules that apply everywhere

Tokens only; nothing shifts (every list is a fixed region, every status
word has a fixed box, the cell line is always present); calm when well,
loud only when wrong (the only attention colour on a healthy page is none);
every part reachable by keyboard; stage mode applies as on Perform. The
page subscribes when shown and unsubscribes when hidden or left. Drawing is
batched per animation frame; a burst of 500 control messages in a second
must not drop the page under 30 frames per second on the owner's Mac.

## 5. What the page holds

A ring of the last 2000 events with what listens to each, the latest
`voices`, `state`, `clock`, `metrics`, `faults` and frames, and a paused
copy when paused. No draft, no save, no conflict, no leave guard.

## 6. Engine and server

### 6.1 A new topic, `heard`: events with what listens

The `events` topic is not changed (Perform reads it, and it sends each
event the moment it is drained, before the engine has judged it). A new
WebSocket topic `heard` carries every event again once the live health has
judged it, with the show in force for its frame (about one frame later):

```json
{ "at": 123, "seq": 9, "device": 0, "kind": { "note_on": { … } },
  "beat": 45.5, "judged": true, "part": false, "osc": null,
  "heard": [ { "row": "<instance id>" },
             { "row": "<instance id>", "setting": "palette" },
             { "override": "blackout" },
             { "song": 4 },
             { "song": 4, "section": true } ] }
```

Snapshot: the last 64; deltas: batches, as `events`.

- `heard`: what the show maps the event to, by the same rules and lookups
  that decide the live health's `mapped` (`ShowInfo`), so the two can never
  disagree: an event is `mapped` exactly when `heard` is not empty or it is
  housekeeping. The rows a note or OSC trigger fires; the rows and
  settings a control source is bound to; the override it drives; the song
  a program change selects; the song whose section a CC selects.
- `judged`: false for the kinds the engine does not judge (start, stop,
  continue, song position, panic, an OSC trigger off, internal constants)
  and for transport housekeeping; their `heard` is empty and the page
  shows no "listens" word. A note off is judged: it lists the rows of its
  note.
- `part`: true for a raw CC that the parser also folds into a 14-bit CC
  or an NRPN that the show reads (the MSB/LSB or the NRPN select and data
  CCs): the assembled message follows as its own entry with the real
  `heard`; the part has an empty `heard` and shows only under `other`.
- `osc`: the route's address for an OSC event (events carry only the
  route's index), else null.
- `beat`: the engine's song beat for the event's frame, null while the
  clock is stopped or waiting.
- No show playing: `heard` is null.
- Built off the render thread, where the live health judges; allocation
  is allowed there. The render thread, the event ring, the `events` topic
  and the recorder's files do not change.
- The page turns ids into names with the playing show's file (`GET
  /shows/{id}`), read when `state.showInfo` changes.

### 6.2 Frame rate

`metrics.counters.outputs[]` already carries each output's `sent` count.
The page derives frames per second from the change of `sent` over the last
2 s of messages. If the `metrics` messages carry no engine time to divide
by, they gain one (`at`, engine ns).

### 6.3 The old `/debug` page

`crates/ptah-server/static/debug.html` is deleted, as its header says it
would be when Step 4 ships; `/debug` and everything under it is the app's
route (the server's own `/debug` route and its JSON 404 for `/debug/…` go;
`tests/debug_page.rs`, the README's and `docs/engine.md`'s mentions and
the replay command's help are updated). `ptah replay
--ui-port` and `ptah tui` keep working: the Monitor is what one opens on a
replay.

## 7. Where the code goes

- `crates/ptah-engine`: the judged events (`heard`, `judged`, `part`,
  `osc`, `beat`) next to the live health; the `ShowInfo` lookups they
  need; their subscription for the server.
- `crates/ptah-server`: the `heard` topic; `metrics.at`; the old page and
  its route removed.
- `packages/ds/src/debug/`: `MonitorScreen` and its parts (`MessageList`,
  `DeviceLines`, `PlayingRows`, `Overrides`, `Problems`, `UniverseBlock`
  with its cells, `TimingTable`, `MonitorBar`), a pure `model/` (the event
  ring and filters, message words, heard words, rows from voices, frame
  rate, timing lines, pause), stories and tests; entry
  `@ptah-app/ds/debug`.
- `apps/web/src/debug/`: `MonitorPage`, `useMonitor` (subscriptions, the
  ring, pause, visibility), the route and the tab.
- Docs: `docs/api.md`, `docs/app.md`, `docs/engine.md`,
  `docs/design-system.md`.
- No new dependency is expected.

## 8. Testing and exit

- Rust: `heard` for each kind (a note two rows listen to; a note nothing
  listens to; a note off; a CC bound to a setting; a CC nothing reads; a
  14-bit CC and an NRPN with their parts; an override trigger; a program
  change that selects a song; a section CC; OSC with its address; start
  and panic not judged; the housekeeping burst; no show); for every event
  of a recorded run, `mapped` of the live health equals "`heard` not empty
  or housekeeping"; `beat` null when stopped; the `heard` topic's snapshot
  and deltas; the `events` topic unchanged; the allocation guard of the render thread is unchanged.
- ds: the model (filters, the 500 and 2000 limits, words for every message
  kind, heard words and the `+2` rule, rows from voices with the 2 s
  `ended`, frame rate from counters, timing lines, pause and resume);
  stories for well, nothing listens, no show, no venue, a fault, paused,
  several universes, a burst; a no-shift check while messages stream;
  the frame-cost gate with the burst story; boards at 1280×800, 960×800
  and 390×844.
- web: subscriptions on show and hide, the ring across a filter change,
  pause and resume, the show's names read again when the show changes.
- e2e against the real binary with fake I/O: play a MIDI file with `ptah
  play-midi` (or the harness's fake MIDI) on a show; the list shows a note
  with its row and a note with `nothing listens`; the row appears under
  `Playing now`; a cell of the universe lights; `Pause` holds the list
  while events continue; the phone width shows the three blocks.

Exit: with Reaper sending the band's show, the owner sees each note with
its row, the rows playing, the cells lit, and the timing; unplugging the
controller and sending a note on an unmapped channel are both visible
within a second. Owner check in `docs/ledgers/debug-monitor-owner-check.md`.

## 9. Left to the builder

- Where exactly the labelling runs (telemetry thread or owner step) and
  how `ShowInfo` exposes the lookups.
- The ring's structure and the batching of draws.
- Widths, the heights of the fixed regions, the cells' size, within the
  tokens and the no-shift rule.
- The exact words for the output faults and clock states (reuse
  Perform's and the Venue screen's).
- Where the page gets the server's drop counters, within §4.4.

## 10. Calls made by the author (not the owner's decisions)

1. The tab is named `Debug`, between Builder and Settings; later pieces
   become sub-pages of it.
2. `heard` means "mapped to", not "started"; `Playing now` is the
   cross-check (approach A's limit, told to the owner). `Playing now`
   itself is refreshed 4 times a second, so a very short hit may not
   show, and it shows no light count (the engine's voice list cannot give
   one); both are said on the page or here, and exact starts come with
   piece 3.
12. Labelled events travel on a new topic, `heard`, about one frame after
    `events`; `events` and Perform are untouched.
13. Identify is not shown. Panic, start, stop and the parts of 14-bit and
    NRPN messages show no "listens" word and sit under `other`.
3. Clock pulses are never listed; housekeeping is listed only under
   `other`, with an empty "listens" cell.
4. Newest message at the bottom; 500 lines shown, 2000 events kept.
5. An ended row lingers 2 s.
6. `usual` is the median and `worst` the maximum of the last 10 s.
7. Frames per second is measured from the output's sent counter, over 2 s.
8. Pause does not replay what arrived while paused.
9. The old `/debug` page is deleted and its address reused.
10. Filters live in the URL; no filter by device or channel yet.
11. No separate Claude Design round: the page is built from existing
    parts and the sketch the owner accepted.
