# PTAH V2 — Debug mode, piece 2: Look back (design)

Status: approved by the owner, 2026-11-18.
Code: `~/projects/ptah-v2`, branch `debug-look-back`.
Step 4 of the master plan, second of the four pieces agreed on 2026-11-18
(1 Monitor, merged; **2 Look back**; 3 Why is this light doing that; 4 live
probes and the measured Reaper offset).

Words: "the owner" is the band's drummer who runs PTAH. "The recorder" is
the engine's flight recorder (`runtime/recorder/`). "A run" is one life of
`ptah run` (a restart starts a new run). "The session" is everything the
recorder still holds, across runs. "The cursor" is the moment looked at.

## 1. Intent

Something goes wrong in the second chorus. The owner cannot stop the band
to look, and the live Monitor only shows now. Look back shows the same
three columns as the Monitor, frozen at any moment of the session, on a
timeline with the owner's own marks: what came in, what was playing, what
went out, at that instant.

The owner's answers (2026-11-18): they will look after the song or the
set, not at once, so PTAH keeps the whole session and gives them a **Mark**
key to flag the moment while playing (choice B); the past is shown from
what was recorded then, on the Monitor's own screen (approach A).

## 2. Goals, non-goals, anti-goals

Goals

1. The session is kept long enough for a rehearsal: 180 minutes by
   default.
2. `Mark` (a key on Perform, a button on the Debug page) drops a flag at
   this instant, without stopping or changing anything.
3. A timeline of the whole session shows activity, marks, problems and
   the stretches PTAH was not running; a second strip shows the minute
   around the cursor.
4. At the cursor the page shows the messages around that moment with what
   listened **as judged then**, the rows that were playing, the overrides,
   the problems active then, and the lights as recorded.
5. The owner moves by dragging, by steps (a picture, a bar), by jumping
   between marks and problems, and by playing from the cursor at real
   speed.
6. Recording more costs the render thread nothing, and reading the past
   never slows the live engine.

Non-goals

