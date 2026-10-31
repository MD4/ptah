# V2 Step 1B — Evaluation (`ptah-vm`, `ptah-clock`, frame pipeline) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Rust program VM, the beat clock, the voice manager, the merge and render stages, and a pure frame pipeline that turns a show plus live state into DMX universes, proven against every Step 0 oracle (`v1-traces`, `v2-traces`, `v2-render`, `hilldale.v1-channel-map`) and against V1 end to end through the frame pipeline.

**Architecture:** Two new crates. `ptah-vm` is the hot path: programs compile to a flat op list over a preallocated slot buffer; `evaluate`, merge and render never allocate after `CompiledShow` is built; a counting allocator test enforces that. `ptah-clock` is a pure beat counter (PLL, hard-snap, transport, free-run, internal) fed with timestamps, no threads. Nothing in this plan opens a MIDI port or a socket; plan 1C owns threads and IO. Four carry-overs from 1A's final review open the plan because the VM is their first new caller.

**Tech Stack:** Rust 1.93.0 pinned (`rust-toolchain.toml`), `serde`/`serde_json`, `indexmap`, `thiserror`; dev: `tempfile`. TypeScript side (`packages/model-tools`, `tsx`, `vitest`) only for one new oracle (`import-cases.json`) and the additive model fields.

