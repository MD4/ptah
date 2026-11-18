# Debug Monitor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Debug tab shows the live signal path in three columns: each incoming message with the rows that listen to it, the rows playing now, and each universe's values, frame rate and timing, with a Pause that freezes the page.

**Architecture:** The engine's telemetry side, where the live health already judges each event against the show in force for its frame, also builds a "judged event" (what listens, the beat, flags) and offers it to subscribers; the server sends it as a new WebSocket topic `heard`. The render thread, the `events` topic and the recorder do not change. The screen's parts and pure model live in the design system (`packages/ds/src/debug`); `apps/web/src/debug` subscribes and wires them.

**Tech Stack:** Rust 1.93 (no new crate), React 19 + the ds, Vitest, Storybook gates, Playwright 1.59.1, Biome, cargo-nextest 0.9.150.

**Spec:** `docs/superpowers/specs/2026-11-18-v2-debug-monitor-design.md` (V1 repo, f87934d). Executors read it first; § numbers below refer to it.

## Global Constraints

- Repo `~/projects/ptah-v2`, branch `debug-monitor` from `master` (c66b2d3 or later). V1 (`~/projects/ptah`) is never modified except this plan and its spec.
- Never start V1 services or pm2; never touch `~/.ptah` or `~/ptah-home`; tests use temp roots and free ports; the owner's Storybook servers on 6006–6008 stay up; no outward pushes.
- `AGENTS.md` (disk): no extra git worktree (every task works in the main checkout, on disjoint files, staging by explicit path); never `cargo clean` mid-plan unless `du -sh target` is above 30 GB; `df -h /System/Volumes/Data | tail -1` before a full workspace build, stop below 30 GB free.
- No new dependency, npm or crate.
- **The render thread does not change** (no new work, allocation, lock or message in `render_frame` or the frame loop); its allocation guards (`ptah-vm/tests/frame.rs`, `ptah-engine/tests/perf.rs`) stay green untouched. The `events` topic, the event ring and the recorder's files do not change.
- **One engine:** the page never decides what listens to an event; it only words what `heard` says.
- Biome only; tokens-only styling; no shadows but the focus ring; 44 px targets on a coarse pointer; nothing shifts (every list is a fixed region, every status word has a fixed box, the cell line is always present); calm when well, loud only when wrong; every part reachable by keyboard. The screen scrolls inside the shell's page area, never the window.
- The page only watches: it sends no command and writes nothing.
- Exact copy (§4):
  - chips `notes`, `CC`, `other`, `only what nothing listens to`; `Pause`, `Resume`; `Paused at bar <n>`; `<show> on <venue>`; `No show is playing`; `No venue yet.`
  - headings `Coming in`, `Messages`, `Playing now`, `Overrides`, `Problems`, `Going out`, `Timing · last 10 s`, columns `usual`, `worst`.
  - devices as Settings: `message <n> s ago` / `message <n> min ago`, `silent`, `not plugged in`, `off`. Clock: `clock: locked, <t> bpm, bar <b>` / `clock: internal, <t> bpm` / `clock: free-run` / `clock: stopped` / `clock: waiting for Reaper`.
  - message words: `note C3  vel 100`, `note C3  off`, `CC 21 = 64`, `CC14 21 = 8192`, `NRPN 300 = 12`, `pitch bend +1200`, `aftertouch 64`, `aftertouch C3 64`, `program change 4`, `start`, `stop`, `continue`, `song position 16`, `OSC /lights/go 1`, `panic`.
  - listens words: `<row>`, `<row> · <row> · <row> +<n>`, `<row>: <setting>`, the override's name (`blackout`, `master`, `freeze`, `house lights`), `song: <name>`, `section of <name>`, `nothing listens`, `no show`.
  - rows: `<name>` with `<n> b`; `ended`; `refreshed 4 times a second: a very short hit may not show`; `not available on a replay`; overrides `Master <n> %`, `Blackout`, `Freeze`, `House lights` with `on` / `off`; problems `none`.
  - going out: `Enttec USB Pro`, `Art-Net <host>`, `sACN <universe>`, `no output`; `sending`, `not sent`; `<n> frames/s`; `channel <n> · <fixture> · <channel name> · <value>`, `channel <n> · no fixture · <value>`; timing lines `Note in → frame out`, `Frame out → on the wire`, `Work per frame`, `Dropped`; `—` for no sample; list separator `— paused <n> s —`.
