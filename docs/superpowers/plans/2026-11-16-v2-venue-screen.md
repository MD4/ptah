# Venue Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Venue screen of the V2 app: edit universes, outputs, fixtures and patches of any venue, flash a fixture on the real rig, and have every saved edit to the venue in use (outputs included) reach the lights without a restart.

**Architecture:** A pure draft model and the screen's parts live in the design system (`packages/ds/src/venue`, a new `BlockMap` primitive), fed in the browser by the TypeScript rules of `@ptah-app/model-tools` for instant feedback; `apps/web` wires them to the API. The server gains a revision check, delete and patch-propose routes; the engine gains an `identify` command (render path, `ptah-vm` + `ptah-engine`) and reconciles its output workers on every load.

**Tech Stack:** Rust 1.93 (axum, the existing triple-buffer publisher and output workers), React 19 + the ds (Base UI, CSS modules, tokens), Vitest, Storybook gates, Playwright 1.59.1, Biome.

**Spec:** `docs/superpowers/specs/2026-11-16-v2-venue-screen-design.md` (V1 repo, commit 40378d3). Executors read it first; section numbers below (§) refer to it.

## Global Constraints

- Repo `~/projects/ptah-v2`, branch `venue-screen` from `master` (5870529 or later). V1 (`~/projects/ptah`) is never modified except this plan and the ledger.
- Never start V1 services or pm2; never touch `~/.ptah`; tests use temp roots and free ports (an owner `ptah` may be on 8420; Storybook servers on 6006–6008 stay up).
- No new outside dependency. `@ptah-app/model-tools` (in the repo) becomes a dependency of `@ptah-app/ds`. If an outside one becomes necessary: stop and ask the owner; it must be published ≥ 14 days earlier and pinned exactly.
- Biome only (`pnpm check && pnpm format`). Styling uses tokens only; no shadows but the focus ring; 44 px targets on a coarse pointer; nothing shifts at run time; calm when well, loud only when wrong.
- The render thread stays allocation- and lock-free (the existing alloc-guard tests must cover every new render-path branch).
- Leave the untracked `docs/design/brief/` and `.ignore` alone; stage by explicit path only (`git add <paths>`, never `-A`). No outward pushes.
- Only these `model-tools` modules may reach a browser bundle: `lint/venue`, `lint/ids`, `lint/show`, `patch/*`, `health`, `capabilities`, `types`, `issue`. Never `schemas.ts` or `validateTree.ts`.
- Exact copy (§4, §5): `in use`; `Save the rig to patch it`; `Apply to the running show?` with `Save and apply` / `Cancel`; Flash reasons `load a show on this venue`, `save first`, `Reaper is running`; `Type missing? Types are added in the next version.`; `saved, not applied: <reason>`; `Editing needs a wider screen`; counts `1 overlap` / `n overlaps`, `1 error` / `n errors`; conflict `This venue changed on disk` with `Reload` / `Overwrite`; patch actions `Propose`, `Save patch`, `Revert`; `Patch another show…`; `Add fixtures`.
- Exact values: block map 8 rows × 64 channels; editing width 900 px (below it the phone list); identify hold 2 s (`IDENTIFY_HOLD_NS = 2_000_000_000`), the page repeats every 500 ms; engine refusals `no show`, `unknown fixture`, `clock running`, `stale epoch`; new venue = one universe `Main`, number 1, output `none`; duplicate name `<name> copy`.
- Gates: focused tests while iterating; once per task the full set for the side touched: Rust `cargo fmt --all --check && cargo clippy --all-targets -- -D warnings && cargo test --all` (serial); ds `pnpm -F @ptah-app/ds build && pnpm -F @ptah-app/ds test && pnpm -F @ptah-app/ds typecheck && pnpm -F @ptah-app/ds test:storybook && pnpm -F @ptah-app/ds test:visual`; web `pnpm -F @ptah-app/web test && pnpm -F @ptah-app/web typecheck`; always `pnpm check && pnpm format`. `pnpm allcheck` once, in Task 11.
- Conventional Commits with scopes (`feat(server)`, `feat(engine)`, `feat(vm)`, `feat(ds)`, `feat(web)`, `test(web)`, `docs`).

## Execution order

Two tracks with disjoint files run in parallel:
- **Rust:** Task 1 → Task 2 → Task 3 → Task 4 → Task 5 (1 and 2 may run together; 3, 4, 5 share `frame_loop.rs` / `loader.rs` and are sequential).
- **Web:** Task 6 and Task 7 together → Task 8 → Task 9 (9 replaces two placeholder files that 8 creates).
- Then Task 10 (needs 1, 2, 3, 8, 9) → Task 11 (needs all).

## Review Focus

1. **The venue file changed on disk between open and Save** (another tab, a hand edit, a patch saved from the Patch page): Save answers 409, the draft is kept, the page offers `Reload` / `Overwrite`. Tests in Task 1 (routes) and Task 10 (page).
2. **Flash held, then the tab closes or the phone loses Wi-Fi**: the light goes off by itself within 2 s. Test in Task 3 (expiry with no further command).
3. **Reaper starts, or the show is reloaded, while Flash is held**: the identify is released at that frame. Test in Task 3.
4. **The reload after a save is refused** (the edit left the playing patch with no resolvable fixture): the file stays saved, the old show keeps playing, the page shows `saved, not applied: <reason>` until the next successful save. Test in Task 10.
5. **An output is re-targeted to a device the old output still holds** (USB Pro serial changed to `any`, or two universes swapping targets): the old worker is closed before the new one opens, and a failed open faults that universe only. Test in Task 5.

Also pinned although the spec implies them less directly: a fixture whose type is missing from the library renders (fault mark, 0 channels, no block) and blocks Save (Task 7, Task 8).

---

### Task 1: Server routes: revision, delete, propose

**Files:**
- Modify: `crates/ptah-model/src/store/save.rs` (+ `store/mod.rs` export), `crates/ptah-server/src/http/files.rs`, `crates/ptah-server/src/http/mod.rs` (routes), `crates/ptah-server/src/http/error.rs` or wherever `ApiError` lives (a 409 constructor), `docs/api.md`
- Test: `crates/ptah-model/src/store/save.rs` (unit), `crates/ptah-server/tests/http.rs`

**Interfaces:**
- Produces (Rust):
  ```rust
  // ptah-model store
  /// 16 lowercase hex digits: FNV-1a 64 of the file's bytes.
  pub fn revision(bytes: &[u8]) -> String;
  /// Remove the document's file. Ok(false) when there was none.
  pub fn delete(layout: &Layout, doc: Doc<'_>) -> std::io::Result<bool>;
  ```