**Spec:** `docs/superpowers/specs/2026-10-26-v2-step1-engine-design.md` (V1 repo; copy `ptah-v2/docs/specs/step1-engine.md`) sections 3, 4.3, 4.4, 4.6, 5 (table rows on time, voices, cap), 5.1, 8, 11.1. Step 0 contract: `ptah-v2/docs/vm-instruction-set.md` (§1–§13, the binding text for every formula), `docs/specs/step0-domain-model.md` §3.7, §6. Previous plan and its ledger: `docs/superpowers/plans/2026-10-26-v2-step1a-foundation.md`, `ptah-v2/docs/ledgers/step1a-execution-ledger.md` (the "FINAL REVIEW" rulings name this plan's carry-overs).

## Global Constraints

- Repository `~/projects/ptah-v2`, branch `step1b-evaluation` off `master` (50f70d6 or later). Private repo.
- Toolchain pinned 1.93.0; gates `cargo fmt --all --check`, `cargo clippy --all-targets -- -D warnings` (pedantic on), `cargo test --all`, `pnpm allcheck` green before every commit is considered done. Conventional Commits with a crate or package scope.
- Numbers: f64 in the VM; `v1-traces` and `v2-traces` must match within **1e-9 absolute**, with `NaN == NaN` and equal infinities equal (`Object.is` semantics, compare via `to_bits()` for non-finite); `v2-render` bytes and the channel map **exactly**.
- JavaScript semantics for every math op (contract §4): `a % b` = Rust `%` on f64; `Math.round` = half up toward +∞ (`(x + 0.5).floor()`, not Rust `round`); `**` must reproduce JS `Math.pow` where it differs from `powf` (`pow(1, NaN) = NaN`, `pow(-1, ±∞) = NaN`, `pow(x, ±0) = 1`): implement `js_pow`; `x / 0 = ±∞`, `0 / 0 = NaN`, no guards anywhere.
- "No heap allocation in the render thread; no network or file IO in the render thread." In this plan: `evaluate`, `merge`, `render`, `render_frame` allocate nothing after `CompiledShow::new`; Task 13 enforces it with a counting allocator.
- Performance budget (spec §3): 512 instances × 20 nodes under 2 ms per frame on a Pi 4. Task 13 measures on the builder's machine and records the number; the Pi number is plan 1D's benchmark.
- Time comes from the clock, never from a tick count: `beat` from `ptah-clock`, `time = beat − voice start beat`, `dtSeconds` from the monotonic timestamps the caller passes.
- Schema changes are additive and keep `@1`; the TypeScript `model-tools` schemas, lints and the Rust types change together, and the Step 0 fixture regeneration scripts must leave existing fixtures byte-identical.
- `schemas/` and `packages/` are touched only by Tasks 3 and 4; `fixtures/` only by their regeneration.
- Every oracle test names the failing program, sample index, slot and the two values.

## Review Focus

Spec-implied inputs no task's tests would otherwise exercise, most likely to bite first; each has its pinning test added to the owning task:

1. A program whose parameter is driven to 0 under a `divide`: outputs follow V1 (`±∞`, `NaN`) through evaluate, and render turns them into 255 / 0 with `value.clamped` counted, never a panic or a poisoned slot buffer for later frames. → Tasks 6, 8, 13.
2. MIDI clock pulses that arrive in a burst (five pulses within 1 ms after a 60 ms gap, as USB MIDI does under load): the PLL beat stays monotonic and never jumps backwards; frames rendered during the gap kept advancing. → Task 11.
3. A note-off that arrives before its note-on (reordered or lost note-on): no voice is created, nothing panics, the stop is counted as unmatched. → Task 12.
4. Two instances writing the same fixture attribute, one `legacy` and one default merge, where the legacy one stops: the attribute falls back to the default writer's value, not to 0 and not to the legacy voice's last value. → Task 10.
5. A show with 512 instances × 16 voices on a 4-universe venue: `CompiledShow::new` succeeds, buffer sizes are bounded by the polyphony cap, and a 513th simultaneous voice on one instance steals the oldest voice with a counted fault rather than growing a buffer. → Tasks 12, 13.

---

## File structure

```
ptah-v2/
  Cargo.toml                          members += crates/ptah-vm, crates/ptah-clock
  crates/ptah-model/src/
    index.rs                          Task 1: Index<'a, T> borrowed id index
    issue.rs                          Task 2: Issue::error / Issue::warning
    types/program.rs                  Task 2: Display/tag for NodeType, OutputType, PortType; Task 4: nothing
    types/{show,settings,venue}.rs    Task 4: additive fields
    lint/show.rs                      Task 4: missing-scene for fallbackSceneId
  crates/ptah-vm/
    Cargo.toml                        deps: ptah-model, serde, serde_json, thiserror
    src/lib.rs
    src/jsmath.rs                     js_round, js_pow, js_mod, hsv_to_rgb, ease_out_quint(_invert), envelope, distortion, luma
    src/ops.rs                        Op, OpCode, Compiled, CompiledOutput, GATE_SLOT, LFO consts, RANDOM_ZERO_SEED
    src/compile.rs                    compile_program(&Program, &Index<Program>) -> Result<Compiled, CompileError>
    src/evaluate.rs                   Env, VoiceState, Member, Outputs, create_voice_state, evaluate, is_finished, member_env
    src/bindings.rs                   normalize_source, apply_curve, binding_value, slew, BindingState
    src/fallback.rs                   luma re-export, capability_scalar, fallback_writes
    src/scene.rs                      scene_writes(scene, instance, member, time, stop_time) -> writes with fades
    src/render.rs                     AttributeWrite, to_channel_value, to_channel_value16, render(...) -> bytes
    src/channel_map.rs                resolver (absolute channels), default_routing, channel_map, scene_channels
    src/merge.rs                      AttributeLayer, MergeBuffer, merge rules (legacy, priority, HTP/LTP), overrides
    src/voices.rs                     VoiceManager: triggers, distributions, onStop, polyphony cap, orphan cap, jump_to
    src/show.rs                       CompiledShow: everything resolved and preallocated; render_frame
    tests/support/mod.rs              fixtures_dir, read_json, load_show(name) -> (Show, Vec<Program>), load_venue, load_types, Index helpers
    tests/v1_traces.rs                Task 6
    tests/v2_traces.rs                Task 6
    tests/v2_render.rs                Task 8
    tests/channel_map.rs              Task 9
    tests/merge.rs                    Task 10
    tests/voices.rs                   Task 12
    tests/frame.rs                    Task 13 (incl. V1 cross-oracle and the counting allocator)
  crates/ptah-clock/
    Cargo.toml                        no deps beyond std
    src/lib.rs                        BeatClock, ClockMode, Transport events, Snapshot
    tests/clock.rs                    Task 11
  packages/model-tools/src/scripts/write-model-oracles.ts   Task 3: generateImportCases()
  fixtures/oracles/model/import-cases.json                   Task 3
  docs/rust-workspace.md              Tasks 1–4, 13, 14 updates; docs/vm-rust.md Task 14
```

---

### Task 1: Borrowed id index (`Index<'a, T>`) replaces `&HashMap<String, T>` and owned `Vec` lookups

**Files:**
- Create: `crates/ptah-model/src/index.rs`
- Modify: `lint/program.rs`, `lint/show.rs`, `lint/show_caps.rs`, `lint/venue.rs`, `health.rs`, `health_timeline.rs`, `patch/matching.rs`, `tree.rs`, `store/load.rs`, `import/v1.rs`, `import/collapse*.rs`, `crates/ptah/src/cmd/{check,import_v1,import_write}.rs`, every test that builds a `HashMap<String, Program|FixtureType>`
- Test: `crates/ptah-model/tests/index.rs` (create)

**Interfaces:**
- Produces `pub struct Index<'a, T> { map: HashMap<&'a str, &'a T> }` with `Index::new()`, `Index::from_iter(items: impl IntoIterator<Item = &'a T>)` (requires `T: HasId` with `fn id(&self) -> &str`; implement `HasId` for `Program`, `FixtureType`, `Venue`, `Show`, `Scene`, `Group`, `Instance`), `get(&self, id: &str) -> Option<&'a T>`, `contains(&self, id) -> bool`, `len()`, `iter()`, `ids()`. Later duplicates win (JS `Map` semantics the 1A ports relied on). `type Programs<'a> = Index<'a, Program>; type Types<'a> = Index<'a, FixtureType>;`.
- Every public function that took `&HashMap<String, Program>` / `&HashMap<String, FixtureType>` now takes `&Programs<'_>` / `&Types<'_>`; the six `#[allow(clippy::implicit_hasher)]` disappear; `LoadedShow` keeps `Vec<Program>` and gains `fn programs(&self) -> Programs<'_>`; `ImportV1Result`, `collapse` unchanged in shape; `import/v1.rs` stops cloning programs into a map.
- Behaviour identical: every oracle and CLI test from 1A passes unchanged except for construction of the index.

- [ ] **Step 1: Write the failing tests** in `tests/index.rs`: `from_iter` over the synthetic show's programs finds each by id and `len() == 7`; a duplicate id later in the iterator wins; `get` on a missing id is `None`.
- [ ] **Step 2: Run** `cargo test -p ptah-model --test index` → FAIL (no module).
- [ ] **Step 3: Implement** `index.rs`, then migrate every signature (compiler-driven); delete the `implicit_hasher` allows.
- [ ] **Step 4: Run** `cargo test --all` → all 1A tests pass; `cargo clippy` clean with zero `implicit_hasher` allows left (`grep -r implicit_hasher crates` is empty).
- [ ] **Step 5: Commit**: `refactor(ptah-model): borrowed Index<'a, T> replaces owned HashMap lookups`

---

### Task 2: `Issue` constructors and display tags

**Files:**
- Modify: `crates/ptah-model/src/issue.rs`, `types/program.rs`, `ports.rs`, `lint/{ids,program,venue,show,show_caps}.rs`, `tree.rs`, `store/load.rs`, `health.rs`, `health_timeline.rs`

**Interfaces:**
- `Issue::error(code: &str, path: impl Into<String>, message: impl Into<String>) -> Issue`, `Issue::warning(..)`; the seven local constructors are removed.
- `NodeType::tag(self) -> &'static str`, `OutputType::tag(self) -> &'static str`, `PortType::tag(self) -> &'static str` (the serde names; `const fn`), with `impl Display` delegating to `tag`; the `serde_json` round-trip helpers (`health.rs::tag`, `show.rs::kind_tag`) and the `{:?}` in port messages are replaced, so messages read `out.color`/`number`, never `OutColor`/`Number`.

- [ ] **Step 1: Write the failing tests**: in `types/program.rs` tests, `NodeType::ALL.iter().all(|t| serde_json::to_value(t).unwrap() == t.tag())` and the same for `OutputType`; in `lint/program.rs` tests, the `port-type-mismatch` message for an `out.color` port contains `"out.color"` and `"number"`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** `cargo test --all` → PASS; `grep -rn "fn warn\|fn issue(\|fn error(" crates/ptah-model/src` shows only `issue.rs`. **Step 5: Commit**: `refactor(ptah-model): Issue constructors and serde-tag display for node and port types`

---

### Task 3: `import-cases.json` oracle for importer report strings

**Files:**
- Modify: `packages/model-tools/src/scripts/write-model-oracles.ts`, `src/__tests__/model-oracles.test.ts`, `README.md` (oracle list), `docs/vm-instruction-set.md` §9 paragraph
- Create: `fixtures/oracles/model/import-cases.json`
- Test: `crates/ptah-model/tests/oracles.rs` (extend: `import_cases_match_oracle`)

**Interfaces:**
- Oracle shape `{ cases: [{ name, input: { settings, show, programs: [{ fileName, ...V1Program }] }, result: { settings, venue, show, programs, report } }] }`, one case per hand-built input of `import-v1.test.ts` ("drops the back edge of a cycle", "drops patch entries for unknown fixtures", "imports every cc parameter with smoothingMs 0", "drops edges into ports V2 does not have", "drops a sourceOutput > 0", "reports input-controls sharing a controlId", "returns settings with the V1 virtual port", "collapsible is true iff…", "routes a channel patch entry with a capability override", "leaves colorModel unset…", "widens the range…", "reports fixtures with an unknown profile", "reports edges whose source or target node is missing", "skips patch entries whose outputKind…", "skips patch entries the fixture profile cannot resolve", "skips mappings whose program name has no file", "keeps only the last edge on an input", "scopes group, instance and mapping ids", the two duplicate-name cases). The test file's builders move into an exported `src/__tests__/v1-cases.ts` (or a non-test module) so the generator and the vitest share them.
- The generator asserts every `ImportReport` list key (`brokenCycles`, `unknownNodes`, `droppedPatchEntries`, `droppedMappings`, `droppedFixtures`, `droppedEdges`, `widenedParameters`, `conflictingDefaults`, `duplicateProgramNames`) is non-empty in at least one case.

- [ ] **Step 1: Write the failing drift-guard `it`** for the new file and the Rust `import_cases_match_oracle` (deserialize `input` into `ImportV1Input`, run `import_v1`, compare `result` via `canonical`, name the case).
- [ ] **Step 2: Run** both → FAIL. **Step 3: Implement** the generator and regenerate (`pnpm --filter @ptah-app/model-tools oracles:model`); confirm `git status` shows only the new file under `fixtures/`.
- [ ] **Step 4: Run** `pnpm allcheck` → green. **Step 5: Commit**: `test(model-tools): import-cases oracle gating every importer report field`

---

### Task 4: Additive model fields the Step 1 design needs (spec §8)

**Files:**
- Modify: `schemas/show.schema.json`, `schemas/settings.schema.json`, `packages/model-tools/src/types.ts`, `lint/show.ts`, `lint/settings.ts`, `docs/schemas.md`, `docs/specs/step0-domain-model.md` (§3.4, §3.11 one line each), `crates/ptah-model/src/types/{show,settings}.rs`, `lint/show.rs`, `lint/settings.rs`; regenerate oracles and fixtures (unchanged bytes expected except `lint-cases.json` gaining the new cases)
- Test: TS `show.test.ts`, `settings.test.ts`; Rust `tests/oracles.rs` (lint-cases counts), `tests/fixtures_roundtrip.rs`

**Interfaces (all optional, defaults applied by consumers, never written back):**
- `show.tempoBpm?: number` (exclusiveMinimum 0; engine default 120), `show.fallbackSceneId?: uuid` (lint `missing-scene` at `/fallbackSceneId` when unknown), `instance.heldVoiceCapBeats?: number | "unlimited"` (number minimum 0).
- `settings.quietAfterSeconds?` (default 120), `resumeWithinSeconds?` (60), `recorderMinutes?` (10), `debugRateHz?` (20), `polyphonyPerInstance?` (integer ≥ 1, default 16), `heldVoiceCapBeats?` (16), `realtimePriority?: boolean` (true), `osc?: { port: integer 1..65535 }`, `audio?: { device?: string, levelRangeDb?: number > 0 }`.
- Venue outputs already carry `serial` (usbpro) and `host/net/subnet/universe` (artnet): no change; note it in the report.
- Lint-cases gains `show: missing-scene (fallbackSceneId)`; `LINT_CASE_COUNTS` in Rust becomes show 16, total 39.

- [ ] **Step 1: Write the failing tests**: TS `show.test.ts` "flags an unknown fallbackSceneId" and a settings test that the new fields validate with the documented ranges; Rust round-trip of a show file carrying every new field, and the new lint case through the harness.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** on both sides; regenerate `oracles:model`, `write-hilldale-import.ts --collapse`, `write-v2-traces.ts`; `git diff --stat fixtures/` must show only `lint-cases.json`.
- [ ] **Step 4: Run** `pnpm allcheck` → green. **Step 5: Commit**: `feat(model): additive Step 1 fields (tempoBpm, fallbackSceneId, heldVoiceCapBeats, engine settings)`

---

### Task 5: `ptah-vm` crate, JS math helpers and the compiler

**Files:**
- Create: `crates/ptah-vm/Cargo.toml`, `src/lib.rs`, `src/jsmath.rs`, `src/ops.rs`, `src/compile.rs`, `tests/support/mod.rs`, `tests/compile.rs`
- Modify: root `Cargo.toml` members, `docs/rust-workspace.md` crate map

**Interfaces:**
- `jsmath`: `js_round(f64) -> f64`, `js_pow(f64, f64) -> f64`, `js_mod(f64, f64) -> f64`, `hsv_to_rgb(h, s, v) -> (f64, f64, f64)` (contract §4 Outputs), `ease_out_quint`, `ease_out_quint_invert`, `envelope(t, a, d, s, r) -> f64` (V1 `adsr`, reciprocal multiply as written), `distortion(time, value, drive, tone, level) -> f64`, `luma(r, g, b) -> f64`.
- `ops`: `pub type OpCode = NodeType; pub struct Op { op: OpCode, inputs: SmallVec-free fixed array or Vec<u32> built at compile time, out: u32, k: Option<f64> }`, `CompiledOutput { kind: OutputType, slot: u32, value_slots: [u32; 3], arity: u8 }`, `Compiled { ops: Vec<Op>, slots: u32, param_slots: Vec<(String, u32)>, outputs: Vec<CompiledOutput>, stateful: StatefulIndex }` where `StatefulIndex` precomputes, per op index, which state array (z1, smooth, random, adsr) it uses so `evaluate` never hashes; `GATE_SLOT = 0`, `LFO_HZ = 4`, `RANDOM_ZERO_SEED = 2463534242`.
- `compile_program(p: &Program, programs: &Programs<'_>) -> Result<Compiled, CompileError>` with `CompileError { MissingNode, MissingPort, UnknownParameter, UnknownSubgraph, RecursiveSubgraph, Cycle(Vec<String>) }`; the exact slot layout, op order, constant dedup (`-0`/`+0` distinct by `to_bits`), unwired-port defaults, duplicate-edge last-wins, `adsr.gate` → slot 0, subgraph inlining, and `outputs` sort/last-wins rules of contract §2, reusing `ptah_model::lint::program::topo_order` and `ports()`.

- [ ] **Step 1: Write the failing tests** in `tests/compile.rs`: every program under `fixtures/shows/*/programs/` compiles (`Ok`); the synthetic `subgraph` program compiles with the child's constants inlined (slot count equals the TS value — read it once by running `compileProgram` through `tsx` and pin the number in the test); a two-math cycle → `Err(Cycle)`; a self-referencing subgraph → `Err(RecursiveSubgraph)`; `-0` and `+0` constants get distinct slots; an overridden duplicate edge is not a dependency (same inputs as `vm.test.ts` "an overridden duplicate edge is not a dependency"); `jsmath` unit tests: `js_round(-2.5) == -2`, `js_round(2.5) == 3`, `js_pow(1.0, NAN).is_nan()`, `js_pow(-1.0, INFINITY).is_nan()`, `js_pow(NAN, 0.0) == 1`, `js_mod(-5.5, 2.0) == -1.5`, `hsv_to_rgb` on the V1 table of `vm.test.ts` "matches V1 hsvToRgb".
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** by porting `vm/compile.ts` and `vm/ops.ts`; keep `Ctx` logic structure. **Step 4: Run** → PASS; clippy clean. **Step 5: Commit**: `feat(ptah-vm): JS math helpers and the program compiler`

---

### Task 6: Evaluator with V1 and V2 trace parity

**Files:**
- Create: `crates/ptah-vm/src/evaluate.rs`, `tests/v1_traces.rs`, `tests/v2_traces.rs`
- Modify: `src/lib.rs`

**Interfaces:**
- `pub struct Env<'a> { time: f64, beat: f64, tempo_bpm: f64, dt_seconds: f64, velocity: f64, member: Member { index: u32, count: u32 }, params: &'a [f64], gate: bool, voice_seed: u32 }`.
- `pub struct VoiceState { slots: Vec<f64>, z1: Vec<f64>, smooth: Vec<f64>, random: Vec<u32>, adsr: Vec<AdsrState>, seconds: f64 }` sized by `Compiled.stateful` (no maps); `create_voice_state(&Compiled) -> VoiceState` preloads constants; `reset(&mut self, &Compiled)` reuses the allocation (for voice recycling in Task 12).
- `pub struct Outputs { intensity: Vec<(u32, f64)>, color: Vec<(u32, [f64; 3])>, strobe, position: Vec<(u32, [f64; 2])>, beam: Vec<(u32, [f64; 3])>, channel: Vec<(u32, (u16, f64))> }` **preallocated to the compiled output count** and filled in place by `evaluate(&Compiled, &Env, &mut VoiceState, &mut Outputs)`; `is_finished(&Compiled, &VoiceState) -> bool`; `member_env(distribution, selected, group_size, index) -> Member` (contract §12).
- Every op of contract §4 with the exact formulas; `lfo` on `state.seconds` for hz; `random` xorshift32 with the seed mix; `z1` store-after-pass; `adsr` state machine as written.

- [ ] **Step 1: Write the failing tests**: `tests/v1_traces.rs` ports `vm.test.ts` "V1 trace parity" exactly as `docs/vm-instruction-set.md` §9 describes (import each V1 program through a one-note V1 show with `import_v1`, compile, `velocity = 100/127`, params from the CC map with widened defaults, `time = beat = k/24`, `gate = true`, member `(0,1)`, compare outputs and colors within 1e-9 with `Object.is` semantics for non-finite; 8 programs × 97 samples); `tests/v2_traces.rs` ports "V2-native golden traces" (`Env` as §9: `time = beat = k/44`, `tempo 120`, `dt 1/44`, `velocity 0.8`, param defaults, `gate = k < 60`, `voiceSeed 7`, two member runs, 88 samples, fresh `VoiceState` per run; `"NaN"`/`"Infinity"` strings in the oracle decode to the non-finite values); unit ports by name from `vm.test.ts`: "envelope (V1 fx-adsr) matches at sample points", "adsr attacks, decays, sustains, releases", "attack = 0 jumps to 1", "lfo shapes in beats and hz", "lfo in hz runs on accumulated seconds", "map, clamp, step, select", "smooth one-pole, z1 delays by one", "z1 closes a feedback loop", "random deterministic per seed and member in [0,1)", "member outputs index, normalized, count", "memberEnv all-distribution count", "subgraph inlines a program with parameters as inputs", "hsv out.color converts with V1 hsvToRgb"; Review Focus 1: a program dividing by a parameter driven to 0 yields `+∞` then `NaN` on `0/0`, and the next evaluation with a non-zero parameter is finite again (the slot buffer is not poisoned).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** by porting `vm/evaluate.ts` op by op; if a transcendental op differs from V8 by more than 1e-9 on a trace sample, do not loosen the tolerance: report the program, sample and both values as DONE_WITH_CONCERNS for a ruling.
- [ ] **Step 4: Run** → PASS (8 V1 traces, 7 V2 traces). **Step 5: Commit**: `feat(ptah-vm): evaluator with V1 and V2 trace parity`

---

### Task 7: Bindings, fallbacks and scene writes

**Files:**
- Create: `crates/ptah-vm/src/bindings.rs`, `src/fallback.rs`, `src/scene.rs`, `tests/bindings.rs`
- Modify: `src/lib.rs`

**Interfaces:**
- `bindings`: `normalize_source(&Source, raw: f64) -> f64`, `apply_curve(Curve, x) -> f64`, `binding_value(&Binding, &Parameter, raw) -> f64` (normalize, curve, invert, scale), `pub struct BindingState { value: f64, target: f64, last_changed: u64 /*event sequence*/ }`, `slew(state: &mut BindingState, dt_seconds, smoothing_ms: Option<f64>)` (one-pole `τ = ms/1000`, absent = 20 ms, `τ ≤ 0` jumps), "last changed wins" across several bindings on one parameter (contract §10).
- `fallback`: `capability_scalar(capability, &Writes) -> Option<f64>`, `fallback_writes(strategy, capability, &Writes, seconds) -> impl Iterator<Item = AttributeWrite>` per contract §13 (`intensity-flash` square at `rate × 20` Hz over `seconds`, `nearest-color` luma, `map-channel(i)` raw).
- `scene`: `scene_writes(scene: &Scene, instance: &Instance, member: Option<u32>, time: f64, stop_time: Option<f64>, out: &mut Vec<(position, AttributeWrite)>)` per contract §11: entry coverage rules, `fadeInBeats` linear from 0/black for `level`, `rate` and color components, other attributes snap, fade-out mirror until `f = 0`, partial scenes.
- `AttributeWrite { attribute: Attribute, value: f64 }` with `Attribute` an enum (`Level, R, G, B, W, A, Uv, Rate, Pan, Tilt, Zoom, Focus, Iris, Channel(u16)`) and `Attribute::name()` matching the contract's strings.

- [ ] **Step 1: Write the failing tests**: port `step1-contract.test.ts` by name ("normalizes each source kind to 0..1" with the §10 table, "applies log, exp and invert", "scales into the parameter range (imported cc)", "slews with a one-pole of tau = smoothingMs/1000", "ignore writes nothing", "intensity-flash squares at rate x 20 Hz", "nearest-color writes luma", "map-channel writes the capability's scalar"); scene tests from §11 numbers: `fadeInBeats = 2`, `time = 0.5` → level `0.25 × value`, color components `0.25 ×`, pan snaps; stop at `time = 3` with `fadeOutBeats = 1` → at `time = 3.5` `f = 0.5`, at `4` the voice ends by `onStop`; a `per-member` instance only gets the triggered member's entries; last-changed-wins across two bindings.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** (`bindings.ts`, `fallback.ts` ports; `scene.rs` from §11). **Step 4: Run** → PASS. **Step 5: Commit**: `feat(ptah-vm): bindings, fallbacks and scene writes per the Step 1 contract`

---

### Task 8: Render

**Files:**
- Create: `crates/ptah-vm/src/render.rs`, `tests/v2_render.rs`
- Modify: `src/lib.rs`

**Interfaces:**
- `to_channel_value(f64) -> u8`, `to_channel_value16(f64) -> u16` (contract §7 steps 2–3, with the V1 `+∞ → 255` rule), `pub struct RenderCtx<'a> { mode: &'a Mode, fixture: &'a VenueFixture }` precomputing per channel: role attribute, `fine_of`, invert, default byte, park lookups; `render(ctx: &RenderCtx, writes: &[AttributeWrite], out: &mut [u8]) -> RenderStats { clamped: u32 }` writing `mode.channel_count` bytes in place, implementing the full §7 order (last write wins, colour model subtractive-white / rgb-only, virtual intensity incl. level-only → park colour or white, 8/16-bit, invert, raw `channel<i>` last, CMY).

- [ ] **Step 1: Write the failing tests**: `tests/v2_render.rs` loads every `fixtures/oracles/v2-render/*.json` (`{ name, typeFile, modeId, fixture: {park?, colorModel?}, attrs, bytes }`) and asserts exact bytes; port by name from `vm.test.ts` "render": "16-bit pan, coarse byte first", "inverted dimmer", "virtual intensity on an rgb type", "park, else mode defaults", "V1 toChannelValue clamping", the four `colorModel` cases, the five "virtual intensity on level-only writes" cases, "park channel<i> holds a raw channel", "CMY channels take 1 − r/g/b after the color model", "channel<i> writes a raw channel"; Review Focus 1: `level = +∞` → 255 and `level = NaN` → 0 with `clamped` counted.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** by porting `vm/render.ts` with the precomputed `RenderCtx`. **Step 4: Run** → PASS, 6 render oracles exact. **Step 5: Commit**: `feat(ptah-vm): render with exact v2-render parity`

---

### Task 9: Channel map and absolute resolution

**Files:**
- Create: `crates/ptah-vm/src/channel_map.rs`, `tests/channel_map.rs`

**Interfaces:**
- `pub struct Resolver<'a>` built from `(&Venue, &Types)`: `fixture(id) -> Option<Resolved { universe_number, address, mode, fixture }>`, `absolute(fixture_id, channel_index) -> Option<AbsoluteChannel { universe: u16, channel: u16 }>`; `default_routing(&Program) -> Vec<Route>`; `channel_map(&Show, &Programs, &Venue, &Patch, &Types) -> IndexMap<String /*note*/, Vec<SlotChannels { slot: u32, channels: Vec<u16> }>>` with the exact semantics of `render/channelMap.ts` (per-member note → member `memberOffset` + index, routes relative, tuples, fallbacks contribute their target channel, merge of several mappings on one note); `scene_channels(..)` likewise.
- The resolver is what Task 13 uses to turn routes into `(fixture, attribute)` targets.

- [ ] **Step 1: Write the failing tests**: `channel_map` on `fixtures/shows/hilldale-literal` + `venues/hilldale-v1.json` patch 0 equals `fixtures/oracles/hilldale.v1-channel-map.json` exactly (all 22 notes; the oracle stores absolute 1-based channel numbers per slot); port by name from `channel-map.test.ts`: "routes out.intensity to all color channels of an rgb fixture", "merges their slots instead of keeping the last mapping", "sends every slot to the instance members when routing is absent", "scene notes reach their entries' channels".
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit**: `feat(ptah-vm): channel map with exact HILLDALE V1 parity`

---

### Task 10: Merge

**Files:**
- Create: `crates/ptah-vm/src/merge.rs`, `tests/merge.rs`

**Interfaces:**
- `pub struct Writer { voice: VoiceId, start_seq: u64 /*voice start order*/, priority: f64, mode: MergeMode, route_order: u16 }`; `pub struct MergeBuffer` preallocated for `(fixture count × attribute slots)` with per attribute a small fixed-capacity layer list (capacity = settings `polyphonyPerInstance` × instances per fixture, computed by Task 13; overflow steals the lowest-ranked writer and counts `merge.overflow`); `clear_frame()`, `write(fixture: u32, attr: Attribute, value: f64, &Writer)`, `release(voice)` (removes that voice's writes), `resolve(fixture, attr) -> Option<f64>` applying contract §6: legacy writers first in voice start order (a retrigger keeps its place, within a voice route order), then default writers by `priority`, HTP (`max`) for `level`/`rate`, LTP by **voice start time** for the rest; a released writer's value is gone and the attribute falls back to the remaining contributor, else `None` (park/default at render).
- `pub struct Overrides { master: f64, blackout: bool, house_lights: Option<SceneId>, freeze: bool }` and `apply_overrides(&Overrides, attr, value) -> f64` (master multiplies `level`; blackout forces `level = 0`; freeze is handled by the caller returning the previous frame; house lights handled in Task 13 as a scene writer with top priority).

- [ ] **Step 1: Write the failing tests** from §6: two legacy voices on one attribute → later start wins; retrigger of the earlier keeps its place (still loses); legacy voice then default voice → legacy applied first, default overrides (default writers resolve after legacy); two default voices equal priority on `level` → max; on `r` → the later-started wins; higher priority beats max; Review Focus 4: legacy + default on `level`, legacy stops → value is the default writer's, not 0; release of the last writer → `None`; overflow steals and counts.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit**: `feat(ptah-vm): HTP/LTP/legacy merge with overrides`

---

### Task 11: `ptah-clock` beat counter

**Files:**
- Create: `crates/ptah-clock/Cargo.toml`, `src/lib.rs`, `tests/clock.rs`
- Modify: root `Cargo.toml` members, `docs/rust-workspace.md`

**Interfaces:**
- `pub struct BeatClock` with `new(config: ClockConfig { mode: ClockMode::{Pll, HardSnap}, default_tempo_bpm: f64 /*show.tempoBpm or 120*/, loss_tolerance: fn of pulse interval = 2 × expected + 20 ms })`; inputs, each with a monotonic `Instant`/`u64` nanos timestamp: `pulse(at)`, `start(at)`, `continue_(at)`, `stop(at)`, `spp(at, sixteenths: u16)`, `set_internal(tempo_bpm, running: bool)`; query `snapshot(at) -> Snapshot { beat: f64, tempo_bpm: f64, state: ClockState::{Internal, Locked, FreeRun, Stopped}, locked_since: Option<..>, last_pulse: Option<..>, pulses_since_start: u64 }`.
- PLL: tempo estimate = exponential moving average over the last 8 pulse intervals; phase corrected toward `pulse_count / 24` by a proportional term (gain 0.5 per pulse, documented) so the beat never steps backwards: if the corrected beat would be behind the extrapolated one, hold tempo slightly lower until caught up (monotonic by construction). HardSnap: `beat = pulses / 24` at the last pulse, extrapolated at the estimated tempo between pulses (frames stay smooth; the contract says frames are rendered on the grid). Free-run: no pulse within tolerance → `FreeRun`, extrapolate at the last tempo; first pulse back re-locks without a backward step. `Start` → beat 0, pulse count 0; `Continue` → resume from the SPP position; `Stop` → `Stopped`, beat frozen, pulses ignored until Start/Continue; `spp` while stopped sets the beat; Internal mode advances at the set tempo and ignores pulses.
- Pure: no threads, no `Instant::now()` inside (the caller passes time), so tests are deterministic.

- [ ] **Step 1: Write the failing tests**: steady 120 bpm pulses (every 20.833 ms) for 10 s → `snapshot` between pulses has `|beat − ideal| < 1e-3` after lock and `tempo_bpm` within 0.01; tempo jump 120→140 followed within 12 pulses (error < 0.01 beat after); pulses stop for 500 ms → state `FreeRun`, beat kept advancing at 120; first pulse back → `Locked`, no backward step across the whole run (assert monotonic over 10 000 snapshots); Review Focus 2: a 60 ms gap then 5 pulses in 1 ms → monotonic, max per-frame beat delta < 2 × nominal; `HardSnap` → beat at a pulse equals `pulses/24` exactly; `spp(…, 64)` while stopped → beat 16; `stop` freezes; internal mode at 100 bpm advances 100/60 beats per second and ignores pulses; before any pulse the clock runs internally at `default_tempo_bpm`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** with the documented constants in a `const` block. **Step 4: Run** → PASS. **Step 5: Commit**: `feat(ptah-clock): PLL and hard-snap beat counter with transport and free-run`

---

### Task 12: Voice manager

**Files:**
- Create: `crates/ptah-vm/src/voices.rs`, `tests/voices.rs`

**Interfaces:**
- `pub struct VoiceManager` built from the compiled instances (Task 13 supplies `InstanceRt { compiled: &Compiled, distribution, selected_members: Vec<u32>, group_size: u32, trigger_mode, on_stop, polyphony: u32, held_cap_beats: Option<f64> }`), preallocating `polyphony` voices per instance each with `VoiceState` and per-member states; `pub struct Voice { instance: u32, member_states: ..., start_beat: f64, start_seq: u64, gate: bool, stop_beat: Option<f64>, velocity: f64, note: Option<(device, channel, note)>, orphan_risk: Option<f64 /*cap deadline beat*/>, seed: u32 }`.
- Events: `trigger_start(instance, member: Option<u32>, velocity, key, at_beat, seq) -> Option<VoiceId>` (gate/toggle/oneshot per contract §12; retrigger of a held key keeps the voice; distribution `all` one voice with n member states, `per-member` one voice for that member, `spread` one voice per selected member started together), `trigger_stop(instance, key, at_beat) -> StopOutcome::{Released, Reset, Held, Unmatched}`, `step(beat, dt_seconds, params: &dyn Fn(instance) -> &[f64]) -> impl Iterator<Item = (VoiceId, member, &Outputs)>` evaluating every live voice (`time = beat − start_beat`, `gate` per mode incl. oneshot `time < 1`), removing finished voices by `onStop` (`release`: until `is_finished`; `reset`: one zero frame then remove; `hold`: keep until another writer, so the voice stays until `release_held(instance)`); `steal` when `polyphony` is exceeded (oldest voice, counted); `mark_orphan_risk(filter, at_beat)` setting `orphan_risk = at_beat + cap` for voices matching a device/all (spec §5.1), auto-release at the deadline; `jump_to(beat)` recomputes nothing but drops voices whose release has elapsed (V1 behaviour, spec §4.6); `snapshot() -> Vec<VoiceSnapshot>` and `restore(&[VoiceSnapshot], now_beat)` for plan 1C's journal (fresh `VoiceState`, as contract §8 says for chased voices).
- Faults are returned as counters in a `VoiceStats { stolen, unmatched_stops, orphan_released }` struct, not logged.

- [ ] **Step 1: Write the failing tests** (small synthetic instances using the `pulse` and `chase` programs): gate start/stop → voice exists then releases after the adsr finishes (`release`), `reset` removes next frame with a zero write, `hold` keeps; toggle alternates on note-ons and ignores note-offs; oneshot gate off at `time ≥ 1` and ends without adsr; `spread` starts one voice per selected member with `member` env `(i, n)`; `per-member` uses group size as count; retrigger keeps `start_seq`; Review Focus 3: `trigger_stop` with no voice → `Unmatched`, no panic; Review Focus 5: 17th simultaneous voice on polyphony 16 steals the oldest and `stolen == 1`; orphan cap: `mark_orphan_risk` then stepping past `cap` beats releases the voice; `restore` recreates voices at the right `time`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit**: `feat(ptah-vm): voice manager with trigger modes, onStop, polyphony and orphan cap`

---

### Task 13: `CompiledShow` and `render_frame` (the pure frame pipeline)

**Files:**
- Create: `crates/ptah-vm/src/show.rs`, `tests/frame.rs`, `crates/ptah-vm/tests/support/alloc.rs` (counting allocator)
- Modify: `src/lib.rs`, `docs/rust-workspace.md`

**Interfaces:**
- `CompiledShow::new(show: &Show, programs: &Programs, venue: &Venue, patch: &Patch, types: &Types, settings: &Settings) -> Result<CompiledShow, Vec<Issue>>`: compiles every program instance (a failing compile disables that instance and yields a `program.faulted` issue, the rest loads: spec §5 table), resolves routes through the Task 9 resolver into per-instance `Target { fixture: u32, attribute: Attribute, via_fallback: Option<FallbackStrategy> }` lists, builds the `VoiceManager`, `MergeBuffer`, `RenderCtx` per fixture, universe byte buffers (`Vec<[u8; 512]>`), `BindingState` per (instance, parameter), scene writers (incl. `fallbackSceneId` and `houseLightsSceneId` as top-priority scene instances that the caller enables), and the `Outputs` scratch buffers. Everything sized here.
- `render_frame(&mut self, input: FrameInput { beat, dt_seconds, overrides, house_lights: bool, fallback_look: bool }, events: &[Event] /*already timestamped and sorted*/) -> &FrameOutput { universes: &[[u8; 512]], stats: FrameStats { clamped, stolen, unmatched_stops, merge_overflow, faulted_instances } }` doing: apply events (triggers, parameter source values through bindings with sequence numbers), slew bindings, `voices.step`, scene writes, fallbacks for missing capabilities, merge, overrides, render per fixture into the universe buffers; `freeze` returns the previous frame. **No allocation** after `new`.
- `Event` enum: `TriggerStart { instance, member, velocity, key, seq }`, `TriggerStop { instance, key, seq }`, `Source { source_key, raw, seq }`, `ParamConst { instance, param, value }`.

- [ ] **Step 1: Write the failing tests** in `tests/frame.rs`:
  - **V1 cross-oracle**: load `hilldale-literal` + `hilldale-v1` patch 0 + types; for each V1 program with a trace in `fixtures/oracles/v1-traces/` that is mapped to a note in the literal show (`flash`, `sine`, `distorded`, `red`, `strobe`, `P1`, `WI-red-CC1`, `test`), trigger that note at beat 0 with velocity 100, set CC sources `{0: 64, 1: 100, 2: 127, 3: 90}` (contract §9) and render frames at `beat = k/24, k = 0..96` with `dt = (60/120)/24`; for every channel the channel map gives for that note's slots, assert the byte equals `to_channel_value(trace output)` (intensity slots) or the colour bytes (`red`, `test`), honouring `rgb-only` for imported RGB fixtures and `legacy` merge. This is V1 parity through the whole pipeline on real show data, without V1's capture driver.
  - `fallback_look`: no voices and `fallback_look = true` → the `fallbackSceneId` scene bytes; with voices it is overridden by HTP/priority rules.
  - `master = 0.5` halves `level` bytes; `blackout` zeroes intensity; `freeze` repeats the previous frame while voices keep stepping.
  - Review Focus 1 end to end: a synthetic program dividing by a CC-bound parameter at 0 → 255 then 0 on the mapped channel, `stats.clamped > 0`, next frame with CC 64 finite.
  - Review Focus 5: build a generated show of 512 instances × 20-node programs on a 4-universe synthetic venue; `CompiledShow::new` succeeds; after one warm-up frame, `render_frame` with 16 voices on 64 instances performs **zero allocations** (counting allocator wrapped around `System`, enabled only in this test binary via `#[global_allocator]`, counting `alloc` calls between two markers) and the per-frame time is printed (`eprintln!`) and asserted under 20 ms on the builder's machine as a sanity bound (the 2 ms Pi 4 budget is measured in 1D).
  - a 513th voice on one instance steals and counts.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `show.rs`; if an allocation sneaks in from a dependency (`IndexMap` lookup with `String` keys, `format!` in a stats path), replace the structure, never the test. **Step 4: Run** → PASS. **Step 5: Commit**: `feat(ptah-vm): CompiledShow and allocation-free render_frame with V1 cross-oracle parity`

---

### Task 14: Documentation and the Step 1B contract for 1C

**Files:**
- Create: `ptah-v2/docs/vm-rust.md`
- Modify: `docs/rust-workspace.md`, `README.md`, `docs/vm-instruction-set.md` (one paragraph at the top pointing at the Rust implementation and the cross-oracle)

**Interfaces:** none new. `docs/vm-rust.md` documents, for plan 1C: the `CompiledShow` lifecycle (build off-thread, swap by pointer at a frame boundary), the `Event` contract with sequence numbers and timestamps, what `render_frame` needs per frame (`beat`, `dt_seconds` from the clock snapshot), the `BeatClock` input events and what the MIDI worker must call for each MIDI realtime message, the fault counters and where 1C turns them into faults, the zero-allocation rule and how the counting-allocator test guards it, and the open items 1C owns (partial `load_tree`, migration wiring on the load path, timeline source reading).

- [ ] **Step 1: Write** the document and the updates (the crate map now lists `ptah-vm`, `ptah-clock`; the gate commands unchanged; the oracle list gains `import-cases.json`).
- [ ] **Step 2: Verify** every command in the docs runs (`cargo test -p ptah-vm --test frame`, the oracle regeneration commands) and `pnpm allcheck` is green.
- [ ] **Step 3: Commit**: `docs: Step 1B VM and clock contract for the runtime plan`

---

## Self-review notes

- Spec coverage for 1B: §4.3 clock → Task 11; §4.4 voices/evaluation/bindings/merge/render/overrides → Tasks 5–10, 12, 13; §4.6 position chase on live state (`jump_to`) → Task 12; §5 table rows "program produces NaN", "program fails to compile", "voice stolen", orphan cap (§5.1) → Tasks 6/8/13, 13, 12, 12; §8 fields → Task 4; §11.1 oracles (`v1-traces`, `v2-traces`, `v2-render`, channel map) → Tasks 6, 8, 9; the 1A final-review carry-overs → Tasks 1–4. Not in 1B by design: threads, devices, OSC/audio capture, journal persistence, supervisor, API, TUI, `play-midi`, the V1 frame-capture replay and the Pi benchmark (1C, 1D).
- Type consistency: `Index`/`Programs`/`Types` (Task 1) used by 5, 9, 13; `Attribute`/`AttributeWrite` (Task 7) used by 8, 10, 13; `Compiled`/`Env`/`VoiceState`/`Outputs` (5, 6) by 12, 13; `Resolver` (9) by 13; `MergeBuffer`/`Overrides` (10) by 13; `BeatClock::Snapshot` consumed by 1C only; `VoiceManager` (12) by 13.
- Proportion: fourteen tasks, no function bodies, formulas referenced to the contract sections rather than restated.
- Known risk, recorded for the executor: V8 vs Rust libm last-ulp differences on `sin/cos/exp/pow` may exceed 1e-9 on a trace sample; the plan says report, not loosen, so the controller rules with the numbers in hand.
