# Debug Look Back Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Debug tab gains a Look back view: a timeline of the whole recorded session with the owner's marks, and the Monitor's three columns frozen at any past moment, with stepping and real-speed playback; a Mark key on Perform flags a moment while playing.

**Architecture:** The flight recorder (telemetry thread, never the render thread) additionally writes what listened to each message, the playing rows, marks, and a `key` line at each chunk start carrying the state and the names of that moment; each closed chunk gets a small summary file. A pure reading module in the engine crate turns chunks into an overview and into windows of the past; the server serves them. The design system adds a pure cursor/derivation model, two strips and a past mode on the Monitor's parts; the web app wires the page.

**Tech Stack:** Rust 1.93 (no new crate), React 19 + the ds, Vitest, Storybook gates, Playwright 1.59.1, Biome, cargo-nextest 0.9.150.

**Spec:** `docs/superpowers/specs/2026-11-18-v2-debug-look-back-design.md` (V1 repo, 66cee67). Executors read it first; § numbers below refer to it.

## Global Constraints

- Repo `~/projects/ptah-v2`, branch `debug-look-back` from `master` (3793f5a or later). V1 (`~/projects/ptah`) is never modified except this plan and its spec.
- Never start V1 services or pm2; never touch or read `~/.ptah` or `~/ptah-home` (not even file sizes); tests use temp roots and free ports; the owner's Storybook servers on 6006–6008 stay up; no outward pushes; never kill a `ptah` you did not start.
- `AGENTS.md` (disk): no extra git worktree and no second `target/` (never a scratch copy with its own target dir: if another task's work in progress breaks your crate's tests, wait and report); never `cargo clean` unless `du -sh target` is above 30 GB; `df -h /System/Volumes/Data | tail -1` before a full workspace build, stop below 30 GB free.
- No new dependency, npm or crate.
- **The render thread does not change.** Everything the recorder writes is built on the telemetry side. The allocation guards (`ptah-vm/tests/frame.rs`, `ptah-engine/tests/perf.rs`) stay green untouched.
- **`ptah replay` stays exact:** tick reports are recorded whole; the new line types are ignored by replay; old recordings stay readable.
- **One engine:** the page never decides what listened; it words what was recorded, or says `not recorded`.
- The page writes nothing but marks.
- Biome only; tokens-only styling; nothing shifts (strips, header line and lists keep their boxes; moving the cursor changes contents only); calm when well, loud only when wrong; every action reachable by keyboard; the screen scrolls inside the shell's page area.
- Exact copy (§4):
  - bar: `Live`, `Look back`; the Monitor's chips; `◀` titled `previous mark or problem`, `▶` titled `next mark or problem`; `Play`, `Stop`; `Mark now`.
  - header: `<HH:MM:SS> · bar <b>` (`—` for the bar while the clock was stopped); `<n> s ago` / `<n> min ago` / `<h> h <m> min ago`; `<show> on <venue>` / `no show`; legend `your marks`, `problems`, `PTAH was not running`.
  - strips: `<HH:MM> · session start`, `<HH:MM> · now`; `−30 s`, `+30 s`, `bar <n>`.
  - columns: `Came in`, `· around this moment`, `Was playing`, `Overrides`, `Problems then`, `Went out`; `frame of <HH:MM:SS.cc>`; `not recorded`; `recorded 4 times a second: a very short hit may be missing`; `nothing recorded here`; `channel <n> · <value>` when the patch changed since; `The recorder is off (Settings).`
  - marks: toast `Marked <HH:MM:SS>`; `PTAH could not mark: the recorder is not writing`; Perform palette `Mark this moment`.
  - Settings: dim note `about <n> MB` (or `about <n.n> GB` from 1000 MB) beside `Recorder keeps the last`.