- Exact values: 500 lines shown, 2000 events kept; an ended row lingers 2 s; frames/s over the last 2 s; devices asked once a second, server drop counters every 2 s; `usual` = p50 and `worst` = max of the 10 s window; ms with one decimal under 10, none above; three columns from 1080 px of the page's own width; 32 cells per row; note 60 = C3; a burst of 500 control messages in a second keeps the page at 30 frames/s or more.
- Conventions (owner): failing test first with the RED output in the report; at most three agents at once; a UI task runs `node packages/ds/scripts/test-visual.mjs --only <its boards>` and Storybook for its own stories; any task that touches a shared part runs the full visual gate; full gates at the checkpoints (Task 3 for Rust: `cargo nextest run --workspace`; Task 6 for the ds; `pnpm allcheck` in Task 8).
- Conventional Commits with scopes (`feat(engine)`, `feat(server)`, `feat(ds)`, `feat(web)`, `test(web)`, `docs`).

## Review Focus

1. Reaper's stop/start burst (CC 64 = 0, pitch bend centre, CC 120/123 on 16 channels, each also a `panic`): no line may read `nothing listens`, and with the default chips none is listed. → Task 1 test `the_reset_burst_is_never_unheard`; Task 4 filter cases.
2. A show is swapped while messages stream: a message must be worded with the show that judged it, and names must not go blank or stale. → Task 2 test `an_event_is_judged_with_its_frames_show`; Task 7 test `names follow the show`.
3. The tab is hidden or the page left: the subscriptions end (the engine must not keep feeding a hidden page), and coming back starts clean. → Task 7 tests.
4. A long session: the page's memory stays bounded (2000 events, the latest frames only). → Task 4 ring tests; Task 7 test over 10 000 events.
5. No show, no venue, a replay (no voices): each column says so in plain words instead of looking broken. → Task 5 stories and tests.

## Execution order

- **Rust track:** 1 → 2 → 3. **Design system track:** 4 → 5 → 6. One task per track at a time, reviews alongside, three agents at most; both tracks in the main checkout (disjoint files).
- Then 7 (needs 3, 6) → 8.

## File structure

```
crates/ptah-engine/src/heard.rs           HeardBy, JudgedEvent, ShowInfo-based judging (pure)
crates/ptah-engine/src/telemetry/         live.rs builds judged events; core.rs/thread.rs subscribe_heard
crates/ptah-server/src/ws/                the `heard` topic; metrics.at
crates/ptah-server/static/debug.html      deleted (and its route, tests, mentions)
packages/ds/src/debug/model/              ring.ts words.ts rows.ts timing.ts pause.ts
packages/ds/src/debug/                    MonitorBar MessageList DeviceLines PlayingRows Overrides Problems
                                          UniverseBlock TimingTable MonitorScreen + stories
apps/web/src/debug/                       useMonitor.ts MonitorPage.tsx
apps/web/e2e/debug.spec.ts
```

## State table: the page (every row is a test in the task named)

| # | State or event | Result | Task |
| --- | --- | --- | --- |
| M1 | page shown | subscribes to `heard`, `voices`, `state`, `clock`, `metrics`, `faults`, `frames`; asks `/devices` every 1 s, `/status` every 2 s, the show file and the venue once | 7 |
| M2 | page hidden (tab hidden) or left | unsubscribes all, stops the timers; on return starts again with an empty ring | 7 |
| M3 | `state.showInfo` names another show or venue | the show file and venue are read again; lines already listed keep the names they were worded with | 7 |
| M4 | a chip toggled | the list is re-filtered from the 2000 kept events; the URL is updated; nothing else moves | 4, 7 |
| M5 | `Pause` (button or Space, no field focused) | all three columns stop changing at one instant; the bar reads `Paused at bar <n>`, the button `Resume` | 4, 6, 7 |
| M6 | paused, events keep arriving | nothing shown changes; the list can be scrolled back; `Dropped` keeps counting internally | 4, 7 |
| M7 | `Resume` | the newest state shows at once; the list continues with one `— paused <n> s —` line; what arrived while paused is not listed | 4, 7 |
| M8 | the stream drops (PTAH restarts) | the shell's stale handling shows as on Perform; on return the page re-subscribes and the ring starts empty | 7 |
| M9 | no show / no venue / a replay without voices | the plain words of §4.2–§4.4 | 5, 7 |
| M10 | a burst of 500 control messages in a second | drawing batched per animation frame; the frame-cost gate passes | 6 |

