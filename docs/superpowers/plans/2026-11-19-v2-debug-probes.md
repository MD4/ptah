# Debug Live Probes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On a program's Builder page, a switch `From the show` shows every node's value and curve as the engine computes them in the playing show, for one row that plays the program.

**Architecture:** The engine probes at most one watched row: after each frame the render loop copies the newest voice's node slots (the existing `CompiledShow::probe`) and the row's setting values into storage allocated at load, published like the explanation of piece 3. Telemetry turns slots into node ids and serves a WebSocket topic `probe`; the server resolves the row by id and owns the watch's lifetime. The design system adds the switch, its reasons, the choosers and the status line to the Builder's dock; the web app feeds the canvas the same `NodeValues` from a `useShowProbe`.

**Tech Stack:** Rust 1.93 (no new crate), React 19 + the ds, Vitest, Storybook gates, Playwright 1.59.1, Biome, cargo-nextest 0.9.150.

**Spec:** `docs/superpowers/specs/2026-11-19-v2-debug-probes-design.md` (V1 repo). Executors read it first; § numbers below refer to it.

## Global Constraints

- Repo `~/projects/ptah-v2`, branch `debug-probes` from `master` (36678cb or later). V1 (`~/projects/ptah`) is never modified except this plan and its spec.
- Never start V1 services or pm2; never touch or read `~/.ptah` or `~/ptah-home`; tests use temp roots and free ports; the owner's Storybook servers on 6006–6008 stay up; no outward pushes; never kill a `ptah` you did not start.
- `AGENTS.md` (disk): no extra git worktree, no second `target/`; never `cargo clean` unless `du -sh target` is above 30 GB; `df -h /System/Volumes/Data | tail -1` before a full workspace build.
- No new dependency.
- **Render thread rules:** no allocation, no lock, no log, no `format!`; the probe storage is allocated at load. With no row watched the added work is one comparison per frame. The allocation guard (`ptah-vm/tests/frame.rs`) and `ptah-engine/tests/perf.rs` stay green with their limits unchanged, watched or not.
- **One engine:** the values are the slots of the voice the engine renders and the row's own setting values. No evaluation is added, in Rust or TypeScript; the page never computes a value in this mode.
- Biome only; tokens-only styling; nothing shifts (the dock's sections keep their boxes between the test preview and `From the show`, and between values); calm (no loud word in this mode); every action reachable by keyboard.
- Exact copy (§4):
  - the switch `From the show`; palette `From the show` / `Back to the test note`.
  - disabled reasons, first that applies: `load <show> first`; `no row uses this program`; `turn off On the rig first`; `On the rig is on, on another screen`. `On the rig` while the switch is on: `turn off From the show first`.
  - choosers: `row`; `light` with `newest note`, `light <m>`.
  - status line: `<note> · light <m> of <N> · <k> notes sounding` (`1 note sounding`); `all lights` in place of `light <m> of <N>`; `test note` in place of the note's name; `held` after the name; `not playing`; `not playing on light <m>`; `unsaved changes: save to see the show again`; `the show plays an older version: reload the show`; `this row is switched off or faulted: it plays nothing`; `another screen is probing <row>`.
  - `sampled 20 times a second: a very short hit may not show`; test panel `the show drives`; lights strip `lights: on the rig`; a node without a value `—`.
- Exact values: at most 1024 slots probed; samples at the debug rate (20 a second); the canvas ring stays 240 samples (12 s); `member` 0-based on the wire, 1-based on the page.
- Conventions (owner): failing test first with the RED output in the report; at most three agents at once; a UI task runs the visual gate for its boards and Storybook for its stories; a task that touches a shared part (the Builder's `Dock`, `Canvas`) runs the full visual gate; full gates at the checkpoints (Task 3 for Rust: `cargo nextest run --workspace`; Task 5 for the ds; `pnpm allcheck` in Task 7). Conventional Commits with scopes.

## Review Focus

1. A value shown on a node the engine did not compute it for: unsaved changes, an older revision in the show, a node id the engine does not know. → Task 6 tests on rows P6, P7 and `a_node_the_engine_does_not_know_shows_no_value`.
2. A reload while probing (the page's own save): the watch must come back on the same row, and never on another instance at the same index. → Task 2 `a_load_clears_the_probe`, Task 3 `the_probe_is_set_again_after_a_load_when_the_row_remains`.
3. A chord, a stolen voice, a held voice, a fading note: the note named is the one probed, and the count is right. → Task 1 tests.
4. `On the rig` on this or another screen: the engine then plays a draft; no probe may claim to be the show. → Task 2 `a_preview_clears_and_refuses_the_probe`, Task 6 rows P2, P13.
5. A big program (more slots than the storage) and a busy show: bounded, no allocation, flagged. → Task 1 `a_program_larger_than_the_storage_is_probed_up_to_it`, Task 2 perf guards.

## Execution order

- **Rust track:** 1 → 2 → 3. **Design system track:** 4 → 5. One task per track at a time, reviews alongside, three agents at most; both tracks in the main checkout (disjoint files).
- Then 6 (needs 3, 5) → 7.

## File structure

```
crates/ptah-vm/src/show/probe.rs            ProbeMeta, the row's settings read, storage size (additive)
crates/ptah-engine/src/{command,frame_loop,publish}.rs   Command::Probe, the copy after the frame, publication
crates/ptah-engine/src/telemetry/probe.rs   ProbeFrame (node ids), subscribe_probe
crates/ptah-engine/src/live_show.rs         ShowInfo: node tables, program revisions, group sizes
crates/ptah-server/src/{ws,http}/           topic `probe`, the command by instance id, lifetime
packages/ds/src/builder/                    ShowProbePanel (switch, reasons, choosers, status), Dock, TestPanel dimmed, lights line, model/probe.ts
apps/web/src/builder/useShowProbe.ts        NodeValues from the topic; availability; BuilderPage wiring
apps/web/e2e/probe.spec.ts
```

## State table: the page (every row is a test in the task named)

| # | State or event | Result | Task |
| --- | --- | --- | --- |
| P1 | page opened | switch off; availability computed (show info, the show's rows, `On the rig`, `preview` of show info) | 6 |
| P2 | cannot be on | disabled with the first reason that applies, in the copy list's order | 4, 6 |
| P3 | switch turned on | subscribe `probe`; send `probe {instanceId, member}` for the chooser's row and light; canvas values come from the topic; test panel dimmed; `On the rig` disabled | 5, 6 |
| P4 | a sample with voices | each node id in `nodes` feeds its ring; ids absent or null read `—`; status line from the message | 5, 6 |
| P5 | a sample with no voice | setting nodes keep values; the others `—`; `not playing` / `not playing on light <m>` | 4, 6 |
| P6 | the draft becomes dirty | values paused (`—`), `unsaved changes: save to see the show again`; no command sent; resumes when clean and a sample of the page's revision arrives | 6 |
| P7 | `programRevision` differs from the page's | `—`, `the show plays an older version: reload the show` | 6 |
| P8 | row or light chooser changed | `probe` sent again; rings cleared for the new source | 6 |
| P9 | a message for another row or light of this program | the choosers follow | 6 |
| P10 | a message for a row of another program, or `{instanceId: null}` not asked by this page | switch off; `another screen is probing <row>` (or the reason that now applies) | 6 |
| P11 | the same show reloads | switch stays on; values dimmed until the first new sample | 6 |
| P12 | another show loads, the row is removed | switch off with the reason that now applies | 6 |
| P13 | `On the rig` starts on another screen (show info `preview`) | switch off; `On the rig is on, on another screen` | 6 |
| P14 | the stream drops and returns | values dimmed; on return subscribe again, take the snapshot (follow it, or re-send the page's own row when nothing is probed) | 6 |
| P15 | switch turned off, or the page left | unsubscribe only; canvas back to the test preview | 6 |

---

### Task 1: The probe's facts (vm, additive)

**Files:**
- Create: `crates/ptah-vm/src/show/probe.rs`
- Modify: `crates/ptah-vm/src/show/mod.rs`, `crates/ptah-vm/src/voices.rs` (reads only), `docs/vm-rust.md`
- Test: `crates/ptah-vm/tests/probe.rs`; the allocation guard in `tests/frame.rs`

**Interfaces:**
- Consumes: `CompiledShow::probe(instance, member: Option<u32>) -> Option<&[f64]>` (unchanged).
- Produces:
  ```rust
  pub const PROBE_SLOTS: usize = 1024;
  #[derive(Clone, Copy, Debug, PartialEq)]
  pub struct ProbeMeta { pub member: u32, pub members: u32, pub together: bool,
      pub note: Option<u8>, pub held: bool, pub voices: u32 }   // voices: not free (sounding, fading, held)
  impl CompiledShow {
      /// The facts of what `probe(instance, member)` reads; `None` for an instance that plays no program.
      pub fn probe_meta(&self, instance: u32, member: Option<u32>) -> Option<ProbeMeta>;
      /// The row's current setting values, by parameter index, into `out`; returns how many.
      pub fn probe_settings(&self, instance: u32, out: &mut [f64]) -> usize;
      /// Off the render thread: per instance, (node id, slot) of its program and (node id, parameter index) of its setting nodes.
      pub fn probe_tables(&self) -> Vec<ProbeTable>;
      /// Whether `instance` plays a program now (not a scene, not disabled or faulted).
      pub fn probes(&self, instance: u32) -> bool;
  }
  ```
- `note`: `None` for a voice without a note (an audition or rig trigger) and when nothing plays; with no voice `member` is the asked one (0 without a pin), `voices` 0. The same voice is described as `probe` reads (newest by start order; with a pin, the newest on that member).

- [ ] **Step 1: Failing tests:** `one_note_names_its_note_and_light`; `a_chord_probes_the_newest_and_counts_all`; `a_pinned_light_probes_the_newest_voice_on_it`; `a_held_voice_reads_held_and_its_values_stand_still`; `a_fading_note_still_counts`; `a_stolen_voice_moves_the_probe_to_the_next_newest`; `no_voice_gives_no_slots_and_the_settings_still`; `a_setting_moved_by_a_source_reads_its_new_value_at_rest`; `an_all_together_row_reads_together_and_member_0`; `a_scene_or_a_disabled_row_does_not_probe`; `a_program_larger_than_the_storage_is_probed_up_to_it` (the tables flag slots ≥ `PROBE_SLOTS`); `the_tables_name_every_top_level_node_and_setting`; in `tests/frame.rs`, `probe`, `probe_meta` and `probe_settings` after a frame allocate nothing.
- [ ] **Step 2:** `cargo nextest run -p ptah-vm probe` → FAIL. **Step 3: Implement. Step 4:** `cargo nextest run -p ptah-vm`, `cargo check -p ptah-engine -p ptah-web --all-targets` → PASS.
- [ ] **Step 5: Commit** `feat(vm): the facts of a probed row`.

### Task 2: The probe command and its way out (engine)

**Files:**
- Create: `crates/ptah-engine/src/telemetry/probe.rs`
- Modify: `crates/ptah-engine/src/{command.rs,frame_loop.rs,publish.rs,engine.rs,live_show.rs}`, `telemetry/{mod.rs,core.rs,thread.rs}`, `tests/perf.rs`, `tests/suite/` (new `probe.rs`), `docs/engine.md`

**Interfaces:**
- Consumes Task 1; the piece-3 pattern (`Command::Watch`, `publish_why`, `WhyFrame`, `subscribe_why`).
- Produces:
  - `Command::Probe { instance: Option<u32>, member: Option<u32>, epoch: Option<u64> }`, wire `{"type":"probe","instance":<n>|null,"member":<n>|null,"epoch"?}`; accepted while the clock runs; acks `no show`, `unknown instance`, `no program` (a scene, a disabled or faulted row), `unknown member`, `preview` (a preview load holds the engine), `stale epoch`. A show adoption and a preview load clear the probe.
  - After each frame, while a row is probed: slots (up to `PROBE_SLOTS`), settings, `ProbeMeta`, frame index and `at` copied into storage allocated at load and published without allocation; nothing published when no row is probed.
  - `ShowInfo` gains per instance: its node table and setting table (from `probe_tables`), its program's revision (comparable with the revision the program's `GET` gives a page: use the revision the server already computes for that file, passed in at load, or the same function over the same bytes), and its group size.
  - Telemetry, at the debug rate and only while `probe` has subscribers: `ProbeFrame` with the spec §5.3 shape (`nodes`: every table node whose slot was probed, a setting node from the settings when no voice, a colour output always null); one cleared frame (`instance_id: None`) when the probe ends. `EngineHandle::subscribe_probe(capacity)`, `EngineHandle::probed() -> Option<(String, Option<u32>)>`.

- [ ] **Step 1: Failing tests:** `probe_is_accepted_while_the_clock_runs`; `each_refusal_has_its_ack`; `a_load_clears_the_probe` (one cleared frame); `a_preview_clears_and_refuses_the_probe`; `a_probe_frame_names_nodes_by_id_and_carries_the_meta`; `settings_are_named_at_rest`; `a_colour_output_is_null`; `the_frame_index_is_the_debug_frames`; `nothing_is_built_without_a_probe_subscriber`; `the_json_shape_is_the_specs` (a golden of §5.3); `a_replay_never_probes`. `tests/perf.rs`: the existing guards unchanged, plus the same guards with a row probed (0 allocations per frame, same limits).
- [ ] **Step 2:** → FAIL. **Step 3: Implement. Step 4:** `cargo nextest run -p ptah-engine`, clippy → PASS.
- [ ] **Step 5: Commit** `feat(engine): probe a row; its node values travel with the debug frames`.

### Task 3: The topic and the command by id; Rust checkpoint (server)

**Files:**
- Modify: `crates/ptah-server/src/ws/{topics.rs,mod.rs,owner.rs}`, the commands route, `crates/ptah-server/tests/` (new `probe.rs`), `docs/api.md`

**Interfaces:**
- Consumes Task 2; the `why` topic's code as the pattern (snapshot, book of the wanted id, re-arm after adoption, clear with the last subscriber).
- Produces:
  - Topic `probe`: messages are `ProbeFrame` JSON; a new subscriber gets a snapshot (the latest frame when a row is probed, else exactly `{"instanceId":null}`).
  - `POST /api/v1/commands` `{"type":"probe","instanceId":"<id>"|null,"member":<n>|null}` → 200 with the ack; refusals 404 `unknown-instance`, 409 `no-program` / `unknown-member` / `no-show` / `preview` / `stale-epoch`.
  - The server remembers the wanted (instance id, member, program id). After a load it probes again when the instance exists and plays the same program id, else forgets and broadcasts `{"instanceId":null}`. When the last `probe` subscriber leaves it sends `probe null` and forgets. A page turning its switch off only unsubscribes.
  - `GET /show-info` exposes what the page needs for availability if not already there (the playing show's id, `preview`).

- [ ] **Step 1: Failing tests:** `subscribing_to_probe_answers_a_snapshot`; `probe_by_id_names_that_rows_nodes`; each refusal; `the_probe_is_set_again_after_a_load_when_the_row_remains` (the instance moved to another index); `…and_cleared_when_the_row_or_its_program_is_gone`; `the_probe_outlives_one_of_two_subscribers`; `the_last_subscriber_leaving_clears_the_probe`; `a_preview_load_clears_it_and_tells_the_subscribers`; `ten_topics_subscribe_and_unsubscribe`.
- [ ] **Step 2:** → FAIL. **Step 3: Implement. Step 4: Rust checkpoint:** `df -h /System/Volumes/Data | tail -1`; `cargo nextest run --workspace`; `cargo clippy --workspace --all-targets`; the engine perf tests in release as `perf.rs`'s header says; `du -sh target`.
- [ ] **Step 5: Commit** `feat(server): the probe topic and probe by instance id`.

### Task 4: The dock's parts (ds)

**Files:**
- Create: `packages/ds/src/builder/ShowProbePanel.tsx`, `packages/ds/src/builder/model/probe.ts`, their tests
- Modify: `packages/ds/src/builder/{Dock.tsx,TestPanel.tsx,RigPanel.tsx,dockTypes.ts}` and the lights strip, the builder stories, CSS, `packages/ds/src/builder/sample.ts`
- The `Dock` is shared → full visual gate.

**Interfaces:**
- Produces:
  ```ts
  export type Probe = /* spec §5.3 message; instanceId: string | null */;
  export type ProbeReason = "no-show" | "no-row" | "rig-on" | "rig-elsewhere";
  export type ProbeState = { on: boolean; available: boolean; reason: ProbeReason | null; showName: string;
    rows: { id: string; name: string }[]; row: string | null; light: number | null /* null: newest note */; lights: number;
    status: string; dimmed: boolean };
  export function probeStatus(p: Probe | null, s: { dirty: boolean; revision: string | null; pinned: number | null;
    notes(n: number): string; rowName(id: string): string; other: string | null; rowOff: boolean }): string; // every status line of the copy list
  export function probeReason(r: ProbeReason, showName: string): string;
  // ShowProbePanel: { state: ProbeState; onToggle(on: boolean); onRow(id: string); onLight(light: number | null) }
  // TestPanel gains `inert?: boolean` (dimmed, `the show drives`); the lights strip gains `fromShow?: boolean` (`lights: on the rig`); RigPanel's toggle gains `blockedBy?: string`.
  ```
- Notes are worded by the existing `noteName`.

- [ ] **Step 1: Failing tests:** every status line and reason, word for word; singular and plural; `together` → `all lights`; `note: null` with voices → `test note`; the switch disabled with its reason; the choosers (`newest note`, `light <m>`; the row chooser only with several rows); the test panel inert and its line; the lights line; boxes equal between the test preview and the probe mode.
- [ ] **Step 2:** → FAIL. **Step 3: Implement.**
- [ ] **Step 4:** stories `Builder/Dock/{From the show, Not playing, Unsaved, Older version, Cannot be on}`; boards for them; ds tests, Storybook for the builder stories, **full** visual gate (existing Builder boards unchanged except where the dock gains the switch: say which were re-recorded).
- [ ] **Step 5: Commit** `feat(ds): From the show, in the Builder's dock`.

### Task 5: The screen in probe mode; ds checkpoint (ds)

**Files:**
- Modify: `packages/ds/src/builder/{BuilderScreen.tsx,Canvas.tsx,ScreenHost.tsx,Screen.stories.tsx}`, their tests, the palette entries, `docs/design-system.md`

**Interfaces:**
- Consumes Task 4.
- Produces: `BuilderScreen` gains `probe?: { state: ProbeState; onToggle; onRow; onLight }`; while `state.on`, the canvas draws the `values` it is given as today (the web side feeds the probe's), a colour output draws `—` with no swatch and no curve (`values` holds no entry for it), `dimmed` dims values and curves; the palette holds `From the show` / `Back to the test note` when available.

- [ ] **Step 1: Failing tests:** rows P3, P4 at screen level; a node without an entry reads `—` and a flat curve; a colour output without an entry draws no swatch; the palette entries; `On the rig` disabled with `turn off From the show first`; nothing shifts between modes (boxes equal at 1280 and 960).
- [ ] **Step 2:** → FAIL. **Step 3: Implement.**
- [ ] **Step 4:** stories `Builder/Screen/{From the show, From the show not playing}` with a no-shift play toggling the mode and swapping 40 samples; boards at 1280×800 and 960×800.
- [ ] **Step 5: ds checkpoint:** `pnpm -F @ptah-app/ds build && pnpm -F @ptah-app/ds test && pnpm -F @ptah-app/ds test:storybook && pnpm -F @ptah-app/ds test:visual` → PASS.
- [ ] **Step 6: Commit** `feat(ds): the Builder shows the show's values`.

### Task 6: The page (web)

**Files:**
- Create: `apps/web/src/builder/useShowProbe.ts`, `apps/web/src/builder/__tests__/{useShowProbe.test.tsx,probe.page.test.tsx}`
- Modify: `apps/web/src/builder/BuilderPage.tsx`, the ds live topic types if `probe` is not there (`packages/ds/src/live/types.ts`, `StreamProvider.tsx`), `docs/app.md`

**Interfaces:**
- Consumes Tasks 3, 5. `rowsOf` (`derive.ts`) gives the rows that use the program; the show file gives the group sizes; show info gives the playing show and `preview`; the program's `GET` gives the page's revision.
- Produces: `useShowProbe({ program, rows, dirty, rigOn, visible })` returning `{ state: ProbeState, values: NodeValues | null, onToggle, onRow, onLight }`; `BuilderPage` passes `values` to the canvas in place of the preview's while the switch is on and the values are not paused. Rings are the preview's (240 samples), keyed by node id.

- [ ] **Step 1: Failing tests** for rows P1–P15 of the state table (socket and fetch mocked), plus: `a_node_the_engine_does_not_know_shows_no_value`; the page sends nothing but today's requests and `probe`; no `probe` is sent while dirty or while the revision differs.
- [ ] **Step 2:** `pnpm -F @ptah-app/web test -- probe` → FAIL. **Step 3: Implement. Step 4:** `pnpm -F @ptah-app/web test` → PASS; build, typecheck, Biome.
- [ ] **Step 5: Commit** `feat(web): From the show`.

### Task 7: End to end, docs, a small follow-up, full gate

**Files:**
- Create: `apps/web/e2e/probe.spec.ts`, `docs/ledgers/debug-probes-owner-check.md`
- Modify: `docs/{app,api,engine,design-system}.md`; `packages/ds/src/settings/OffsetAdvice.tsx` (the follow-up below) and its board

- [ ] **Step 1: e2e** (the real-MIDI rig of `e2e/midi.ts`; polls, not sleeps): `a played note shows on the program's nodes and the status line names it`; `a setting moved by a CC shows on its node, with and without a note`; `stopping reads not playing`; `an edit pauses the values and a save brings them back`; `On the rig cannot be turned on while From the show is on`; `leaving the page ends the probe` (a new raw socket's snapshot is `{instanceId:null}`).
- [ ] **Step 2:** `pnpm -F @ptah-app/web test:e2e -- probe` → PASS.
- [ ] **Step 3: Follow-up from the measured offset:** in `OffsetAdvice.tsx` the rate inside the brackets keeps together (`(44 Hz)` with a non-breaking space, in the shown and the held words); re-record `settings-phone-offset-estimated-390x844`; its test.
- [ ] **Step 4: Docs and the owner check** (`docs/ledgers/debug-probes-owner-check.md`): on the rig, (1) play a song, open the program of a row that plays, turn on `From the show`: the values move with the song; (2) move a CC from Reaper: its setting node follows, with and without a note; (3) play a chord: the count is right and the newest note is named; (4) pin a light on a row that spreads its lights; (5) edit a node: the values pause; save: they come back; (6) open the same program on the phone or a second window: both follow the same row; (7) turn the switch off and check Debug's `Work per frame` is what it was; (8) on the Pi, the same during the busiest song.
- [ ] **Step 5: Full gate:** `df -h /System/Volumes/Data | tail -1`, `pnpm allcheck` → exit 0 (a test that fails under the parallel load and passes alone is re-run once and reported); `du -sh target`.
- [ ] **Step 6: Commit** `test(web): probes end to end`, `fix(ds): the offset's rate keeps together`, `docs: live probes`.