- Produces (HTTP, under `/api/v1`):
  - `GET /venues/{id}` adds the header `ETag: "<revision>"` (body unchanged).
  - `PUT /venues/{id}` and `PUT /venues/{id}/patches/{index}`: with `If-Match: "<revision>"`, a file whose current revision differs answers **409** `{ "error": "venue changed on disk", "revision": "<current>" }` and writes nothing. Without `If-Match` they behave as today. On success the body gains `"revision": "<new>"` beside `path` and `issues`. A PUT that creates (no file yet) ignores `If-Match`.
  - `DELETE /venues/{id}` → 200 `{ "ok": true }`; 404 unknown; **409** `{ "error": "venue in use" }` when `id` is the engine's venue (the venue of the current show info, or of the waiting start) or `settings.currentVenueId`.
  - `POST /venues/{id}/patches/propose` with `{ "showId": "<id>" }` → 200 the `Patch` JSON of `ptah_model::patch::propose_patch(show, programs, venue, types)` over the tree on disk; stores nothing; 404 unknown venue or show; 422 a body without `showId`.

- [ ] **Step 1: Write the failing tests.** In `save.rs`: `revision_is_fnv1a_64_hex` (`revision(b"") == "cbf29ce484222325"`, `revision(b"a") == "af63dc4c8601ec8c"`), `delete_removes_the_file_and_reports_absence`. In `tests/http.rs` (the `synthetic_store` / `TestServer` helpers exist):

```rust
#[test] fn a_venue_get_carries_its_revision_and_a_stale_put_is_refused()
// GET → ETag r1; PUT If-Match r1 with a renamed venue → 200, body.revision == r2 != r1, GET ETag == r2;
// PUT If-Match r1 again → 409, body.revision == r2, file unchanged; PUT without If-Match → 200.
#[test] fn a_patch_put_checks_and_returns_the_revision()
// PUT /patches/0 If-Match r_old (after a venue PUT) → 409; with the current one → 200 and a new revision.
#[test] fn a_new_venue_is_created_by_put_whatever_if_match_says()
#[test] fn delete_refuses_the_venue_in_use_and_removes_another()
// DELETE VENUE (settings.currentVenueId) → 409 "venue in use"; DELETE the other synthetic venue → 200; GET → 404; DELETE again → 404.
#[test] fn propose_answers_the_matcher_s_patch_and_stores_nothing()
// body == serde_json::to_value(propose_patch(..)) for the synthetic show and venue; the venue file's bytes are unchanged;
// unknown show → 404; body {} → 422.
```