---

### Task 1: What listens to an event (engine, pure)

**Files:**
- Create: `crates/ptah-engine/src/heard.rs`; modify `crates/ptah-engine/src/lib.rs` (declare), `crates/ptah-engine/src/live_show.rs` (lookups on `ShowInfo` only if a needed one is missing), `crates/ptah-engine/src/live_health.rs` (share its predicates, do not duplicate them)
- Test: in `heard.rs`

**Interfaces:**
- Produces:
  ```rust
  #[derive(Clone, Debug, PartialEq, Serialize)] #[serde(rename_all = "camelCase", untagged)]
  pub enum HeardBy {
      Row { row: String, #[serde(skip_serializing_if = "Option::is_none")] setting: Option<String> },
      Override { r#override: String },                       // "blackout" | "master" | "freeze" | "houseLights"
      Song { song: u32, #[serde(skip_serializing_if = "std::ops::Not::not")] section: bool },
  }
  #[derive(Clone, Debug, PartialEq, Serialize)] #[serde(rename_all = "camelCase")]
  pub struct JudgedEvent {
      #[serde(flatten)] pub event: InEvent,
      pub beat: Option<f64>, pub judged: bool, pub part: bool, pub housekeeping: bool,
      pub osc: Option<String>, pub heard: Option<Vec<HeardBy>>,   // None: no show
  }
  pub fn judge(info: Option<&ShowInfo>, e: &InEvent, beat: Option<f64>) -> JudgedEvent
  ```
- Rules (§6.1): `judged` false for start, stop, continue, song position, panic, an OSC trigger off, internal constants and transport housekeeping (`live_health::is_transport_housekeeping`, which also sets `housekeeping`); a note off IS judged and lists the rows of its note; `part` true for a raw CC that is the MSB/LSB of a 14-bit CC or an NRPN select/data CC (99/98/6/38) the show reads, with an empty `heard`; `osc` = the route's address for OSC events; with no show `heard` is `None`.
- Invariant (tested): for every event the live health classifies, `mapped == (!heard.is_empty() || housekeeping)`.

- [ ] **Step 1: Failing tests** on the fixtures' shows (as `live_health`'s tests load them) plus literals: `a_note_two_rows_listen_to_lists_both_in_row_order`; `a_note_nothing_listens_to_is_judged_and_empty`; `a_note_off_lists_its_notes_rows`; `a_cc_bound_to_a_setting_names_the_row_and_setting`; `a_cc_nothing_reads_is_empty`; `a_cc14_and_an_nrpn_mark_their_parts`; `an_override_trigger_names_the_override`; `a_program_change_names_its_song`; `a_section_cc_names_its_song_with_section`; `osc_carries_its_address`; `start_stop_and_panic_are_not_judged`; `the_reset_burst_is_never_unheard` (CC 64 = 0, pitch bend centre, CC 120, CC 123 on 16 channels and their `panic`s: none has `judged && heard == Some(empty)`); `no_show_gives_null_heard`; `heard_agrees_with_the_live_healths_mapped` (every event of `fixtures/` clock/recorded input through both); JSON shape test (camelCase, `setting` and `section` omitted when absent).
- [ ] **Step 2:** `cargo nextest run -p ptah-engine heard` → FAIL.
- [ ] **Step 3: Implement** with the existing `ShowInfo` lookups (`note_channels`, `note_mapped`, `pc_mapped`, `osc_trigger_mapped`, `osc_trigger_address`, the source bindings); `live_health::classify` and `judge` must share the mapping predicates.
- [ ] **Step 4:** `cargo nextest run -p ptah-engine` → PASS (the perf and frame guards untouched).
- [ ] **Step 5: Commit** `feat(engine): what listens to an event, by the live health's rules`.