- Exact values: `recorderMinutes` default 180, 0 = off; chunks 30 s (unchanged); voices lines at the 250 ms cadence, only on change; window at most 120 s, frames at most 10 s; the zoom strip 30 s each side; overview re-read every 10 s; frames asked once the cursor has rested 150 ms; `←`/`→` one recorded frame, `⇧←`/`⇧→` one bar (1 s when the clock was stopped); keys `[`, `]`, Space, `M`.
- Conventions (owner): failing test first with the RED output in the report; at most three agents at once; a UI task runs `node packages/ds/scripts/test-visual.mjs --only <its boards>` and Storybook for its own stories; any task that touches a shared part (here: the Monitor's parts and bar) runs the full visual gate; full gates at the checkpoints (Task 5 for Rust: `cargo nextest run --workspace`; Task 8 for the ds; `pnpm allcheck` in Task 11).
- Conventional Commits with scopes (`feat(engine)`, `feat(server)`, `feat(ds)`, `feat(web)`, `test(web)`, `docs`).

## Review Focus

1. A crash or `kill -9` mid-chunk: the last chunk has no summary and ends mid-line; the next run must still show it (summarised on demand), and the timeline shows the gap. → Task 4 tests `a_chunk_without_a_summary_is_summarised`, `a_chunk_cut_mid_line_reads_up_to_the_cut`.
2. A judgement that lands in the next chunk, or never (the engine stopped between an input and its tick): the message reads with its rows, or `not recorded`, never a wrong row. → Task 4 `a_judgement_in_the_next_chunk_is_joined`, `an_unjudged_last_input_has_null_heard`.
3. Three hours on disk: opening Look back must not parse the session (summaries only), and pruning must take summaries with their chunks. → Task 3 and Task 4 tests on counts of files opened.
4. The show renamed or re-patched since: names read as then; cells fall back to `channel n · value` when the venue's revision differs. → Task 6 derivation tests; Task 9 page test.
5. Marking during a gig: `M` on Perform never steals a key from a field, never fires twice on key repeat, and works with no show loaded. → Task 10 tests.

## Execution order

- **Rust track:** 1 → 2 → 3 → 4 → 5. **Design system track:** 6 → 7 → 8. One task per track at a time, reviews alongside, three agents at most; both tracks in the main checkout (disjoint files).
- Then 9 (needs 5, 8) → 10 → 11.

## File structure

```
crates/ptah-engine/src/live_show.rs        ShowInfo.names (show, venue, rows, songs, universes)
crates/ptah-engine/src/recorder.rs         new lines, key line, mark, 0 = off, default 180, summaries
crates/ptah-engine/src/recorder/past.rs    overview(), window(), frames(): pure reading (split recorder.rs into a
                                           directory module if it helps; keep the public paths)
crates/ptah-engine/src/replay.rs           reads only its run's chunks; ignores new lines
crates/ptah-server/src/http/recorder.rs    POST /recorder/marks, GET /recorder/{overview,window,frames}
packages/ds/src/debug/back/model/          cursor.ts flags.ts moment.ts strip.ts time.ts
packages/ds/src/debug/back/                SessionStrip ZoomStrip BackBar MomentHeader LookBackScreen + stories
packages/ds/src/debug/                     past mode on MessageList, PlayingRows, UniverseBlock; ViewSwitch in MonitorBar
apps/web/src/debug/                        useLookBack.ts LookBackPage.tsx; the switch on MonitorPage
apps/web/src/perform/                      key M, palette entry
apps/web/e2e/lookback.spec.ts
```

## State table: the page (every row is a test in the task named)

| # | State or event | Result | Task |
| --- | --- | --- | --- |
| L1 | page opened without `?at=` | cursor = the last recorded moment; overview read; window and frames read for it | 9 |
| L2 | page opened with `?at=<ms>` | cursor there (snapped to the nearest recorded moment if in a gap); a reload keeps it | 6, 9 |
| L3 | cursor moved (click, drag, step, flag jump) | URL updated (replaceState); the header, strips and columns follow; nothing shifts | 6, 8, 9 |
| L4 | cursor leaves the middle third of the loaded window | a new window is read around it; the old one stays shown until the new one arrives | 9 |
| L5 | cursor rests 150 ms | frames around it are read; a drag across the strip asks for none on the way | 9 |
| L6 | `Play` | the cursor advances with the wall clock; frames are read ahead; stops at the end of the recording, at a gap, on any other move, when the page is hidden | 6, 9 |
| L7 | overview re-read (10 s) | the strip grows at the right; the cursor does not move | 9 |
| L8 | `Mark now` | `POST /recorder/marks`; toast `Marked <time>`; the flag appears at the next overview read (asked at once) | 9, 10 |
| L9 | recorder off or failed | page says `The recorder is off (Settings).` / a mark toasts `PTAH could not mark: the recorder is not writing` | 9, 10 |
| L10 | a moment from before this feature | messages listed with `not recorded`; `Was playing` says `not recorded`; cells still shown | 6, 7, 9 |
| L11 | the stream drops (PTAH restarts) while looking back | the page stays on its moment; the next overview shows the new run after a hatched gap | 9 |
| L12 | `Live` | goes to `/debug` keeping the chips in the URL | 9 |
| L13 | a read fails | the previous content stays; a toast in plain words; retried on the next move or overview tick | 9 |

---

### Task 1: Names for the telemetry side (engine)

**Files:**
- Modify: `crates/ptah-engine/src/live_show.rs` (`ShowInfo`), the loader where it builds `ShowInfo` (and `ShowInfo::preview`), `crates/ptah-engine/src/telemetry/` where the device registry's names are reachable
- Test: in `live_show.rs` and `crates/ptah-engine/tests/suite/`

**Interfaces:**
- Produces:
  ```rust
  #[derive(Clone, Debug, PartialEq, Serialize, Deserialize, Default)] #[serde(rename_all = "camelCase")]
  pub struct ShowNames { pub show: String, pub venue: String, pub rows: Vec<String> /* by instance index; a scene instance by its scene's name */,
      pub songs: Vec<String>, pub universes: Vec<(u32, String)> }
  // ShowInfo gains `pub names: ShowNames`, built off the render thread with the show.
  ```
- `GET /show-info`'s JSON is unchanged (`names` is `#[serde(skip)]` there, or a separate view: no API change in this task).

- [ ] **Step 1: Failing tests:** `the_show_info_carries_the_names_of_the_show_as_loaded` (fixture show: show name, venue name, each row's name in instance order, song names, universe names); `a_preview_load_keeps_the_names_it_was_built_with`; `show_info_json_is_unchanged` (the existing `/show-info` shape test still passes byte for byte).
- [ ] **Step 2:** `cargo nextest run -p ptah-engine names` → FAIL. **Step 3: Implement. Step 4:** `cargo nextest run -p ptah-engine` → PASS.
- [ ] **Step 5: Commit** `feat(engine): the show's names travel with its info`.

### Task 2: The recorder writes the moment (engine)

**Files:**
- Modify: `crates/ptah-engine/src/recorder.rs` (`RecordEvent`, the line type, `FlightRecorder`, the reader), `telemetry/{core,live,thread}.rs`, `engine.rs`, `replay.rs`, `schemas/settings.schema.json` and the settings default, `docs/engine.md`
- Test: `recorder.rs` unit tests, `crates/ptah-engine/tests/suite/recorder.rs`

**Interfaces:**
- Consumes Task 1; `heard::JudgedEvent`.
- Produces (§6.1, §6.2):
  - `RecordEvent` gains `Heard { seq, beat, judged, part, housekeeping, osc, heard }`, `Voices { at, voices: Vec<VoiceView> }`, `Mark { at, wall: u64 }`, `Key { at, wall: u64, show: Option<KeyShow>, voices: Vec<VoiceView>, faults: Vec<Fault> }` with `KeyShow { show_id, show, venue_id, venue, venue_revision, patch_index, show_epoch, rows: BTreeMap<String /* instance id */, String>, songs: BTreeMap<u32, String>, devices: Vec<String>, universes: Vec<(u32, String)> }`; JSON lines tagged `heard` / `voices` / `mark` / `key`, camelCase. The reader yields them; `Recorded.at` is their `at` (a `Heard`'s is its input's `at`, looked up by `seq`, else the previous line's).
  - Written by the telemetry thread: a `Key` as the first line of every chunk and at each show adoption; a `Heard` for every judged event except clock pulses and audio levels (judging now runs whenever the recorder is on, with or without a `heard` subscriber); a `Voices` at the 250 ms cadence only when the list changed; a `Mark` on request.
  - `EngineHandle::mark() -> Result<Mark, MarkError>` (`Mark { at: Nanos, wall: u64 }`; `MarkError::NotWriting` when the recorder is off or failed), served by the telemetry thread at its next step.
  - `recorderMinutes`: default 180; `0` = the recorder is off (no file written, `mark()` → `NotWriting`); the ≤ 0 → 10 fallback is removed.
  - `replay` ignores the four new variants; an old recording (none of them) reads as before.

- [ ] **Step 1: Failing tests:** `every_chunk_starts_with_a_key_line` (state at the chunk's start: show names, voices, active faults; rotate with a fake clock); `a_show_change_writes_a_key_line`; `judged_events_are_recorded_without_a_subscriber_but_not_pulses`; `voices_are_recorded_only_when_they_change`; `a_mark_is_written_within_one_step_and_answers_its_times`; `zero_minutes_writes_nothing_and_refuses_marks`; `the_default_is_180_minutes` (and the pruning bound: `ceil(180·60/30) + 1` chunks); `the_reader_yields_the_new_lines_and_skips_nothing` (`skipped() == 0`); `an_old_recording_still_reads` (a fixture chunk without the new lines); `replay_compare_is_unchanged_on_a_new_recording` (the existing replay-compare test on a recording that has the new lines).
- [ ] **Step 2:** → FAIL. **Step 3: Implement. Step 4:** `cargo nextest run -p ptah-engine` → PASS (perf.rs untouched).
- [ ] **Step 5: Commit** `feat(engine): the recorder writes what listened, the rows, marks and a key line per chunk`.

### Task 3: Chunk summaries, the cost measure, replay reads its run only (engine)

**Files:**
- Modify: `crates/ptah-engine/src/recorder.rs`, `replay.rs`, `docs/engine.md`
- Test: `recorder.rs`, `tests/suite/recorder.rs`, `tests/suite/replay.rs`

**Interfaces:**
- Produces:
  ```rust
  #[derive(Serialize, Deserialize, Clone, Debug, PartialEq)] #[serde(rename_all = "camelCase")]
  pub struct ChunkSummary { pub run_id: u64, pub start_ns: Nanos, pub end_ns: Nanos, pub wall_start: u64, pub wall_end: u64,
      pub counts: Vec<u16> /* notes + control messages per second from wall_start */, pub marks: Vec<u64 /* wall */>,
      pub fault_raises: Vec<FlagFault> /* { wall, code, subject } */, pub shows: Vec<(u64 /* wall */, String /* show */, String /* venue */)>,
      pub bytes: u64 }
  pub fn summarise(jsonl: &Path) -> Result<ChunkSummary, RecorderError>   // a scan; what the recorder writes at rotation equals this
  pub fn summary_path(jsonl: &Path) -> PathBuf                            // "<chunk>.summary.json"
  pub fn bytes_per_hour(dir: &Path) -> Option<u64>                        // from the closed chunks' summaries of the current run (None with fewer than 2)
  ```
  The recorder writes the summary when it closes a chunk (rotation and clean shutdown); pruning deletes it with the chunk; `list_chunks` ignores `.summary.json`. `Recording::read` (replay) lists the directory, keeps the chosen run's chunks by file name, and parses only those.

- [ ] **Step 1: Failing tests:** `a_closed_chunk_has_a_summary_equal_to_a_scan`; `a_clean_shutdown_writes_the_last_summary`; `pruning_removes_summaries`; `list_chunks_ignores_summaries`; `bytes_per_hour_from_the_last_closed_chunks`; `replay_opens_only_its_runs_chunks` (two runs on disk; count files opened through a test hook or by making the other run's chunk unreadable).
- [ ] **Step 2:** → FAIL. **Step 3: Implement. Step 4:** `cargo nextest run -p ptah-engine` → PASS.
- [ ] **Step 5: Commit** `feat(engine): chunk summaries; replay reads only its run`.

### Task 4: Reading the past (engine, pure)

**Files:**
- Create: `crates/ptah-engine/src/recorder/past.rs` (or `recorder_past.rs`; keep `recorder`'s public paths)
- Test: in the file, on chunks written by a `FlightRecorder` driven with a fake clock in a temp dir

**Interfaces:**
- Consumes Tasks 2–3.
- Produces (serde camelCase, as §6.3–§6.4):
  ```rust
  pub struct SummaryCache { /* in-memory: chunk path → ChunkSummary for closed chunks without a file */ }
  pub fn overview(dir: &Path, cache: &mut SummaryCache, now_wall: u64) -> Result<Overview, RecorderError>
  pub fn window(dir: &Path, from_wall: u64, to_wall: u64) -> Result<Window, PastError>       // PastError::TooLong beyond 120 s
  pub fn frames(dir: &Path, from_wall: u64, to_wall: u64) -> Result<Frames, PastError>      // TooLong beyond 10 s
  pub struct Overview { from, to, runs: Vec<RunSpan>, activity: Activity { step_ms: 1000, from, counts }, flags: Vec<Flag> }
  pub enum Flag { Mark { wall }, Problem { wall, code, subject }, Restart { wall } }       // tagged by "kind"
  pub struct Window { from, to, recorded: bool, key: KeyState, messages, voices, faults, marks, ticks, frame_times }
  ```
- Rules: wall time of a line = its chunk's `key.wall` + (line `at` − key `at`) (older chunks: run id + `at`/1e6); runs ordered by run id; a run whose wall start is before the previous run's end is shifted to start right after it; `overview` opens summaries only, plus the open chunk (scanned), plus on-demand `summarise` for a closed chunk without a summary (cached); `window.key` = the covering chunk's `key` advanced by the lines before `from`; messages carry their `heard` joined by `seq`, looking one chunk ahead, `null` when absent; clock pulses and audio levels are left out of `messages`; `ticks` thinned to the frames' instants plus one per beat; the open chunk is read up to its last complete line.

- [ ] **Step 1: Failing tests:** `overview_over_two_runs_has_a_gap_a_mark_a_problem_and_a_restart_flag`; `overview_opens_only_summaries_and_the_open_chunk` (file-open count); `a_chunk_without_a_summary_is_summarised` (once: the cache); `a_chunk_cut_mid_line_reads_up_to_the_cut`; `window_state_at_from_equals_a_full_read` (show, voices, active faults at ten instants, against a reader that replays the whole run); `window_at_a_chunk_boundary_and_across_a_run_boundary`; `a_judgement_in_the_next_chunk_is_joined`; `an_unjudged_last_input_has_null_heard`; `an_old_recording_has_null_heard_and_no_voices`; `a_window_in_a_gap_is_not_recorded`; `over_120_s_is_too_long`; `frames_are_the_recorded_bytes` and `over_10_s_is_too_long`; `a_run_with_an_earlier_wall_clock_is_placed_after_the_previous`; `ticks_are_thinned`.
- [ ] **Step 2:** → FAIL. **Step 3: Implement. Step 4:** `cargo nextest run -p ptah-engine` → PASS.
- [ ] **Step 5: Commit** `feat(engine): reading the recorded past: an overview, windows, frames`.

### Task 5: The routes; Rust checkpoint (server)

**Files:**
- Modify: `crates/ptah-server/src/http/recorder.rs`, `http/mod.rs`, `http/app.rs`, `state.rs`/`lib.rs` (the `SummaryCache` behind a mutex), `http/status.rs` or `server.rs` (the cost), `docs/api.md`
- Test: `crates/ptah-server/tests/recorder.rs` (new)

**Interfaces:**
- Consumes Tasks 2–4.
- Produces:
  - `POST /recorder/marks` `{}` → 200 `{ at, wall }`; 503 `{ "error": "recorder-not-writing" }`.
  - `GET /recorder/overview` → `Overview`; 200 with empty lists and `"off": true` when the recorder is off.
  - `GET /recorder/window?from=&to=` → `Window`; 400 `bad-range` (missing, reversed, over 120 s).
  - `GET /recorder/frames?from=&to=` → `Frames`; 400 `bad-range` (over 10 s).
  - `GET /server` gains `recorder: { minutes, bytesPerHour }` (`bytesPerHour` null until measured).
  - All reads on blocking tasks; none takes an engine lock or waits on the engine.

- [ ] **Step 1: Failing tests:** `a_mark_answers_its_times_and_appears_in_the_overview`; `marks_are_503_when_the_recorder_is_off`; `the_overview_of_a_live_engine` (notes via the fake MIDI, a fault, a mark); `a_window_carries_messages_with_what_listened_and_the_state_at_from`; `frames_carry_the_bytes`; `bad_ranges_are_400`; `server_reports_the_recorders_cost`.
- [ ] **Step 2:** → FAIL. **Step 3: Implement. Step 4:** `cargo nextest run -p ptah-server` → PASS.
- [ ] **Step 5: Rust checkpoint:** `df -h /System/Volumes/Data | tail -1`, then `cargo nextest run --workspace` and `pnpm rust:allcheck` → PASS.
- [ ] **Step 6: Commit** `feat(server): marks, and the recorded past over HTTP`.

### Task 6: The look-back model (ds, pure)

**Files:**
- Create: `packages/ds/src/debug/back/types.ts`, `packages/ds/src/debug/back/model/{cursor,flags,moment,strip,time,index}.ts`
- Test: `packages/ds/src/debug/back/model/__tests__/*.test.ts`

**Interfaces:**
- Consumes the Monitor's model (`packages/ds/src/debug/model`: `Ring` wording and folding, `Names`, `playingRows`, `Line`).
- Produces:
  ```ts
  type Overview = { from: number; to: number; runs: { runId: number; from: number; to: number }[];
    activity: { stepMs: number; from: number; counts: number[] }; flags: Flag[]; off?: true };
  type Flag = { kind: "mark" | "restart"; wall: number } | { kind: "problem"; wall: number; code: string; subject: string };
  type Window = /* §6.4, camelCase */; type Frames = { frames: { wall: number; frameIndex: number; universes: [number, string][] }[] };
  snap(overview, wall): number                       // into the nearest recorded stretch
  stepFrame(window, wall, dir: -1 | 1): number       // by frameTimes; beyond the window: ±50 ms
  stepBar(window, wall, dir): number                 // one bar by the ticks' beat (4 beats); 1000 ms when the clock was stopped
  nextFlag(overview, wall, dir): number | null
  advance(overview, wall, elapsedMs): { wall: number; ended: boolean }   // playing: stops at a gap or the end
  moment(window, frames, wall, filters, venueNow: { revision: string; cellInfo(u, ch) } | null): Moment
    // Moment = { header: { time: string; bar: string; ago(now): string; playing: string }, lines: (Line & { rel: "before" | "at" | "after" })[],
    //   rows: PlayingRow[] | "not-recorded", overrides, problems: { code; subject; forMs }[], universes: { universe; name; frameAt: string | null;
    //   values: Uint8Array | null; named: boolean }[], recorded: boolean }
  sessionBars(overview, widthPx): { x: number; h: number }[]; gaps(overview, widthPx): { x: number; w: number }[]; flagX(overview, wall, widthPx): number
  zoomTicks(window, wall, filters, widthPx): { x: number; kind: "note" | "control" | "unheard" }[]; zoomLabels(window, wall): { x: number; text: string }[]
  timeWords(wall): string /* 21:42:07 */; hundredths(wall): string /* 21:42:07.05 */; agoWords(ms): string; needsWindow(loaded, wall): boolean /* middle third */
  ```
- Names come from the window's `key.show` (rows, songs, devices) — never from today's show.

- [ ] **Step 1: Failing tests,** including: `snap` in a gap and beyond both ends; `stepFrame` across the window's edge; `stepBar` with a running and a stopped clock; `nextFlag` over marks, problems and restarts, none on a side → null; `advance` stops at a gap; `moment`: the line at or before the cursor is `at`, later ones `after`; folded lines as the Monitor folds; names of then (a row renamed in the key vs a second key line later in the window); `heard: null` → `not recorded`; no voices in the key and none recorded → `"not-recorded"`; voices and problems at the cursor from key + changes; the frame at or before the cursor; `named` false when the venue revision differs; `recorded: false`; `agoWords` (`45 s ago`, `14 min ago`, `2 h 05 min ago`); `needsWindow`; strip geometry at 1232 and 358 px.
- [ ] **Step 2:** `pnpm -F @ptah-app/ds test -- src/debug/back` → FAIL. **Step 3: Implement. Step 4:** → PASS.
- [ ] **Step 5: Commit** `feat(ds): the look-back model`.

### Task 7: The strips, the bar, the header; the past mode (ds)

**Files:**
- Create: `packages/ds/src/debug/back/{SessionStrip,ZoomStrip,BackBar,MomentHeader}.tsx`, `Back.module.css`, `sample.ts`, `Parts.stories.tsx`
- Modify (shared with the Monitor → full visual gate): `packages/ds/src/debug/{MessageList,PlayingRows,UniverseBlock}.tsx` (a `past` mode), `MonitorBar.tsx` (a `view` switch slot)
- Test: `packages/ds/src/debug/back/__tests__/parts.test.tsx`, additions to `packages/ds/src/debug/__tests__/parts.test.tsx`

**Interfaces:**
- Consumes Task 6.
- Produces:
  ```ts
  SessionStrip: { overview: Overview; cursor: number; zoom: { from: number; to: number }; onCursor(wall: number): void }
  ZoomStrip: { ticks; labels; flags: { x: number; kind }[]; onCursor(wall: number): void; span: { from: number; to: number } }
  BackBar: { view: "live" | "back"; onView(v): void; filters; onFilters(f); canPrev: boolean; canNext: boolean; onPrev() onNext();
    playing: boolean; onPlay() onStop(); onMark(): void; off: boolean }
  MomentHeader: { time: string; bar: string; ago: string; playing: string }
  MessageList gains `past?: { at: number /* key of the line at the cursor */ }` (that line highlighted, lines after it dim, the list centred on it, no own scrolling)
  PlayingRows gains `state: … | "not-recorded"` and `past?: true` (the `recorded 4 times a second…` line instead of the live one; no `ended`)
  UniverseBlock gains `past?: { frameAt: string | null; named: boolean }` (line `frame of …` in place of the output state and frames/s; unnamed cells read `channel <n> · <value>`)
  MonitorBar gains `view?: { value: "live" | "back"; onChange(v): void }` (the `Live`/`Look back` switch at its left; absent: as today)
  ```
- Pinned by tests: both strips have fixed heights and are operable by pointer (click, drag) and keyboard (a slider role: arrows move the cursor as §4.6); flags are drawn above the activity, problems in the attention colour; hatching for gaps; the cursor stays in the middle of the zoom strip; with `past`, the Monitor's parts render nothing that implies "now"; without the new props the Monitor's parts render exactly as before (existing boards unchanged).

- [ ] **Step 1: Failing tests. Step 2:** → FAIL. **Step 3: Implement.**
- [ ] **Step 4:** stories `Debug/Back/Parts/*`; boards `debug-back-parts-<state>-1280x800`; **full** visual gate and Storybook (shared parts changed): no existing board moves.
- [ ] **Step 5: Commit** `feat(ds): the look-back strips and the Monitor's parts in the past`.

### Task 8: The screen; ds checkpoint (ds)

**Files:**
- Create: `packages/ds/src/debug/back/{LookBackScreen.tsx,LookBackScreen.module.css,ScreenHost.tsx,Screen.stories.tsx,index.ts}`
- Modify: `packages/ds/src/debug/index.ts` (export the back entry from `@ptah-app/ds/debug`), `docs/design-system.md`
- Test: `packages/ds/src/debug/back/__tests__/screen.test.tsx`

**Interfaces:**
- Produces: `LookBackScreen: { bar: BackBarProps; header; overview; cursor; zoom; moment: Moment | null; onCursor(wall); state: "ok" | "off" | "empty" }`, plus the key handling of §4.6 (`←` `→` `⇧←` `⇧→` `[` `]` Space `M` unless a field or the cells have the focus) calling `onCursor`/the bar's callbacks through props `onStep(kind, dir)`. Same column layout rule as the Monitor (three columns from 1080 px of its own width).

- [ ] **Step 1: Failing tests:** rows L3 (nothing shifts across cursor moves: boxes equal), L9, L10 at screen level; each key calls its callback once, none while a field has the focus, the cells keep their arrows; `nothing recorded here`; `The recorder is off (Settings).`
- [ ] **Step 2:** → FAIL. **Step 3: Implement.**
- [ ] **Step 4:** stories `Debug/Back/Screen/{Well, At a mark, At a problem, In a gap, Old recording, Playing, Recorder off}`; a no-shift play that steps the cursor 40 times and plays for 2 s; boards `debug-back-screen-*` at 1280×800, `-well-960x800`, `-well-390x844`.
- [ ] **Step 5: ds checkpoint:** `pnpm -F @ptah-app/ds build && pnpm -F @ptah-app/ds test && pnpm -F @ptah-app/ds test:storybook && pnpm -F @ptah-app/ds test:visual` → PASS.
- [ ] **Step 6: Commit** `feat(ds): the look-back screen`.

### Task 9: The page (web)

**Files:**
- Create: `apps/web/src/debug/{useLookBack.ts,LookBackPage.tsx}`, `apps/web/src/debug/__tests__/{useLookBack.test.tsx,lookback.page.test.tsx}`
- Modify: `apps/web/src/routes.ts` (`/debug/back`), `apps/web/src/App.tsx`, `apps/web/src/debug/MonitorPage.tsx` (the switch), `apps/web/src/api/types.ts`, `docs/app.md`

**Interfaces:**
- Consumes Tasks 5, 8; `GET /venues/{id}` + `typesOf` for today's cell names and revision (as the Monitor).
- Produces: `useLookBack(visible)` returning `LookBackScreen`'s props; the cursor in `?at=`; the chips shared with the Monitor's URL keys.

- [ ] **Step 1: Failing tests** for rows L1–L8, L11–L13 of the state table (fetch mocked with a small recorded session: two runs, a gap, a mark, a fault), plus: a drag across the strip sends no `/recorder/frames` until 150 ms after it rests; playing reads frames ahead and stops when `document.hidden`; the page sends no request other than GETs and `POST /recorder/marks`.
- [ ] **Step 2:** `pnpm -F @ptah-app/web test -- lookback` → FAIL. **Step 3: Implement. Step 4:** `pnpm -F @ptah-app/web test` → PASS; build, typecheck, Biome.
- [ ] **Step 5: Commit** `feat(web): Look back`.

### Task 10: Mark on Perform; the recorder's cost on Settings (web, ds)

**Files:**
- Modify: `packages/ds/src/perform/` (the key `M` beside the existing key handling in `Emergency.tsx`/`Transport.tsx`'s pattern, an `onMark` prop; palette entry), `apps/web/src/perform/PerformPage.tsx`, `packages/ds/src/settings/EngineFields.tsx` (the dim cost note), `apps/web/src/settings/SettingsPage.tsx` (passes `recorder.bytesPerHour` from `/server`), their tests, `docs/app.md`
- Shared parts change (Perform, Settings) → full visual gate.

**Interfaces:**
- Produces: Perform `onMark(): void` fired by `M` (not on repeat, not while a field has the focus, with or without a show); the page posts `/recorder/marks` and toasts `Marked <HH:MM:SS>` or `PTAH could not mark: the recorder is not writing`; the palette gains `Mark this moment`. Settings: beside `Recorder keeps the last`, `about <n> MB` = minutes × bytesPerHour / 60 for the DRAFT value (hidden while `bytesPerHour` is null; `about 1.3 GB` from 1000 MB); with 0: the existing `0: off` note.

- [ ] **Step 1: Failing tests:** `M` marks once, not on repeat, not in a field, with no show; the toast words for 200 and 503; the palette entry; Settings note words for 180 min at 220 MB/h (`about 660 MB`), 600 min (`about 2.2 GB`), null (no note), 0 (`0: off`).
- [ ] **Step 2:** → FAIL. **Step 3: Implement. Step 4:** ds and web tests PASS; **full** visual gate (re-record only the Settings boards whose note appears, if the samples carry a cost; Perform boards unchanged).
- [ ] **Step 5: Commit** `feat(web): mark a moment from Perform; the recorder's cost on Settings`.

### Task 11: End to end, docs, full gate

**Files:**
- Create: `apps/web/e2e/lookback.spec.ts`, `docs/ledgers/debug-look-back-owner-check.md`
- Modify: `apps/web/e2e/scroll.spec.ts`, `docs/app.md`, `docs/api.md`, `docs/engine.md`, `docs/design-system.md`

- [ ] **Step 1: e2e** (the Monitor spec's rig: real MIDI through `ptah play-midi` into a pid-unique virtual port, loopback outputs): `a mark made on Perform shows as a flag and ] goes to it`; `the message at the cursor has its row and the cells are lit as then`; `→ steps one frame and Space plays`; `after a restart the timeline has two runs with a gap between`; `the URL keeps the moment across a reload`; `the phone width shows the strips and the columns @phone`.
- [ ] **Step 2:** `pnpm -F @ptah-app/web test:e2e` → PASS.
- [ ] **Step 3: Docs and the owner check** (`docs/ledgers/debug-look-back-owner-check.md`): on the rig, (1) play a set and press `M` on Perform twice at moments you can describe; (2) open Look back, jump to each mark with `]`, and check what came in, what played and what went out match your memory; (3) step with the arrows and play with Space; (4) restart PTAH mid-rehearsal and find the gap; (5) after two hours, open the oldest moment and time how long it takes; (6) read the disk cost on Settings and compare with the folder's real size; (7) rename a row, look at a moment before the rename: it reads with the old name.
- [ ] **Step 4: Full gate:** `df -h /System/Volumes/Data | tail -1`, `pnpm allcheck` → exit 0 (an existing test that fails under load and passes alone is re-run once and reported); `du -sh target`.
- [ ] **Step 5: Commit** `test(web): look back end to end` and `docs: look back`.