- [ ] **Step 2: Run to verify they fail** — `cargo test -p ptah-model revision && cargo test -p ptah-server --test http venue`. Expected: FAIL (missing functions and routes).
- [ ] **Step 3: Implement** `revision`, `delete`, the header handling in `put_doc`/`put_patch` (read the file's bytes once, compare, save, hash the written bytes), the two routes. The revision check and the write happen inside the same `blocking` closure.
- [ ] **Step 4: Document** the four behaviours in `docs/api.md` (files section).
- [ ] **Step 5: Run the Rust gates.** Expected: PASS.
- [ ] **Step 6: Commit** — `feat(server): venue revision check, delete and patch proposal routes`.

---

### Task 2: `running` on the clock topic

**Files:**
- Modify: `crates/ptah-server/src/ws/topics.rs` (`clock`), `crates/ptah-server/tests/ws.rs`, `packages/ds/src/live/types.ts` (the clock data type), `packages/ds/src/live/replay.ts` and the synthetic recording if they build clock data, `docs/api.md`
- Test: `crates/ptah-server/tests/ws.rs`, `packages/ds/src/live/live.test.tsx`

**Interfaces:**
- Produces: the `clock` topic's data is `{ clock, beat, runBeat, tempoBpm, running }`; `running` is the snapshot's `clock_running` (the beat advances on its own: locked with pulses, free-run, or internal and running; false when held, stopped or waiting). TypeScript: the ds clock data type gains `running: boolean`.

- [ ] **Step 1: Failing tests.** `ws.rs`: extend `every_topic_sends_a_snapshot_on_subscribe_then_deltas` so the clock keys are `["clock","beat","runBeat","tempoBpm","running"]`, and add `the_clock_topic_says_running_only_once_started` (a fresh show on the fake engine: `running == false`; after an `internalClock` command with `running: true`: `true`). ds: a `live.test.tsx` case that a clock message with `running: true` reaches `useStream("clock")`.
- [ ] **Step 2: Run** — `cargo test -p ptah-server --test ws clock && pnpm -F @ptah-app/ds test -- live`. Expected: FAIL.
- [ ] **Step 3: Implement**; existing Perform code that builds clock fixtures in tests gains `running` (derive `true` for `locked` / `free-run`).
- [ ] **Step 4: Run the Rust gates and the ds gates.** Expected: PASS, visual boards 0.000 %.
- [ ] **Step 5: Commit** — `feat(server): the clock topic says whether the beat is running`.

---

### Task 3: The `identify` command (Flash)

**Files:**
- Modify: `crates/ptah-vm/src/show/frame.rs` (`render_fixtures`), `crates/ptah-vm/src/show/load.rs` (venue-index table), the compiled show's public surface (`crates/ptah-vm/src/show/mod.rs`), `crates/ptah-engine/src/command.rs`, `crates/ptah-engine/src/frame_loop.rs`, `crates/ptah-engine/src/engine.rs` (`send` routing if needed), `crates/ptah-server/src/http/commands.rs` (only if the command needs listing), `docs/engine.md`, `docs/api.md`
- Test: `crates/ptah-vm/tests/frame.rs`, `crates/ptah-engine/tests/frame_loop.rs`, `crates/ptah-engine/tests/perf.rs` (alloc guard)

**Interfaces:**
- Produces:
  ```rust
  // ptah-vm, on the compiled show
  /// The compiled fixture of `venue.fixtures[venue_index]`; None when it did not resolve.
  pub fn fixture_slot(&self, venue_index: u32) -> Option<u32>;   // a table built at compile time
  /// Light this compiled fixture at full on every frame until cleared.
  pub fn set_identify(&mut self, fixture: Option<u32>);
  // ptah-engine
  pub const IDENTIFY_HOLD_NS: Nanos = 2_000_000_000;
  // Command gains (wire: {"type":"identify","fixture":3,"on":true,"epoch":7}):
  Identify { fixture: u32 /* index in venue.fixtures */, on: bool, epoch: Option<u64> }
  ```
- Behaviour:
  - An identified fixture renders `Level`, `Red`, `Green`, `Blue`, `White`, `Amber`, `Uv` at 1.0 where its mode has them, after the overrides (so it wins over master and blackout); every other attribute and every other fixture is as without it.
  - `on: true` is refused, in this order: `stale epoch` (as `Trigger`), `no show`, `unknown fixture` (`fixture_slot` is None), `clock running` (the frame's clock snapshot is running). Accepted, it replaces any previous one and holds until `IDENTIFY_HOLD_NS` after the frame that took it; a repeated `on` for the same fixture renews the deadline.
  - `on: false` clears it if it is that fixture (always acked ok).
  - Cleared by the loop itself: at the deadline, on the first frame whose clock is running, on a show swap.
  - Not journalled; `JournalSnapshot` ignores it.

- [ ] **Step 1: Failing VM tests** in `tests/frame.rs` (the `venue(..)` helper exists):

```rust
#[test] fn identify_lights_one_fixture_at_full_and_leaves_the_others()
// two RGBW-dimmer fixtures, a scene writing level 0.2 on both: fixture 0's level and r,g,b,w bytes are 255, fixture 1's bytes equal the frame without identify.
#[test] fn identify_wins_over_blackout_and_master()      // blackout: true, master 0.1 → identified bytes still 255; the other fixture 0.
#[test] fn identify_touches_only_the_attributes_the_mode_has()  // a 1-channel dimmer: its one byte is 255; a mover's pan/tilt bytes are unchanged.
#[test] fn fixture_slot_follows_venue_order_and_skips_unresolved() // a venue whose 2nd fixture has an unknown type: slot(0)=Some(0), slot(1)=None, slot(2)=Some(1).
```

- [ ] **Step 2: Failing engine tests** in `tests/frame_loop.rs`:

```rust
#[test] fn identify_is_refused_without_a_show_for_an_unknown_fixture_and_while_running()
// acks: (ok false, "no show"); (false, "unknown fixture") for index 99; after internal clock running: (false, "clock running"); stale epoch first of all.
#[test] fn identify_expires_two_seconds_after_the_last_on()   // on at t0; frames at t0+1.9 s still full; a renew at t0+1.9 s holds to t0+3.9 s; with no renew the first frame at ≥ t0+2 s is back to the show's bytes.
#[test] fn identify_is_released_when_the_clock_starts_and_on_a_swap()
#[test] fn identify_off_clears_only_its_own_fixture()
```
and in `tests/perf.rs`: the alloc guard runs frames with an identify held, taken, expired and refused: 0 allocations.

- [ ] **Step 3: Run** — `cargo test -p ptah-vm --test frame identify && cargo test -p ptah-engine --test frame_loop identify`. Expected: FAIL.
- [ ] **Step 4: Implement.** The loop keeps `identify: Option<(u32 /*compiled slot*/, Nanos /*deadline*/)>`; resolution through `fixture_slot` on the render thread is a table lookup. `Identify` is a plain `Copy`-like payload, so it rides the render ring like `Trigger`.
- [ ] **Step 5: Docs** — the command in `docs/api.md` (commands table, refusal words) and `docs/engine.md` (render order: merge, overrides, identify).
- [ ] **Step 6: Run the Rust gates.** Expected: PASS.
- [ ] **Step 7: Commit** — `feat(engine): identify lights one fixture at full, refused while the clock runs`.

---

### Task 4: Output plan and a publisher that can be succeeded

**Files:**
- Create: `crates/ptah-engine/src/output_set.rs`
- Modify: `crates/ptah-engine/src/publish.rs`, `crates/ptah-engine/src/lib.rs` (exports)
- Test: unit tests in both files, `crates/ptah-engine/tests/output.rs`

**Interfaces:**
- Produces:
  ```rust
  // output_set.rs
  /// Builds the sink of a venue universe; None for `none` and for kinds with no sink yet (sACN).
  pub type SinkFactory = Arc<dyn Fn(&ptah_model::types::venue::Universe) -> Option<Box<dyn OutputSink>> + Send + Sync>;
  #[derive(Debug, Clone, PartialEq)]
  pub struct OutputSpec { pub number: u32, pub output: UniverseOutput, pub rate_hz: f64 } // rate: the default when absent or invalid
  pub fn output_specs(loaded: &Loaded, venue_id: &str) -> Vec<OutputSpec>;                // venue order
  #[derive(Debug, Default, PartialEq)]
  pub struct OutputPlan { pub keep: Vec<u32>, pub close: Vec<u32>, pub open: Vec<OutputSpec> }
  /// keep: same number, output and rate. A universe whose output or rate changed is in close and in open.
  /// A universe present in both with output `none` on both sides is kept.
  pub fn plan_outputs(current: &[OutputSpec], want: &[OutputSpec]) -> OutputPlan;
  /// The running workers, keyed by universe number. Lives off the render thread.
  pub struct OutputSet { /* workers, their specs and stats */ }
  impl OutputSet {
      pub fn specs(&self) -> Vec<OutputSpec>;
      /// Stop and join the workers of `numbers` (their sinks are closed when this returns).
      pub fn close(&mut self, numbers: &[u32]);
      /// Spawn a worker for `spec` on `reader` when the factory gives a sink; record the spec either way.
      pub fn open(&mut self, spec: OutputSpec, reader: OutputReader, factory: &SinkFactory, ctx: &OutputCtx);
      pub fn stats(&self) -> Vec<(u32, Arc<OutputStats>)>;
      pub fn stop_all(&mut self);
  }
  pub struct OutputCtx { /* telemetry reporter source, clock, OutputMode: what spawn_outputs takes today */ }
  // publish.rs
  impl UniversePublisher {
      /// On the render thread at a swap: for every universe number both publishers have, take `old`'s
      /// slot (so the readers already handed out for it stay live). Allocates nothing.
      pub fn adopt(&mut self, old: &mut UniversePublisher);
  }
  ```

- [ ] **Step 1: Failing tests.**

```rust
// output_set.rs
#[test] fn an_identical_venue_keeps_everything()            // plan == { keep: [1,2], close: [], open: [] }
#[test] fn a_retargeted_universe_is_closed_and_opened()     // artnet host changed on 2 → keep [1], close [2], open [spec 2']
#[test] fn a_rate_change_reopens()                           // 40 → 30 Hz on 1 → close [1], open [1']
#[test] fn added_and_removed_universes()                     // want adds 3, drops 2 → keep [1], close [2], open [3]
#[test] fn a_renumbered_universe_is_a_close_and_an_open()    // 1 → 5 with the same output
#[test] fn close_joins_the_worker_and_closes_its_sink()      // a fake sink records open/close; after close([1]) its `closed` flag is set and specs() no longer lists 1
// publish.rs
#[test] fn adopt_keeps_the_old_reader_live_for_shared_universes()
// old = new(&[1,2]) with readers r1,r2; next = new(&[2,3]); next.adopt(&mut old); next.publish(7, ..): r2 reads frame_index 7, next's own reader for 3 reads 7, r1 reads nothing new.
```
and in `tests/perf.rs` style (or the publish unit tests with the crate's alloc counter): `adopt` allocates nothing.

- [ ] **Step 2: Run** — `cargo test -p ptah-engine output_set && cargo test -p ptah-engine publish`. Expected: FAIL.
- [ ] **Step 3: Implement.** `adopt` swaps `Slot`s by universe number with `std::mem::swap`. `OutputSet::open` reuses `OutputWorker::spawn_paced` exactly as `spawn_outputs` does today (move that code; `engine.rs::spawn_outputs` becomes a loop over `OutputSet::open`, behaviour unchanged).
- [ ] **Step 4: Run the Rust gates.** Expected: PASS, every existing engine test green (start-up behaviour is unchanged).
- [ ] **Step 5: Commit** — `refactor(engine): an output set and a publisher that adopts kept universes`.

---

### Task 5: Outputs follow a reload

**Files:**
- Modify: `crates/ptah-engine/src/engine.rs` (`EngineConfig.sink_factory`, the shared `OutputSet`, `stop_all`), `crates/ptah-engine/src/loader.rs` (reconcile on `load`, the swap message, module docs lines 60–75), `crates/ptah-engine/src/frame_loop.rs` (take the publisher at the swap), `crates/ptah-engine/src/telemetry/mod.rs` (replace debug readers and output stats), `crates/ptah-engine/src/fakes.rs` (a recording sink factory), `crates/ptah/src/cmd/run.rs` (pass `sink` as the factory), `docs/engine.md`
- Test: `crates/ptah-engine/tests/output.rs`, `crates/ptah-engine/tests/engine.rs`, `crates/ptah-engine/tests/perf.rs`

**Interfaces:**
- Consumes: Task 4's `SinkFactory`, `OutputSpec`, `output_specs`, `plan_outputs`, `OutputSet`, `UniversePublisher::adopt`.
- Produces:
  ```rust
  // EngineConfig gains (None: today's behaviour, fixed sinks from `sinks`, a reload only re-maps slots):
  pub sink_factory: Option<SinkFactory>,
  // fakes
  pub struct FakeSinks; // FakeSinks::new() -> (SinkFactory, FakeSinksLog)
  impl FakeSinksLog { pub fn opened(&self) -> Vec<String> /* sink identities, in order */; pub fn closed(&self) -> Vec<String>;
                      pub fn frames(&self, identity: &str) -> Vec<u64> /* frame indices sent */; pub fn fail_open(&self, identity: &str) }
  ```
- Behaviour on every `LoadShow` on the engine's venue, when a factory is set:
  1. `plan = plan_outputs(set.specs(), output_specs(loaded, venue))`. An empty `close` and `open` changes nothing (the load is exactly today's).
  2. Otherwise, off the render thread and in this order: `set.close(plan.close)`; build `UniversePublisher::new(all wanted numbers)`; `set.open` each `plan.open` spec on its fresh reader; drop the fresh output readers of kept universes; hand telemetry the fresh debug readers of opened universes and the new stats list (kept universes keep theirs).
  3. The swap message carries the new publisher and everything sized by the universe count, pre-sized. At the frame boundary the loop calls `new.adopt(&mut old)`, installs it, and returns the old one with the retired show (dropped off the render thread).
  4. A sink that fails to open is the worker's existing business (it retries every `REOPEN_INTERVAL` and raises its output fault); the load is acked ok and the other universes are untouched.
  5. A refused load (the show does not build) changes no output.
- The start-up path builds its sinks through the factory too when one is set.

- [ ] **Step 1: Failing tests** in `tests/output.rs` / `tests/engine.rs` (driven timer, fake factory, a temp tree copied from `fixtures/` with the venue edited between loads):

```rust
#[test] fn a_reload_with_the_same_venue_touches_no_output()
// log.opened().len() and log.closed().len() unchanged; frame indices on universe 1 are consecutive across the reload.
#[test] fn an_unchanged_universe_has_no_gap_when_another_one_changes()
// venue: u1 usbpro, u2 artnet A; edit u2 → artnet B; reload: frames(u1's identity) consecutive across the swap; A closed; B opened and receives frames with index > the swap frame.
#[test] fn an_added_universe_sends_and_a_removed_one_stops()
#[test] fn a_renumbered_universe_follows_its_number()
#[test] fn the_old_sink_is_closed_before_the_new_one_opens()   // Review Focus 5: usbpro serial "A" → None: log order is closed(A) before opened(any).
#[test] fn a_failed_open_faults_that_universe_only()            // fail_open(B): the load acks ok, the output fault for universe 2 is active, universe 1 keeps sending.
#[test] fn a_refused_load_changes_no_output()                   // the edited venue also breaks the patch: ack false, opened/closed unchanged.
#[test] fn without_a_factory_a_reload_only_re_maps()            // sink_factory None: today's behaviour.
```
and `tests/perf.rs`: frames across a swap that carries a new publisher allocate nothing on the render thread.

- [ ] **Step 2: Run** — `cargo test -p ptah-engine --test output reload && cargo test -p ptah-engine --test engine reload`. Expected: FAIL.
- [ ] **Step 3: Implement** as above. The `OutputSet` is shared between the loader thread and `EngineHandle` (`Arc<Mutex<_>>`; neither is the render thread). Update the loader's module docs: outputs are no longer "fixed at start"; a venue other than the engine's still answers `VENUE_CHANGE`.
- [ ] **Step 4: Wire `ptah run`**: `run.rs` passes `Arc::new(|u| sink(u.number, &u.output))` as the factory (and the fake-io path its fake). `cargo test -p ptah` stays green.
- [ ] **Step 5: Docs** — `docs/engine.md`: the reconcile steps and what is and is not gapless.
- [ ] **Step 6: Run the Rust gates.** Expected: PASS.
- [ ] **Step 7: Commit** — `feat(engine): outputs follow the venue on every load, kept universes without a gap`.

---

### Task 6: The `BlockMap` primitive

**Files:**
- Create: `packages/ds/src/primitives/BlockMap/{BlockMap.tsx,BlockMap.module.css,BlockMap.stories.tsx,BlockMap.test.tsx,layout.ts,index.ts}`
- Modify: `packages/ds/src/primitives/index.ts`; the visual boards list (as `UniverseGrid` is registered)

**Interfaces:**
- Produces:
  ```ts
  export const MAP_ROWS = 8; export const MAP_COLS = 64;
  export type MapBlock = { id: string; label: string; address: number /* 1..512 */; channels: number /* ≥ 0 */; detail?: string };
  export type BlockSegment = { id: string; row: number; col: number; span: number; first: boolean };
  /** A block's pieces, one per row it touches; channels past 512 are dropped; 0 channels gives none. */
  export function segmentsOf(block: MapBlock): BlockSegment[];
  /** 1-based channels used by more than one block. */
  export function overlapsOf(blocks: readonly MapBlock[]): Set<number>;
  /** The address a block lands on when dragged by `deltaChannels`, clamped so it ends at or before 512 and starts at ≥ 1. */
  export function movedAddress(block: MapBlock, deltaChannels: number): number;
  export type BlockMapProps = {
    universe: number; blocks: readonly MapBlock[]; selectedId?: string | null;
    onSelect?: (id: string) => void;
    /** Called once, on drop or on a key move; absent = read-only (no drag, no key move). */
    onMove?: (id: string, address: number) => void;
    label?: string;
  };
  export function BlockMap(props: BlockMapProps): JSX.Element;
  ```
- Behaviour (§4.2): always 8 rows, fixed height; the first segment of a block carries its label, clipped; a readout line of fixed height under the map shows `label · detail · <first>–<last>` for the hovered, focused or selected block and is blank (not removed) otherwise; overlapping channels are drawn in `--fault`; the selected block in `--accent`. Pointer drag moves a ghost in whole channels and calls `onMove` once on release; Left/Right move by 1, with Shift by the block's `channels`; blocks are in the tab order by address.

- [ ] **Step 1: Failing tests** (`BlockMap.test.tsx`):

```ts
test("a block wraps across rows", () => expect(segmentsOf({ id: "a", label: "A", address: 63, channels: 4 })).toEqual([
  { id: "a", row: 0, col: 62, span: 2, first: true }, { id: "a", row: 1, col: 0, span: 2, first: false }]));
test("channels past 512 are dropped and none gives no segment", ...) // address 511, channels 4 → one segment span 2; channels 0 → []
test("overlaps are the shared channels only", ...)                    // 17–20 and 19–22 → {19, 20}
test("a move clamps inside the universe", ...)                        // address 510, channels 4, +10 → 509; address 2, −10 → 1
test("arrow keys move by one and by the footprint", ...)              // onMove("a", 18) then with Shift onMove("a", 21) for a 4-channel block at 17
test("without onMove nothing is draggable and keys do nothing", ...)
test("the readout keeps its height when empty", ...)                  // the readout element exists with no text
```

- [ ] **Step 2: Run** — `pnpm -F @ptah-app/ds test -- BlockMap`. Expected: FAIL.
- [ ] **Step 3: Implement.** CSS grid of 64 columns; segments are positioned children. Tokens only.
- [ ] **Step 4: Stories and boards** — `Rig` (the 21-fixture rig of the mockup), `Overlap`, `Selected`, `Empty`, `ReadOnly`, `Stage`; a play that drags a block and asserts `noShift` on the map's box; register the boards and create their baselines with `pnpm -F @ptah-app/ds update:visual` (new boards only).
- [ ] **Step 5: Run the ds gates.** Expected: PASS.
- [ ] **Step 6: Commit** — `feat(ds): BlockMap, a universe as named draggable blocks`.

---

### Task 7: The venue draft model (pure)

**Files:**
- Create: `packages/ds/src/venue/model/{draft.ts,patch.ts,index.ts}`, `packages/ds/src/venue/model/__tests__/{draft.test.ts,patch.test.ts,roundtrip.test.ts}`
- Modify: `packages/ds/package.json` (`"@ptah-app/model-tools": "workspace:*"`), `packages/model-tools/package.json` (an `exports` map naming only the allowed modules, pointing at their `.ts` sources), `packages/ds/vite.config.ts` only if the bundle needs it

**Interfaces:**
- Consumes: from `@ptah-app/model-tools`: `lintVenue`, `proposePatch` is NOT used (the server proposes), `health`, and the types `Venue`, `Universe`, `VenueFixture`, `Patch`, `FixtureType`, `Show`, `Program`, `Issue`.
- Produces (`@ptah-app/ds/venue` re-exports them in Task 8):
  ```ts
  export type VenueDraft = { base: Venue; current: Venue; past: Venue[]; future: Venue[] };
  export type Types = ReadonlyMap<string, FixtureType>;
  export type VenueEdit =
    | { type: "renameVenue"; name: string }
    | { type: "addUniverse"; id: string }
    | { type: "setUniverse"; id: string; patch: Partial<Pick<Universe, "name" | "number" | "output" | "rateHz">> }
    | { type: "removeUniverse"; id: string }
    | { type: "setFixture"; id: string; patch: Partial<Pick<VenueFixture, "name" | "typeId" | "modeId" | "universeId" | "address">> }
    | { type: "addFixtures"; ids: string[]; typeId: string; modeId: string; universeId: string; address: number; name: string }
    | { type: "duplicateFixture"; id: string; newId: string }
    | { type: "removeFixture"; id: string };
  export function openDraft(venue: Venue): VenueDraft;
  /** The draft after `edit`; the same object when the edit is refused or changes nothing. */
  export function applyEdit(draft: VenueDraft, edit: VenueEdit, types: Types): VenueDraft;
  export function undo(d: VenueDraft): VenueDraft; export function redo(d: VenueDraft): VenueDraft;
  export function isDirty(d: VenueDraft): boolean;
  /** After a successful save: `saved` is the new base, history kept. */
  export function markSaved(d: VenueDraft): VenueDraft;
  export function channelsOf(f: VenueFixture, types: Types): number;            // 0 for an unknown type or mode
  export function usedChannels(venue: Venue, universeId: string, types: Types): number;
  /** The first address where `channels` consecutive free channels start, or null. */
  export function firstGap(venue: Venue, universeId: string, channels: number, types: Types): number | null;
  export function draftIssues(d: VenueDraft, types: Types): Issue[];             // lintVenue(d.current, types)
  export function blocksSave(issues: readonly Issue[]): boolean;                 // any level "error"
  export function faultCount(issues: readonly Issue[]): { overlaps: number; errors: number };
  /** Where a deleted fixture is used: one entry per patch slot. */
  export function usesOf(venue: Venue, fixtureId: string): { patchIndex: number; showId: string; groupId: string; slot: number }[];
  export function newVenue(id: string, universeId: string, name: string): Venue;
  export function duplicateVenue(venue: Venue, id: string): Venue;               // same universe, fixture ids and patches; name "<name> copy"
  // patch.ts
  export type PatchRow = { groupId: string; name: string; wanted: number;
    slots: ({ kind: "one"; fixtureId: string } | { kind: "tuple"; fixtureIds: string[] } | { kind: "empty" })[];
    issue: string | null; fallback: string | null };
  export function patchRows(show: Show, programs: ReadonlyMap<string, Program>, venue: Venue, patch: Patch, types: Types): PatchRow[];
  export function unusedFixtures(venue: Venue, patch: Patch): VenueFixture[];
  export function setSlot(patch: Patch, groupId: string, slot: number, fixtureId: string | null): Patch; // a tuple slot is returned unchanged
  /** The proposal's assignments, with the stored patch's non-`ignore` fallbacks kept for groups the proposal still has. */
  export function mergeProposal(stored: Patch | null, proposed: Patch): Patch;
  /** What Save patch writes: `computedAt = now` for an untouched proposal, removed after a hand edit; `health` removed. */
  export function patchForSave(patch: Patch, untouchedProposal: boolean, now: string): Patch;
  export function patchWarnings(rows: readonly PatchRow[]): number;              // rows with an empty slot or an issue
  ```
- Rules the tests pin (§4.2, §5): `setFixture` with a new `typeId` and no `modeId` takes that type's first mode; an address is refused outside 1..512 and when the footprint would pass 512; `removeUniverse` is refused while a fixture is on it; `removeFixture` empties its slots in every patch (a tuple slot loses that member; a tuple left with one member becomes a single; with none, empty); `duplicateFixture` lands on `firstGap` in the same universe (refused when there is none) with the name `<name> copy`; `addFixtures` names `"<name> 1".."<name> n"` at consecutive addresses and is refused when they would pass 512; `addUniverse` gives `{ name: "Universe <n>", number: <max+1>, output: { kind: "none" } }`; history: every accepted edit pushes `past` and clears `future`.

- [ ] **Step 1: Failing tests.** One test per rule above in `draft.test.ts`, with literal ids and the `fixtures/library/types` files loaded from disk in the test; in `patch.test.ts`: `patchRows` on `fixtures/venues/hilldale-physical.json` with its show (4/4 on its first group), an emptied slot giving `kind: "empty"` and a warning count of 1, `setSlot`, `mergeProposal` keeping a `map-channel` fallback and dropping one whose group is gone, `patchForSave` (three cases). In `roundtrip.test.ts`:

```ts
test.each(["hilldale-physical", "hilldale-v1", "synthetic-a", "synthetic-b"])(
  "%s: an edited address changes only that address", (name) => {
    const venue = readFixture(name); const d = applyEdit(openDraft(venue), { type: "setFixture", id: venue.fixtures[0].id, patch: { address: 500 } }, types);
    const expected = structuredClone(venue); expected.fixtures[0].address = 500;
    expect(d.current).toEqual(expected);                      // position, rotation, tags, park, responseMs, colorModel, notes, dawOffsetMs, patches untouched
    expect(Object.keys(d.current)).toEqual(Object.keys(venue)); // key order kept, for a clean diff
    expect(Object.keys(d.current.fixtures[0])).toEqual(Object.keys(venue.fixtures[0]));
  });
test("a fixture of an unknown type has 0 channels, is an error and blocks save", ...)
test("undo then redo returns the same venue; an edit after undo drops the future", ...)
```

- [ ] **Step 2: Run** — `pnpm -F @ptah-app/ds test -- venue/model`. Expected: FAIL.
- [ ] **Step 3: Implement.** Edits are structural copies of only the touched objects (so untouched fields and key order survive).
- [ ] **Step 4: Prove the bundle** — `pnpm -F @ptah-app/ds build && pnpm -F @ptah-app/ds typecheck`, then `grep -L "node:fs" packages/ds/dist/*.js` lists every chunk (no `node:` import reached the bundle). Expected: PASS.
- [ ] **Step 5: Run the ds gates and `pnpm -F @ptah-app/model-tools test`.** Expected: PASS.
- [ ] **Step 6: Commit** — `feat(ds): the venue draft model, with the file rules run in the browser`.

---

### Task 8: The Rig page in the design system

**Files:**
- Create: `packages/ds/src/venue/{index.ts,types.ts,Venue.tsx,Venue.module.css,VenueHeader.tsx,UniversesTable.tsx,FixturesTable.tsx,AddFixturesDialog.tsx,FlashButton.tsx,RigPage.tsx,Venue.stories.tsx}`, `packages/ds/src/venue/__tests__/rig.test.tsx`
- Modify: `packages/ds/package.json` (export `./venue`), `packages/ds/vite.config.ts` (entry `venue`), the visual boards list

**Interfaces:**
- Consumes: Task 6 `BlockMap`; Task 7's model; the ds `Table`, `Combobox`, `Select`, `NumberField`, `TextField`, `Dialog`, `Menu`, `Button`, `IconButton`, `Tabs`, `Tooltip`; `HoldButton` from `perform` is the model for `FlashButton` (do not import across; copy the hold mechanics into `FlashButton`, which fires `onHold(true)` on press and `onHold(false)` on release, cancel, blur and unmount).
- Produces (`types.ts`, exported from `@ptah-app/ds/venue`):
  ```ts
  export const EDIT_WIDTH = 900;
  export type FlashState = { enabled: true } | { enabled: false; reason: "load a show on this venue" | "save first" | "Reaper is running" };
  export type OutputWord = { word: string; fault: boolean };
  export type VenueModel = {
    draft: VenueDraft; types: FixtureType[]; issues: Issue[];
    venues: { id: string; name: string }[]; inUse: boolean; page: "rig" | "patch";
    groupsOf: ReadonlyMap<string, string[]>;            // fixture id → ["Back pars (HILLDALE)"]
    outputState: ReadonlyMap<string, OutputWord> | null; // universe id → state; null when not in use
    /** Per fixture id; a fixture not in the saved file is "save first". */
    flash: (fixtureId: string) => FlashState;
    notApplied: string | null; saving: boolean; selectedId: string | null;
    patch: PatchModel | null;                            // Task 9
  };
  export type VenueHandlers = {
    onEdit(edit: VenueEdit): void; onUndo(): void; onRedo(): void; onSave(): void;
    onSelect(fixtureId: string | null): void; onPage(page: "rig" | "patch"): void;
    onOpenVenue(id: string): void; onNewVenue(): void; onDuplicateVenue(): void; onDeleteVenue(): void;
    onFlash(fixtureId: string, on: boolean): void;
    patch: PatchHandlers;                                // Task 9
  };
  export function Venue(props: { m: VenueModel; on: VenueHandlers; width: number }): JSX.Element;
  ```
  Task 9 owns `PatchModel`, `PatchHandlers`, `PatchPage`, `VenuePhone`; this task declares them in `types.ts` exactly as Task 9's Interfaces block gives them and renders `<PatchPage>` / `<VenuePhone>` from `Venue.tsx` behind imports that Task 9 fills (this task ships them as one-line placeholders returning `null`, replaced by Task 9; the two tasks touch no other common file).
- Behaviour: §4.1 and §4.2 in full. Ids for new things come from `crypto.randomUUID()` inside the components that raise `addUniverse`, `addFixtures`, `duplicateFixture`. The fault count's box is always in the header (empty when zero). Save is disabled when `!isDirty` or `blocksSave(issues)` or `saving`; when blocked by errors its tooltip names the first error message. Deleting a fixture with `usesOf(...).length > 0` opens a confirm naming `show · group` per use. The universes table's target cell renders the fields of the chosen kind (§4.2); state shows `outputState` or nothing. Rows are sorted by universe number then address, re-sorted only on commit.

- [ ] **Step 1: Failing tests** (`rig.test.tsx`, Testing Library as the Perform tests do):

```ts
test("typing an address raises one setFixture on commit, not per key", ...)
test("changing the type picks its first mode", ...)                        // onEdit called with { typeId, modeId: first }
test("the fault count is empty when well and says '1 overlap' in fault colour", ...)
test("Save is disabled when clean, when saving, and when an error blocks it", ...)
test("deleting a patched fixture asks first and names the show and group", ...)
test("Add fixtures defaults to the first gap that fits them all", ...)     // 4 × 4 ch on the mockup rig → the expected address
test("removing a universe with fixtures is refused with the count", ...)
test("Flash is disabled with its reason as the tooltip", ...)              // each of the three reasons
test("holding Flash calls on then off, and off on unmount", ...)
test("selecting a block selects the row and the reverse", ...)
test("a fixture of an unknown type shows a fault mark and no block", ...)
test("below 900 px the phone list is rendered instead", ...)               // asserts the placeholder mount point, filled by Task 9
```

- [ ] **Step 2: Run** — `pnpm -F @ptah-app/ds test -- venue/__tests__/rig`. Expected: FAIL.
- [ ] **Step 3: Implement** the parts and `Venue`.
- [ ] **Step 4: Stories and boards** at 1280: `Well`, `Overlap`, `Error` (unknown type), `Unsaved`, `InUse` (output state, Flash enabled), `EmptyVenue`, `AddDialog`, `Stage`; plays asserting `noShift` while (a) typing an address into overlap, (b) the fault count appears, (c) dragging a block. New baselines for the new boards only.
- [ ] **Step 5: Run the ds gates.** Expected: PASS.
- [ ] **Step 6: Commit** — `feat(ds): the Venue screen's Rig page`.

---

### Task 9: The Patch page and the phone list

**Files:**
- Create/replace: `packages/ds/src/venue/{PatchPage.tsx,PatchPage.module.css,VenuePhone.tsx,VenuePhone.module.css,Patch.stories.tsx}`, `packages/ds/src/venue/__tests__/{patch.test.tsx,phone.test.tsx}`
- (Runs after Task 8: it replaces Task 8's two placeholder components and touches nothing else of Task 8's.)

**Interfaces:**
- Consumes: Task 7 `PatchRow`, `patchRows`, `unusedFixtures`, `patchWarnings`; Task 8's `VenueModel`, `VenueHandlers`, `FlashButton`.
- Produces:
  ```ts
  export type PatchChoice = { index: number; showId: string; showName: string; label: string }; // label: "HILLDALE" or "HILLDALE · 2"
  export type PatchModel = {
    choices: PatchChoice[]; otherShows: { id: string; name: string }[];   // shows with no patch here
    current: PatchChoice | null;
    rows: PatchRow[]; unused: { id: string; name: string }[];
    /** Fixtures offered in a slot picker: those meeting the group's needs first. */
    candidates: (groupId: string) => { id: string; name: string; fits: boolean }[];
    changedSlots: ReadonlySet<string>;                                       // "<groupId>:<slot>" differing from the stored patch
    dirty: boolean; rigDirty: boolean; saving: boolean; proposing: boolean;
  };
  export type PatchHandlers = {
    onChoose(index: number): void; onPatchShow(showId: string): void;
    onPropose(): void; onSetSlot(groupId: string, slot: number, fixtureId: string | null): void;
    onSavePatch(): void; onRevert(): void;
  };
  export function PatchPage(props: { m: VenueModel; on: VenueHandlers }): JSX.Element;
  export function VenuePhone(props: { m: VenueModel; on: VenueHandlers }): JSX.Element;
  ```
- Behaviour: §4.3 and §4.5. With `rigDirty`, the page shows `Save the rig to patch it` and `Propose`, `Save patch`, `Revert` and the slot pickers are disabled. A `tuple` slot is one chip listing its fixtures, not a picker. `ok` in dim text or the issue (and `fallback: <name>`) in `--warn`. The phone list: universes with their output, fixtures (name, address, type) each with a `FlashButton` at tap size, the current patch as text, the line `Editing needs a wider screen`, and no editing control.

- [ ] **Step 1: Failing tests.**

```ts
// patch.test.tsx
test("a full group reads 4/4 and ok; an empty slot is dashed and counted", ...)
test("picking a fixture in a slot raises onSetSlot; Empty raises it with null", ...)
test("candidates that do not fit are listed after the others and marked", ...)
test("with unsaved rig changes the actions are disabled and the line is shown", ...)
test("Save patch and Revert are enabled only when the patch is dirty", ...)
test("a tuple slot is shown and is not a picker", ...)
test("Patch another show… lists the shows without a patch and raises onPatchShow", ...)
// phone.test.tsx
test("the phone list has no input, select or drag handle", ...)
test("a phone row's Flash is at least 44 px and holds like the desktop one", ...)
```

- [ ] **Step 2: Run** — `pnpm -F @ptah-app/ds test -- venue/__tests__/patch venue/__tests__/phone`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Stories and boards**: `PatchWell`, `PatchUnfilled` (the Blinders case of the mockup), `PatchProposed` (changed slots marked), `PatchRigDirty`, `NoPatchYet`, `Phone` (390 wide), `PhoneStage`; `noShift` plays for proposing and for a slot change. New baselines for the new boards only.
- [ ] **Step 5: Run the ds gates.** Expected: PASS.
- [ ] **Step 6: Commit** — `feat(ds): the Venue screen's Patch page and phone list`.

---

### Task 10: The page in the app

**Files:**
- Create: `apps/web/src/venue/{VenuePage.tsx,useVenue.ts,usePatch.ts,flash.ts,save.ts}`, `apps/web/src/__tests__/venue.test.tsx`
- Modify: `apps/web/src/api/client.ts`, `apps/web/src/api/types.ts`, `apps/web/src/routes.ts` (`shipped` gains `venue`; a matcher for `/venue`, `/venue/<id>`, `/venue/<id>/patch`), `apps/web/src/App.tsx` (render `VenuePage`; the palette opens on Venue too), `docs/app.md`

**Interfaces:**
- Consumes: Tasks 1, 2, 3 (HTTP and wire), Tasks 7–9 (`Venue`, the model functions).
- Produces:
  ```ts
  // client.ts
  export async function getWithRevision<T>(path: string): Promise<{ data: T; revision: string | null }>; // reads ETag
  export async function putJson<T>(path: string, body: unknown, ifMatch?: string): Promise<T>;           // 409 → HttpError with .status 409 and .body
  export async function deleteJson<T>(path: string): Promise<T>;
  // save.ts — the save-and-apply flow, pure of React (unit-tested with a fake api)
  export type SaveOutcome =
    | { kind: "saved"; revision: string; issues: Issue[]; applied: "not in use" | "applied" }
    | { kind: "saved-not-applied"; revision: string; issues: Issue[]; reason: string }
    | { kind: "conflict"; revision: string }
    | { kind: "invalid"; issues: Issue[] };
  export async function saveVenue(api: Api, venue: Venue, revision: string | null,
    playing: { showId: string; venueId: string; patchIndex: number } | null): Promise<SaveOutcome>;
  export async function savePatch(api: Api, venueId: string, index: number, patch: Patch, revision: string,
    playing: { showId: string; venueId: string; patchIndex: number } | null): Promise<SaveOutcome>;
  // flash.ts
  /** Sends identify on, repeats it every 500 ms while held, sends off on release. Returns the stop function. */
  export function holdFlash(send: (on: boolean) => Promise<unknown>): () => void;
  ```
- Behaviour:
  - `/venue` resolves to the venue in use, else the last opened (remembered in `localStorage`, try/catch), else the first of `GET /venues`; no venue at all shows the ds `EmptyState` with `New venue`.
  - Opening reads the venue with its revision, the types list and each type used, the shows list, and (Patch page) the chosen show and its programs.
  - Save: `saveVenue`. It PUTs with `If-Match`; on 200, when `playing.venueId` is this venue, it posts `{ type: "loadShow", showId, venueId, patchIndex }` to `/commands` and waits for the ack: ok → `applied`; refused → `saved-not-applied` with the ack's message. Before calling it, when the venue is in use and the clock topic says `running`, the page opens the confirm `Apply to the running show?` (`Save and apply` / `Cancel`).
  - `conflict` shows `This venue changed on disk` with `Reload` (re-read, drop the draft after a confirm) and `Overwrite` (PUT again with the revision the 409 returned).
  - `saved-not-applied` sets `notApplied` (fault colour) until the next outcome of kind `saved`.
  - Patch page: `Propose` posts to the propose route and shows `mergeProposal(stored, proposed)`; `Save patch` sends `patchForSave(...)` through `savePatch` (reload only when it is the playing patch); a new patch for a show is saved at `index = patches.length`.
  - Flash: `flash(fixtureId)` is `save first` when the fixture is not in `draft.base`, `load a show on this venue` when not in use or no show is loaded, `Reaper is running` when the clock runs; otherwise enabled. `onFlash` sends `{ type: "identify", fixture: <index in draft.base.fixtures>, on, epoch: showInfo.showEpoch }` through `holdFlash`.
  - `outputState`: for the venue in use, from the metrics topic's `counters.outputs[]` and the faults topic (an active output fault for the universe → its code's word in fault colour; else `connected` when frames are being sent; nothing for output `none`).
  - Leaving with a dirty draft (shell navigation, venue switch, `beforeunload`) asks first.
  - New venue / Duplicate: build with `newVenue` / `duplicateVenue`, PUT, navigate to it. Delete: confirm naming the patches, DELETE, a 409 shows `venue in use`.
  - Palette on this page: `New venue`, `Duplicate venue`, `Add fixtures`, `Save`, `Propose patch`, `Go to Rig`, `Go to Patch`. Keys: `⌘S` Save, `⌘Z` / `⇧⌘Z` undo / redo (not while typing in a field with its own undo).

- [ ] **Step 1: Failing tests** (`venue.test.tsx`; `saveVenue`, `savePatch`, `holdFlash` against a fake `Api`, the page with `fetch` mocked as the Perform tests do):

```ts
test("a save of a venue not in use PUTs with If-Match and reloads nothing", ...)
test("a save of the venue in use reloads the playing show on the same patch", ...)       // one PUT then one loadShow with the same ids
test("a refused reload is 'saved-not-applied' with the engine's reason", ...)             // Review Focus 4
test("a 409 is a conflict carrying the current revision; Overwrite PUTs with it", ...)    // Review Focus 1
test("a 422 is 'invalid' with the server's issues", ...)
test("while the clock runs, Save asks first and Cancel sends nothing", ...)
test("the page shows 'saved, not applied: <reason>' until the next good save", ...)
test("holdFlash sends on, repeats every 500 ms, and sends off once on release", ...)      // fake timers: on at 0, 500, 1000; release → off; no more
test("Flash is 'save first' for a fixture added since the last save", ...)
test("Flash sends the fixture's index in the saved file and the show's epoch", ...)
test("leaving with unsaved changes asks; staying keeps the draft", ...)
test("/venue opens the venue in use; /venue/<id>/patch opens its Patch page", ...)
test("Propose shows the server's proposal and keeps hand-set fallbacks; Save patch writes it", ...)
```

- [ ] **Step 2: Run** — `pnpm -F @ptah-app/web test -- venue`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: `docs/app.md`** — the Venue page: routes, save-and-apply, conflict, Flash rules.
- [ ] **Step 5: Run the web gates** plus `pnpm -F @ptah-app/web build`. Expected: PASS.
- [ ] **Step 6: Commit** — `feat(web): the Venue page, wired to the API with save-and-apply and Flash`.

---

### Task 11: End to end, docs, the owner check

**Files:**
- Create: `apps/web/e2e/venue.spec.ts`, `docs/ledgers/venue-owner-check.md` (V2)
- Modify: `apps/web/e2e/engine.ts` (only if a helper is missing: a venue whose universe goes to Art-Net on a local UDP port the test listens on), `docs/design-system.md` (BlockMap, the venue entry), `docs/specs/master-plan.md` status line if it tracks screens

**Interfaces:**
- Consumes: everything. The e2e runs the real `ptah` binary on a temp root (as `perform.spec.ts`), with the fixture venue's universe pointed at Art-Net `127.0.0.1:<port A>` so the test reads real DMX frames from a UDP socket.

- [ ] **Step 1: Write the e2e tests.**

```ts
test("re-addressing a fixture reaches the lights without a restart", ...)
// load the show; trigger a program so fixture X's channels are non-zero at its address; in the Rig page type a new free address, Save;
// expect frames on port A to carry those values at the new address and zeros at the old one, the engine pid unchanged, and the bar still counting.
test("re-targeting the universe moves the frames without a restart", ...)
// change the Art-Net port to B in the universes table, Save: frames arrive on B, stop on A, same pid.
test("holding Flash lights the fixture and releasing returns it", ...)
// hold the row's Flash: the fixture's level and colour channels read 255 on the wire, the neighbours unchanged; release: back within 1 s.
test("Flash is refused while the clock runs and says why", ...)          // internalClock running → the button is disabled with 'Reaper is running'
test("a new venue can be created, patched by proposal and deleted", ...) // New venue → Add fixtures → Save → Patch another show… → Propose → Save patch → GET shows the patch; Delete removes it
test("the phone width shows the read-only list", ...)                     // viewport 390: no input on the page, the Flash buttons present
```

- [ ] **Step 2: Run** — `cargo build -p ptah && pnpm -F @ptah-app/web test:e2e -- venue`. Expected: PASS (fix what they find in the owning task's files; a product bug found here is fixed with its own failing unit test first).
- [ ] **Step 3: Write `docs/ledgers/venue-owner-check.md`**: the six exit checks of §8 as a list the owner ticks on the rig, each with the exact gesture and what to look for, plus the rebuild line (`pnpm -r build && cargo build --release -p ptah`) and the rig notes that matter (root `~/ptah-home`, the USB Pro).
- [ ] **Step 4: Docs** — `docs/design-system.md` (BlockMap; the `venue` entry and its stories).
- [ ] **Step 5: Run the whole gate** — `pnpm allcheck`. Expected: PASS.
- [ ] **Step 6: Commit** — `test(web): the Venue screen end to end against the real binary` and `docs: Venue screen owner check and design-system notes`.