### Task 2: Judged events for subscribers (engine telemetry)

**Files:**
- Modify: `crates/ptah-engine/src/telemetry/{live.rs,core.rs,thread.rs,mod.rs}`, `crates/ptah-engine/src/engine.rs`
- Test: `crates/ptah-engine/tests/suite/` (a new `heard.rs` in the suite) and unit tests in `live.rs`

**Interfaces:**
- Consumes Task 1.
- Produces: `TelemetryCore::subscribe_heard(capacity: usize) -> Receiver<JudgedEvent>`, and the same on the telemetry thread handle and on `EngineHandle` (as `subscribe_events` is exposed, `engine.rs:908`). A judged event is sent from `live_observe` (the point where the held event is fed with the show in force for its frame), built only when there is a subscriber; a full subscriber drops and counts in `counters.dropped` (a new `heard_subscribers`, as `event_subscribers`). `beat`: the song beat of the tick report that released the event (the clock fields the tick carries; `None` when the clock is stopped or waiting, and for events fed with `None`).

- [ ] **Step 1: Failing tests:** `judged_events_reach_a_subscriber_in_seq_order`; `an_event_is_judged_with_its_frames_show` (an event drained just before a show swap is judged with the show of its frame, as the live health's own test asserts for `mapped`); `beat_is_null_while_the_clock_is_stopped`; `no_subscriber_builds_nothing` (a counter or a test hook shows `judge` is not called); `a_slow_subscriber_drops_and_counts`; `the_events_subscription_is_unchanged` (same events, same order, same timing as before for `subscribe_events`).
- [ ] **Step 2:** → FAIL. **Step 3: Implement. Step 4:** `cargo nextest run -p ptah-engine` → PASS, including `tests/perf.rs` untouched.
- [ ] **Step 5: Commit** `feat(engine): judged events for subscribers`.

### Task 3: The `heard` topic, `metrics.at`, the old page gone; Rust checkpoint (server)

**Files:**
- Modify: `crates/ptah-server/src/ws/topics.rs` (+ the files of `ws/` and `owner.rs` that forward `events`), `crates/ptah-server/src/lib.rs` and `src/http/app.rs` (the `/debug` route and its JSON 404 for `/debug/…` removed: both fall through to the app), `README.md`, `docs/api.md`, `docs/engine.md`, `crates/ptah/src/cmd/replay.rs` (help text)
- Delete: `crates/ptah-server/static/debug.html`, `crates/ptah-server/tests/debug_page.rs`
- Test: `crates/ptah-server/tests/ws.rs`, `tests/app.rs`

**Interfaces:**
- Consumes Task 2.
- Produces: WebSocket topic `heard`: snapshot = the last 64 `JudgedEvent`, deltas = batches per owner step, exactly as `events` is forwarded (same outbox, same drop counting); the owner subscribes to the engine with capacity 4096. `metrics` snapshot and deltas gain `at` (engine ns of the snapshot they come from). `GET /debug` and `GET /debug/x` answer the app's `index.html` (as any app route).

- [ ] **Step 1: Failing tests:** `heard_sends_a_snapshot_then_batches` (fake MIDI: a mapped note and an unmapped one; the entries carry `heard`, `judged`, `beat`); `heard_and_events_can_be_subscribed_together`; `metrics_carry_at`; `the_debug_route_serves_the_app` (replaces the old page's test); `unknown-topic` still answers for a bad name.
- [ ] **Step 2:** → FAIL. **Step 3: Implement. Step 4:** `cargo nextest run -p ptah-server` → PASS.
- [ ] **Step 5: Rust checkpoint:** `df -h /System/Volumes/Data | tail -1`, then `cargo nextest run --workspace` and `pnpm rust:allcheck` → PASS.
- [ ] **Step 6: Commit** `feat(server): the heard topic; the throwaway debug page goes`.

### Task 4: The monitor model (ds, pure)

**Files:**
- Create: `packages/ds/src/debug/types.ts`, `packages/ds/src/debug/model/{ring,words,rows,timing,pause,index}.ts`; add `"heard"` to the topic union in `packages/ds/src/live/types.ts` (a shared part: full ds unit run, no visual change)
- Test: `packages/ds/src/debug/model/__tests__/*.test.ts`

**Interfaces:**
- Produces (from `model/index.ts`):
  ```ts
  type Judged = { at: number; seq: number; device: number; kind: Record<string, unknown>; beat: number | null;
    judged: boolean; part: boolean; housekeeping: boolean; osc: string | null; heard: HeardBy[] | null };
  type HeardBy = { row: string; setting?: string } | { override: string } | { song: number; section?: true };
  type Chip = "notes" | "cc" | "other";
  type Filters = { show: Set<Chip>; unheard: boolean };
  type Names = { rows: Map<string, string>; songs: Map<number, string>; devices: string[] };
  type Line = { key: number; bar: string; from: string; channel: string; message: string; listens: string;
    tone: "hit" | "dim" | "attention" | "none" } | { key: number; gap: string /* "— paused 14 s —" */ };
  class Ring { push(batch: Judged[], names: Names): void; lines(f: Filters): Line[] /* ≤ 500 */; size: number /* ≤ 2000 */; gap(seconds: number): void; clear(): void }
  chipOf(e: Judged): Chip | null                // null: never listed (clock, audio levels)
  messageWords(e: Judged): string; channelOf(e: Judged): string
  listensWords(e: Judged, names: Names): { text: string; tone: Line["tone"] }
  barWords(beat: number | null, beatsPerBar: number): string      // "12.1.0", "—"
  filtersFromQuery(q: string): Filters; filtersToQuery(f: Filters): string   // ?show=notes,cc&unheard=1; default notes+cc
  playingRows(voices: VoiceView[], order: string[], names: Names, nowMs: number, prev: PlayingState): { rows: PlayingRow[]; state: PlayingState }
    // PlayingRow = { id; name; age: string /* "2 b" */ | "ended"; on: boolean }; an ended row stays 2000 ms; show row order
  frameRate(samples: { at: number; sent: number }[]): number | null     // over the last 2 s of samples (at in ns)
  timingLines(metrics: Metrics | null, dropped: number): { label: string; usual: string; worst: string; attention?: boolean }[]
  ms(ns: number | null): string                  // "—", "0.3", "9.4", "11"
  ```
- A line is worded when pushed (names of that moment); re-filtering never re-words.

- [ ] **Step 1: Failing tests,** including: every message kind's exact words (the copy list); note names (60 = C3); `listensWords` for one row, three rows, five rows (`a · b · c +2`), a setting, each override, a song, a section, nothing (`nothing listens`, attention), not judged (empty, none), a part (empty), no show (`no show`, dim), a note off (dim); `chipOf` for each kind (panic, housekeeping and parts → `other`; clock pulses → null); the ring keeps 2000 and shows 500 after filters; `unheard` keeps only `judged && heard.length === 0`; a filter change re-filters without re-wording (rename a row between pushes: old lines keep the old name); `gap` inserts one separator; query round trip and defaults; `playingRows` order, age in beats, the 2 s linger then removal, a scene by its name; `frameRate` 44 from counters over 2 s, null with fewer than two samples; `timingLines` p50/max, the slowest universe for the wire line, USB Pro adds `sent_to_written`, `—` without samples, `Dropped` attention above 0; `ms` rounding.
- [ ] **Step 2:** `pnpm -F @ptah-app/ds test -- src/debug` → FAIL. **Step 3: Implement. Step 4:** → PASS; `pnpm -F @ptah-app/ds test` (the live type changed) → PASS.
- [ ] **Step 5: Commit** `feat(ds): the debug monitor's model`.

### Task 5: The monitor's parts (ds)

**Files:**
- Create: `packages/ds/src/debug/{MonitorBar,MessageList,DeviceLines,PlayingRows,Overrides,Problems,UniverseBlock,TimingTable}.tsx`, `Debug.module.css`, `sample.ts`, `Parts.stories.tsx`
- Test: `packages/ds/src/debug/__tests__/parts.test.tsx`

**Interfaces:**
- Consumes Task 4; existing components and Perform's fault and clock words (`packages/ds/src/live`, `packages/ds/src/perform`): import them, do not copy.
- Produces (props):
  ```ts
  MonitorBar: { filters: Filters; onFilters(f: Filters): void; playing: string | null /* "<show> on <venue>" */; paused: null | { bar: string }; onPause(): void; onResume(): void }
  MessageList: { lines: Line[]; scrollable: boolean /* true while paused */ }
  DeviceLines: { devices: { name: string; word: string; tone: "ok" | "idle" | "attention" }[]; clock: string }
  PlayingRows: { rows: PlayingRow[]; state: "ok" | "no-show" | "replay" }
  Overrides: { master: number; blackout: boolean; freeze: boolean; houseLights: boolean }
  Problems: { faults: { words: string; age: string }[] }
  UniverseBlock: { name: string; output: string; state: { word: string; attention: boolean }; fps: number | null;
    values: Uint8Array /* 512 */; cellInfo(channel: number): { fixture: string; channelName: string } | null }
  TimingTable: { lines: ReturnType<typeof timingLines> }
  ```
- Pinned by tests: the message list is a fixed-height region, newest at the bottom, each line one fixed height, long cells end in `…` with a `title`; it does not scroll itself unless `scrollable`; the cells are one tab stop, arrows move the focused cell, the line under them always exists and reads `channel 17 · Par 3 · red · 212` / `channel 400 · no fixture · 0`; the cells are drawn on a canvas or as elements at the builder's choice, but values update without re-creating the 512 nodes; `PlayingRows` says `No show is playing` / `not available on a replay` and always carries the `refreshed 4 times a second…` line; `Problems` empty says `none`; an override `on` is in the attention colour.

- [ ] **Step 1: Failing tests** for the above. **Step 2:** → FAIL. **Step 3: Implement.**
- [ ] **Step 4:** stories `Debug/Parts/*` (well, nothing listens, no show, replay, a fault, an override on, several universes, an unpatched cell focused); boards `debug-parts-<state>-1280x800`; `node packages/ds/scripts/test-visual.mjs --only debug-parts`; Storybook for these stories.
- [ ] **Step 5: Commit** `feat(ds): the debug monitor's parts`.

### Task 6: The screen, pause, the gates; ds checkpoint (ds)

**Files:**
- Create: `packages/ds/src/debug/{MonitorScreen.tsx,MonitorScreen.module.css,ScreenHost.tsx,Screen.stories.tsx,index.ts}`
- Modify: `packages/ds/package.json` (export `./debug`), `packages/ds/vite.config.ts`, `packages/ds/tsconfig.build.json`, `docs/design-system.md`
- Test: `packages/ds/src/debug/__tests__/screen.test.tsx`

**Interfaces:**
- Produces (from `@ptah-app/ds/debug`): everything of Tasks 4–5 plus
  ```ts
  MonitorScreen: { bar: MonitorBarProps; devices; clock; lines: Line[]; rows; rowsState; overrides; faults;
    universes: UniverseBlockProps[] | "no-venue"; timing; paused: boolean }
  ```
  Three columns from 1080 px of the screen's own width (a container query), one column below, the same content at phone width. Space toggles pause unless a field has the focus. While `paused` the screen renders the props it had at the pause (it holds them itself), so the page may keep passing live props.

- [ ] **Step 1: Failing tests:** rows M5–M7 at the screen level (paused props are held, `Resume` shows the newest, Space toggles, Space in a field does not); the three headings in order; `No venue yet.`; one column under 1080 px of container.
- [ ] **Step 2:** → FAIL. **Step 3: Implement.**
- [ ] **Step 4:** stories `Debug/Screen/{Well, Nothing listens, No show, No venue, Fault, Paused, Two universes, Burst}`; a no-shift story test that streams 200 lines and toggles pause (`noShift` helper); the frame-cost gate (`packages/ds/src/gates`) on `Burst` (500 control messages in a second, ≥ 30 frames/s); boards `debug-screen-*` at 1280×800, `debug-screen-well-960x800`, `debug-screen-well-390x844`.
- [ ] **Step 5: ds checkpoint:** `pnpm -F @ptah-app/ds build && pnpm -F @ptah-app/ds test && pnpm -F @ptah-app/ds test:storybook && pnpm -F @ptah-app/ds test:visual` → PASS.
- [ ] **Step 6: Commit** `feat(ds): the debug monitor screen`.

### Task 7: The page (web)

**Files:**
- Create: `apps/web/src/debug/{useMonitor.ts,MonitorPage.tsx}`, `apps/web/src/debug/__tests__/{useMonitor.test.tsx,page.test.tsx}`
- Modify: `apps/web/src/routes.ts` (`debug: "/debug"`, in `shipped` between `builder` and `settings`), `apps/web/src/App.tsx`, `apps/web/src/api/types.ts`, `apps/web/src/__tests__/routes.test.tsx`, `docs/app.md`

**Interfaces:**
- Consumes Tasks 3, 6; the live source the other pages use (`useEngineData` / the ds live layer) for subscriptions and the stream's status; `GET /devices`, `GET /status` (server drop counters), `GET /server` (venue id), `GET /shows/{id}`, `GET /venues/{id}` and the fixture types as Perform's `useRig` reads them (reuse it for `cellInfo`).
- Produces: `useMonitor(visible: boolean)` returning the `MonitorScreen` props (lines from a `Ring`, rows via `playingRows`, universes with `frameRate`, timing via `timingLines`, `dropped` counted from the page's opening), with batching: stream messages are queued and applied once per animation frame.

- [ ] **Step 1: Failing tests** for rows M1–M4, M8, M9 of the state table, plus: `names follow the show` (a show swap: new lines use the new names, old lines keep theirs); memory bounded over 10 000 events (ring size 2000); the URL carries the filters and a reload restores them; the Debug tab sits between Builder and Settings and `/debug` renders the page; the page sends no `POST` and no command at any point of the tests.
- [ ] **Step 2:** `pnpm -F @ptah-app/web test -- debug` → FAIL. **Step 3: Implement. Step 4:** `pnpm -F @ptah-app/web test` → PASS; build, typecheck, Biome.
- [ ] **Step 5: Commit** `feat(web): the Debug tab's monitor`.

### Task 8: End to end, docs, full gate

**Files:**
- Create: `apps/web/e2e/debug.spec.ts`, `docs/ledgers/debug-monitor-owner-check.md`
- Modify: `apps/web/e2e/scroll.spec.ts` (Debug scrolls inside the page), `docs/app.md`, `docs/api.md`, `docs/engine.md`, `docs/design-system.md`

- [ ] **Step 1: e2e** (the harness of `apps/web/e2e/engine.ts`, fake I/O with its fake MIDI input, or `ptah play-midi` into the engine as the other specs inject notes): `a note shows with its row, another with nothing listens`; `the row appears under Playing now and a cell lights`; `Pause holds the list while notes continue, Resume continues with the paused line`; `the only-unheard chip leaves the unheard note`; `the phone width shows the three blocks @phone`; `the old debug page is gone: /debug is the app`.
- [ ] **Step 2:** `pnpm -F @ptah-app/web test:e2e` → PASS.
- [ ] **Step 3: Docs and the owner check** (`docs/ledgers/debug-monitor-owner-check.md`): on the rig, (1) play the band's show from Reaper and read a chorus: each note with its row; (2) send a note on a channel nothing uses and see `nothing listens`; (3) unplug the controller and see it within a second; (4) stop and start Reaper: no `nothing listens` from the reset burst; (5) point at a lit cell and check the fixture named is the one lit; (6) compare `Note in → frame out` with the −ms set in Reaper; (7) press Space mid-song, read, resume.
- [ ] **Step 4: Full gate:** `df -h /System/Volumes/Data | tail -1`, `pnpm allcheck` → exit 0 (a failing existing e2e that passes alone is re-run once and reported); `du -sh target`.
- [ ] **Step 5: Commit** `test(web): the debug monitor end to end` and `docs: the debug monitor`.