- Saving a session under a name, keeping it across weeks, a list of
  sessions (the owner's choice C; later if wanted).
- Re-running the engine on a recording (approach B; perhaps with piece 3).
- Who wrote a channel (piece 3); node values (piece 4).
- Timing figures for the past; exporting; editing anything.
- A mark bound to a pad or a MIDI note (later, with the trigger bindings).

Anti-goals

- A past re-guessed with today's files: names and "what listened" are
  those of the moment, or the page says it was not recorded.
- A timeline one must hunt through: marks and problems are one key away.
- Reading three hours of files on every page open.
- Any write to the show, the venue or the engine from this page, except
  the mark.

## 3. Approaches

**A. The Monitor at a past moment, from what was recorded (chosen).** The
recorder additionally keeps what listened to each message, the playing
rows, the show's names and the marks. The server serves an overview of the
session and windows of it; the page reuses the Monitor's parts. The past
is shown as it was judged then; scrolling is instant. Limit: recordings
made before this change show messages and lights only.

**B. Re-run the engine on the recording.** Exact and complete, but a
second engine beside the live one, a jump to minute 40 re-runs 40 minutes,
and it replays with today's files. Kept for piece 3 if needed.

**C. A list of the recorded lines.** A log, not an answer.

## 4. The screen

The Debug tab has two views, chosen by a segmented control at the left of
its bar: `Live` (`/debug`, the Monitor, unchanged) and `Look back`
(`/debug/back`). The cursor is in the URL (`?at=<unix ms>`), so a reload
keeps the moment.

```
[Live|Look back] [notes][CC][other][only what nothing listens to]      [◀][▶] [Play Space] [Mark now M]
21:42:07 · bar 49.3     14 min ago · HILLDALE on Hilldale     ▼ your marks  ▼ problems  ▨ PTAH was not running
┌──────────▼────────────▼▨▨────────────────────────▼──────────────────────────┃▼────────▼─────┐
│ ▁▂▃▅▃▂▁▂▃▅▆▅▃▂     (activity of the whole session)                         ┃              │
└────────────────────────────────────────────────────────────────────────────────────────────┘
19:05 · session start        19:45          20:25          21:05                  21:56 · now
┌──────────────────────────────────────────────┃▼─────────────────────────────────────────────┐
│ ||  | |||  |  ||   | (one tick per message, the minute around the cursor)                    │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
−30 s        bar 41        bar 45        bar 49.3        bar 53        bar 57            +30 s
┌───────────────────────────────┬──────────────────────┬─────────────────────────────┐
│ CAME IN · around this moment  │ WAS PLAYING          │ WENT OUT                    │
│ 49.2.2 ptah 1 CC 2 = 38  sine…│ ■ sine (pars)    6 b │ Main · frame of 21:42:07.05 │
│▶49.3.0 ptah 1 note E3 127 flas│ ■ flash (strobes)0 b │ [512 cells as recorded]     │
│ 49.3.2 ptah 1 note C3 off (dim│ OVERRIDES            │ channel 17 · Par 3 · red·212│
│                               │ PROBLEMS THEN  none  │                             │
└───────────────────────────────┴──────────────────────┴─────────────────────────────┘
```

The owner saw and accepted this arrangement as a browser sketch
(`ptah-v2/.superpowers/brainstorm/86968-1794997853/content/lookback-proposal.html`).

### 4.1 The bar

- `Live` / `Look back`.
- The Monitor's four chips, with the same meaning and the same URL keys;
  they filter the message list and the zoom strip's ticks.
- `◀` and `▶` (keys `[` and `]`): the previous and the next flag (a mark,
  a problem's start, or a restart), titled `previous mark or problem` /
  `next mark or problem`. Disabled with none on that side.
- `Play` / `Stop` (Space, unless a field has the focus): §4.6.
- `Mark now` (key M): §4.7.

### 4.2 The header line

`<clock time> · bar <b>` of the cursor (the bar as the Monitor counts it;
`—` while the clock was stopped), `<n> min ago` (`s`, `min`, `h min`), and
what was loaded then: `<show> on <venue>`, or `no show`. At the right, the
legend: `▼ your marks`, `▼ problems` (attention colour), `▨ PTAH was not
running`.

### 4.3 The session strip

From the oldest moment kept to now, one fixed-height strip:

- activity: one bar per column of pixels, its height the count of notes
  and control messages in that stretch (clock pulses not counted), capped;
- flags above it: marks (text colour) and the start of each problem
  (attention colour);
- hatched stretches where nothing was recorded (PTAH stopped or
  restarting, or the recorder had failed);
- the cursor (accent colour), and a faint band for the stretch the zoom
  strip shows.
- Labels under it: `<time> · session start` at the left, `<time> · now`
  at the right, and round times between.

Click or drag moves the cursor. A click in a hatched stretch goes to the
nearest recorded moment. The strip's right edge is "now" as of the last
overview read; the overview is read again every 10 s while the page is
visible, and the strip then grows at the right without moving the cursor.

### 4.4 The zoom strip

The 60 s around the cursor (30 before, 30 after), one tick per listed
message at its instant: notes tall, controls short, a message nothing
listens to in the attention colour; folded lines (the Monitor's rules)
count once. Flags as on the session strip. Labels: `−30 s`, bar numbers
on round bars, `+30 s`. Click or drag moves the cursor. The cursor stays
in the middle: moving it scrolls the strip.

### 4.5 The three columns, at the cursor

They are the Monitor's parts with past words.

**Came in · around this moment.** The Monitor's message list for the
window around the cursor (same words, folding, chips). The newest message
at or before the cursor is highlighted; later lines are dim. The list is
centred on that line; it scrolls only by moving the cursor. What listens
is what the engine judged then, with the names of then (§6.1). A
recording older than this feature has no judgement: the listens cell reads
`not recorded`, dim.

**Was playing.** The rows with a voice at the cursor (from the recorded
voices, §6.1), each with its age in beats then; no `ended` lingering, no
"refreshed 4 times a second" line, but the same limit applies and is said
once under the list: `recorded 4 times a second: a very short hit may be
missing`. Older recordings: `not recorded`. Then `Overrides` (from the
frame's report) and `Problems then` (the problems active at the cursor,
each with how long it had been active; `none`).

**Went out.** One block per universe recorded at the cursor: its name,
`frame of <clock time to the hundredth>`, the 512 cells as recorded (the
newest recorded frame at or before the cursor), and the cell line. Fixture
and channel names come from the venue as it is now when its revision is
the one recorded for that moment; otherwise the line reads `channel 17 ·
212` only (the patch has changed since). No output state, no frames per
second, no timing table.

A cursor before the first recorded moment of a run's first chunk, or with
nothing recorded within the window, shows empty columns with `nothing
recorded here`.

### 4.6 Moving and playing

| Key or action | Moves the cursor |
| --- | --- |
| click or drag on a strip | to that moment |
| `←` / `→` | to the previous / next recorded frame (1/20 s) |
| `⇧←` / `⇧→` | one bar back / forward (1 s when the clock was stopped) |
| `[` / `]`, `◀` / `▶` | to the previous / next flag |
| `Space`, `Play` | plays from the cursor at real speed; again to stop |
| `Live` | leaves Look back for the Monitor |

Playing advances the cursor with the wall clock; the columns and both
strips follow. It stops at the end of what is recorded, at a hatched
stretch, on any other move, and when the page is hidden. Sound is not
involved: this replays what PTAH saw and sent, not Reaper.

The arrow and bracket keys act unless a field or the cells have the focus
(the cells keep their own arrows).

### 4.7 Mark

`Mark now` writes a mark at the present instant into the recorder (§6.2),
whatever the cursor is looking at, and answers with a toast `Marked
21:56:12`. On Perform, key `M` does the same (no button on Perform: the
key only, listed in its palette as `Mark this moment`), with the same
toast. A mark needs no show and no running clock. If the recorder is not
writing: toast `PTAH could not mark: the recorder is not writing`.

Marks are not named, edited or deleted; they leave with the recording.

### 4.8 Rules that apply everywhere

Tokens only; nothing shifts (the strips, the header line and every list
keep their boxes; moving the cursor changes contents only); calm when
well, loud only when wrong; every action reachable by keyboard; the page
writes nothing but marks. At phone width: one column, the strips
draggable by touch, `Mark now` reachable.

## 5. What the page holds

The session overview (§6.3), read on opening and every 10 s; one window of
recorded detail around the cursor (§6.4), replaced when the cursor leaves
its middle third (and while playing, read ahead); the cursor; the chips.
Nothing is kept when the page is left.

## 6. Engine and server

### 6.1 What the recorder also writes

New line types in a chunk's `.jsonl`, all written by the telemetry thread
(never the render thread):

- `{"type":"heard","seq":…,"beat":…,"judged":…,"part":…,"housekeeping":…,
  "osc":…,"heard":[…]}`: the judgement of the input with that `seq`, as
  the `heard` topic sends it (without repeating the event), when the
  event is judged; none for clock pulses and audio levels. Events are
  therefore judged whenever the recorder is on, page or no page (off the
  render thread, as today's judging). A judgement is written after its
  input, one frame later, so it may fall at the start of the next chunk:
  a reader joins by `seq` and looks one chunk ahead.
- `{"type":"voices","at":…,"voices":[VoiceView…]}`: at the voices'
  publication cadence (250 ms), only when the list changed.
- `{"type":"mark","at":…,"wall":<unix ms>}`.
- `{"type":"key","at":…,"wall":<unix ms>,"show":{…}|null,"voices":[…],
  "faults":[the active faults]}`: the first line of every chunk, and again
  whenever the show in force changes. `show` is `{ showId, show, venueId,
  venue, venueRevision, patchIndex, showEpoch, rows: { "<instance id>":
  "<name>" }, songs: { "<n>": "<name>" }, devices: ["<name>"…],
  universes: [{ universe, name }] }`: the names as loaded then. The
  telemetry side knows only ids today: the loader gives it these names
  with each show it loads (`ShowInfo` gains them; a preview load records
  the names it was built with), and the settings' device names at start.

A chunk is therefore readable alone: its first line gives the state it
starts from. `RecordEvent` and the reader gain these variants; `ptah
replay` and the capture tools ignore them. Recordings without them stay
readable (the page says `not recorded`).

### 6.2 Marks and retention

- `POST /recorder/marks` `{}` → 200 `{ "at": <engine ns>, "wall": <unix
  ms> }`: the telemetry thread writes the `mark` line at its next step.
  503 `recorder-not-writing` when the recorder is off (`recorderMinutes`
  0) or failed.
- `recorderMinutes` defaults to **180** (was 10). Cost, measured on real
  recordings (one universe, 44 frames a second): about **220 MB an hour**,
  so about 660 MB for the default three hours; the frame reports are 70 %
  of it (about 980 bytes each, 44 a second), the recorded pictures about
  38 MB an hour per universe. The write rate does not change (about
  62 KB a second, as today); only what stays on disk grows. The Settings
  field `Recorder keeps the last … min` gains a dim note with the cost of
  its current value (`about 660 MB`), from the engine's own measure of the
  last closed chunks. `docs/engine.md` says the same. The frame reports
  are not thinned: `ptah replay` needs every one.
- `0` now really means off, as the Settings page already says: today any
  value ≤ 0 is silently treated as 10. With 0 the recorder writes nothing,
  Look back says `The recorder is off (Settings).`, and a mark is refused.
- `ptah replay` reads only the chunks of the run it replays (today it
  parses every chunk in the directory before filtering), so a longer
  session does not slow a replay of the last run beyond that run's own
  length. A three-hour run replays in three hours of recording; that is
  accepted.

### 6.3 `GET /recorder/overview`

```json
{ "from": <unix ms>, "to": <unix ms>,
  "runs": [ { "runId": …, "from": <unix ms>, "to": <unix ms> } ],
  "activity": { "stepMs": 1000, "from": <unix ms>, "counts": [3,0,12,…] },
  "flags": [ { "kind": "mark" | "problem" | "restart", "wall": <unix ms>,
               "words": "SPD-SX is not plugged in" } ] }
```

`counts` is notes and control messages per second (pulses and audio
levels not counted), with 0 where nothing was recorded; the page draws
the hatching from the gaps between `runs` (and inside a run where the
recorder had failed). A `problem` flag is a fault raise and carries the
fault's `code` and `subject` instead of `words`: the page words it as the
Monitor does (the wording lives in the page, not in the engine). `restart`
flags are run starts after the first.

Time: within a run, a moment's wall time is the run's first recorded wall
time plus the engine's own steady clock, so a wall clock that jumps
mid-run does not bend the timeline. Runs are ordered by their run id, as
the recorder already orders and prunes them; a run whose wall time would
start before the previous run ended (a machine whose clock was wrong at
start, such as a Pi without network) is placed right after it.

So that three hours are not parsed on each read: when a chunk is closed
(at rotation, and at a clean shutdown) the recorder writes a small summary
beside it (`<chunk>.summary.json`:
its wall-clock span, per-second counts, marks, fault raises, show
changes). The overview is built from the summaries plus a scan of the
open chunk (at most 30 s). A closed chunk without a summary (an older
recording, a crash) is summarised by the server on first need, off the
engine's threads, and the result cached in memory. Pruning deletes a
chunk's summary with it.

### 6.4 `GET /recorder/window` and `GET /recorder/frames`

`GET /recorder/window?from=<unix ms>&to=<unix ms>`: at most 120 s per
call (400 beyond). Everything recorded in the span except the pictures,
plus the state at `from` (about 1 MB for a busy two minutes):

```json
{ "from": …, "to": …, "recorded": true,
  "key": { "wall": …, "show": {…}|null, "voices": […], "faults": […] },
  "messages": [ { "wall": …, "event": InEvent, "heard": {…}|null } ],
  "voices":   [ { "wall": …, "voices": […] } ],
  "faults":   [ { "wall": …, "fault": {…} } ],
  "marks":    [ { "wall": … } ],
  "ticks":    [ { "wall": …, "frameIndex": …, "beat": …, "clock": …,
                  "tempoBpm": …, "clockRunning": …, "overrides": {…},
                  "currentSong": … } ],
  "frameTimes": [ <unix ms>, … ] }
```

`GET /recorder/frames?from=<unix ms>&to=<unix ms>`: at most 10 s per call:
`{ "frames": [ { "wall": …, "frameIndex": …, "universes":
[[1,"<base64>"]] } ] }` (about 150 KB per universe for 10 s). The page
asks for the pictures around the cursor only, once the cursor has rested
150 ms (a drag across the session strip asks for none on the way), and
reads ahead while playing.

- `key` is the state at `from`: the chunk's `key` line advanced by the
  lines before `from`. `heard` is null for a message whose judgement was
  not recorded.
- `ticks` are thinned to the recorded frames' instants plus one per beat
  (the page needs the bar and the overrides, not 44 reports a second).
  `frameTimes` lists the instants of the recorded pictures, for stepping.
  Clock pulses and audio levels are left out of `messages`.
- A span crossing a run boundary returns both sides; times are wall-clock
  milliseconds throughout (`wall`), computed from each chunk's `key`
  line (older chunks: from the run id and the chunk's start).
- `recorded: false` with empty lists when nothing was recorded in the
  span.
- Read on a blocking task; never touches the engine's threads; the open
  chunk is read up to its last complete line.

### 6.5 The existing routes

`GET /recorder/chunks` is unchanged. The WebSocket topics are unchanged.

## 7. Where the code goes

- `crates/ptah-engine`: the recorder's new lines, the `key` line at each
  chunk start and show change, the names from the loader, the mark
  request, the chunk summaries, the reader's new variants (the reader and
  `RecordEvent` together, so nothing is counted as damage),
  `recorderMinutes` 180 and 0 = off, the cost measure; replay ignores the
  new lines and reads only its run's chunks.
- `crates/ptah-server`: `POST /recorder/marks`, `GET /recorder/overview`,
  `GET /recorder/window`, `GET /recorder/frames`, the summary cache.
- `packages/ds/src/debug/back/`: `LookBackScreen` and its parts
  (`SessionStrip`, `ZoomStrip`, `BackBar`, `MomentHeader`), the Monitor's
  parts reused with past words (a `past` mode on `MessageList`,
  `PlayingRows`, `UniverseBlock`), a pure `model/` (the cursor and its
  steps, flags, the window → columns derivation, strip geometry, time
  words), stories and tests.
- `apps/web/src/debug/`: `LookBackPage`, `useLookBack` (overview, window,
  cursor, playing), the `Live`/`Look back` switch on both pages, the
  `/debug/back` route; Perform's `M` key and palette entry.
- Docs: `docs/api.md`, `docs/app.md`, `docs/engine.md`,
  `docs/design-system.md`, `schemas/settings.schema.json` (the default).
- No new dependency is expected.

## 8. Testing and exit

- Rust: each new line is written and read back; a chunk read alone gives
  the right state at any instant (show, voices, active faults) against a
  full read; a mark lands within one telemetry step; summaries equal a
  scan of their chunk; pruning removes them; an old recording (no new
  lines) reads with `heard: null`; replay and compare-captures on a new
  recording behave as before, and a replay parses only its run's chunks;
  `recorderMinutes` 0 writes nothing; a judgement that lands in the next
  chunk is joined; the render thread's allocation guards unchanged.
- Server: overview over two runs with a gap, a mark and a fault; window
  at a chunk boundary, across a run boundary, in a gap, over 120 s (400),
  on an old recording; frames over 10 s (400); a run whose wall clock
  starts before the previous run ended is placed after it; marks 503 when
  the recorder is off.
- ds: the model (steps by frame, by bar, by flag; playing; snapping out
  of gaps; the window → columns derivation: the highlighted line, dim
  later lines, voices and problems at the cursor, the frame at or before
  it; time words); stories for well, at a mark, at a problem, in a gap,
  an old recording, playing; a no-shift check while the cursor moves and
  while playing; boards at 1280×800, 960×800, 390×844.
- web: the cursor in the URL; overview refresh; window refetch when the
  cursor leaves the middle third; play, stop on hide; Mark from the page
  and from Perform's `M`; `Live` and back.
- e2e on the real binary: play notes, mark, restart PTAH, play again;
  Look back shows two runs with a hatched gap, the mark's flag, `]` goes
  to it, the message at the cursor has its row, the cells are lit as at
  that moment, `→` steps one frame, Space plays.

Exit: after a rehearsal of the band's show with two marks dropped from
Perform, the owner opens Look back, jumps to each mark, reads what came
in, what played and what went out there, steps through it and plays it;
a moment two hours old is as reachable as one two minutes old. Owner
check in `docs/ledgers/debug-look-back-owner-check.md`.

## 9. Left to the builder

- The summary file's exact shape and the cache.
- How the window is advanced from the `key` line (the lines' order within
  a chunk is the file's).
- Strip drawing (canvas or elements), widths and heights within the
  tokens and the no-shift rule.
- The read-ahead while playing and the exact refetch rule.
- The per-universe names when the recorded show is null (use the venue's).

## 10. Calls made by the author (not the owner's decisions)

1. Look back is a second view of the Debug tab (`/debug/back`), with the
   cursor in the URL.
2. Each chunk starts with a `key` line so any 30 s is readable alone; the
   names of rows, songs and devices are recorded with it.
3. The overview comes from per-chunk summaries written at rotation.
4. Wall-clock time everywhere on the page; bars from the recorded frame
   reports.
5. Flags are marks, problem starts and restarts; `[` and `]` jump among
   all three.
6. `←`/`→` step one recorded picture (1/20 s); `⇧` steps one bar.
7. Playing is at real speed only, and silent.
8. Marks are bare instants: no name, no delete.
9. On Perform the mark is a key (`M`) and a palette entry, with a toast;
   no button.
10. The kept time is 180 minutes by default, about 660 MB on disk for one
    universe (220 MB an hour, measured); the Settings field shows the cost
    of its value. The frame reports are kept whole so `ptah replay` stays
    exact. `0` now really turns the recorder off.
15. Events are judged whenever the recorder is on, not only while the
    Monitor is open.
16. The pictures are fetched separately from the rest, around the cursor
    only, so dragging the timeline stays light.
17. Time within a run follows the engine's steady clock; runs are ordered
    as the recorder orders them, so a wrong wall clock cannot scramble the
    timeline.
18. Problem flags are worded by the page, as the Monitor words problems.
11. Past timing figures, output state and frames per second are not
    shown.
12. Recordings made before this change show `not recorded` where the new
    data is missing.
13. Cell names use today's venue only when its revision is the recorded
    one.
14. No separate Claude Design round.
