# Builder Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A program is made and changed in PTAH V2: a node graph on a wide canvas with a live curve on every node, preview lights and a test panel driven by the engine's own evaluator in the browser, the draft playable on the real rig, and a save that never silently breaks a show.

**Architecture:** The engine's evaluator (`ptah-model` + `ptah-vm`) is built for the browser as WebAssembly behind one small crate, `ptah-web`, and reached from the page through one TypeScript interface, `Core` (catalogue, lint, evaluation). The canvas is React Flow; the screen's parts and pure draft model live in the design system (`packages/ds/src/builder`), `apps/web/src/builder` wires them. "On the rig" is a server-held preview: the server gives the engine the playing show with the draft program substituted, as a reload, under a lease.

**Tech Stack:** Rust 1.93 (+ target `wasm32-unknown-unknown`, no new crate), React 19 + the ds, `@xyflow/react` 12.12.0 (exact), Vitest, Storybook gates, Playwright 1.59.1, Biome, cargo-nextest 0.9.150.

**Spec:** `docs/superpowers/specs/2026-11-17-v2-builder-screen-design.md` (V1 repo, 5876bd0). Executors read it first; § numbers below refer to it.

## Global Constraints

- Repo `~/projects/ptah-v2`, branch `builder-screen` from `master` (9a5a624 or later). V1 (`~/projects/ptah`) is never modified except this plan and its spec.
- Never start V1 services or pm2; never touch `~/.ptah` or `~/ptah-home`; tests use temp roots and free ports; the owner's Storybook servers on 6006–6008 stay up; no outward pushes.
- Dependencies: exactly one new npm dependency, `@xyflow/react` at exactly `12.12.0` (approved by the owner), in `packages/ds`. No new crate: `Cargo.lock` gains no package. Anything else: stop and ask the owner (published ≥ 14 days earlier, pinned exactly).
- **One engine.** The page holds no node table, no lint and no evaluator of its own: everything of that kind comes through `Core` (Task 4). The TypeScript reference evaluator in `packages/model-tools/src/vm` is never imported by `packages/ds/src/builder` or `apps/web/src/builder` (a test in Task 14 asserts it).
- Biome only; tokens-only styling (React Flow's own stylesheet is not imported: its parts are styled with our tokens); no shadows but the focus ring; 44 px targets on a coarse pointer; nothing shifts at run time; calm when well, loud only when wrong; every action reachable by keyboard. A screen scrolls inside the shell's page area (root `height: 100%; overflow-y: auto; scrollbar-gutter: stable; position: relative`), never the window.
- Stage by explicit path only; leave the untracked `docs/design/brief/` and `.ignore` alone.
- Exact copy (§4): `← Programs`; `used by <n> rows`; `New program`; `Copy to…`; `Tidy`; `Fit`; `Hold`; `Loop`; `Plays like` with `while held` / `press on, press off` / `once` and `fade out` / `cut` / `keep`; preview modes `all together` / `one note per light` / `spread`; `On the rig`; reasons `load <show> first` / `no row uses this program` / `Reaper is running` / `fix the errors first`; `previewing without: <list>`; header mark `on the rig`; Perform mark `previewing`; save guard `Save anyway` / `Cancel`; conflict `This program changed on disk` with `Reload` / `Overwrite`; `Apply to the running show?` with `Save and apply` / `Cancel`; core missing: `preview unavailable`.
- Exact values: "On the rig" refresh 300 ms after the last edit; preview lease 5 s, renewed every 2 s; a hidden tab ends the preview after 5 s; preview lights 4 by default, 1 to 8; velocity 0–127; editing width 900 px; the wasm module at most 3 MiB uncompressed; one preview step for 8 lights at most 2 ms (median, in Node on the build machine).
- Conventions (owner): failing test first with the RED output in the report; Rust tasks run in pre-built worktrees (`mkdir -p target && cp -c -R <main>/target/debug target/debug`), two in parallel when their crates are disjoint; at most three agents at once; a UI task runs `node packages/ds/scripts/test-visual.mjs --only <its boards>` and Storybook for its own stories; **any task that touches a shared part (a component, a primitive, the shell, a token) runs the full visual gate**; full gates at the checkpoints (Task 7 for Rust: `cargo nextest run --workspace`; Task 13 for the ds; `pnpm allcheck` in Task 17).
- Conventional Commits with scopes (`feat(model)`, `feat(vm)`, `feat(core)`, `feat(server)`, `feat(engine)`, `feat(ds)`, `feat(web)`, `build`, `test(web)`, `docs`).

## Execution order

- **Task 1 first, alone: the trial. It ends with a written verdict** (§3). PASS → the plan runs as written. FAIL → the controller applies "Road 2" (below) to Tasks 4 and 14 and nothing else changes: every later task consumes only the TypeScript `Core` interface.
- **Core track (Rust):** 2 → 3 → 4. **Server track (Rust, second worktree):** 5 → 6 → 7. **Design system:** 8 → 9 → 10 → 11 → 12 → 13. One task per track at a time, reviews alongside, three agents at most.
- Then 14 (needs 4) → 15 (needs 5, 13, 14) → 16 (needs 7, 15) → 17.

**Road 2 (only if Task 1 fails).** Task 4 builds the same `Session` API natively in `ptah-server` instead of exporting it to wasm: `GET /core/catalogue`, `POST /core/lint`, `POST /core/outputs`, and a WebSocket `/core/session` that takes the same JSON messages and streams step results at 30 per second. Task 14's `Core` implementation speaks to those routes; its interface is unchanged. The wasm build step, the size limit and the source-hash test are dropped; the "preview equals engine" test compares the route's stream with a native run.

## File structure

```
crates/ptah-model/        feature `fs` (default): schema, store, tree, import, impact, unwind
  src/catalogue.rs        node catalogue (fields, ranges, defaults, ports)
  src/program_edit.rs     derive_outputs, program_impact, prune_for_program
crates/ptah-vm/           Compiled.node_slots; CompiledShow::probe
crates/ptah-web/          the browser core: session.rs (API), rig.rs (preview rig), abi.rs (exports)
scripts/build-core.mjs    builds the wasm module into apps/web/public/core/
crates/ptah-server/src/http/programs.rs   program routes (moved out of shows.rs) + preview lease
crates/ptah-engine/       loader: preview load; ShowInfo.preview
packages/ds/src/builder/model/   draft.ts graph.ts clipboard.ts tidy.ts search.ts place.ts
packages/ds/src/builder/         Canvas NodeBox Wire AddBox Inspector Dock (TestPanel PreviewLights RigPanel
                                 SettingsList) ProgramList BuilderHeader dialogs/ BuilderPhone + stories
apps/web/src/builder/     core.ts (Core + wasm loader) usePreview.ts BuilderPage.tsx ListPage.tsx
                          saveProgram.ts rig.ts
apps/web/e2e/builder.spec.ts
```

## State tables

**Canvas** (stories or unit cases in the task named)

| # | State | What happens | Task |
| --- | --- | --- | --- |
| C1 | Wire dragged from an output | accepting inputs marked, others dimmed | 10 |
| C2 | Dropped on a free input of the right type | wire added (one undo step) | 9, 10 |
| C3 | Dropped on a taken input | old wire replaced, same undo step | 9 |
| C4 | Dropped where it would close a loop / wrong type | refused, one line says why, nothing changes | 9, 10 |
| C5 | Dropped on empty canvas | add box opens filtered to nodes that accept the wire; choosing one adds and wires it | 11 |
| C6 | Typing on the focused canvas | add box at the pointer (or centre from the keyboard); Enter adds first match; Escape closes | 11 |
| C7 | One node selected | inspector filled, same place and size | 11 |
| C8 | Several selected | inspector shows the count and shared actions | 11 |
| C9 | Program does not compile | every curve `—`; the issue marked on its node or wire | 10, 15 |
| C10 | Unknown / subgraph / z1 node | drawn with type name and known ports; fields as text | 10 |
| C11 | Core not loaded | curves `—`, dock says `preview unavailable`; editing and Save work | 14, 15 |

**On the rig** (Task 16 unless noted; every row is a test)

| # | Event while on | Result |
| --- | --- | --- |
| R1 | Switch turned off | preview ended, saved show reloaded, mark gone |
| R2 | Page left / unmounted / show or program switched | as R1 |
| R3 | Tab hidden for 5 s | as R1; visible again → stays off |
| R4 | Tab closed, connection lost, page crashed | the lease runs out (5 s): the server ends it (Task 7) |
| R5 | Clock starts running | the server ends it at once (Task 7); the switch turns off with `Reaper is running` |
| R6 | Another show loaded, or a `loadShow` from any page | preview state cleared; the switch turns off |
| R7 | A second tab turns "On the rig" on for the same or another program | it takes over; the first tab's switch turns off with `another page took over` |
| R8 | Draft gains an error | no refresh is sent; the last good draft keeps playing; line `fix the errors first`; refresh resumes when clean |
| R9 | Draft would break the show | refresh sent; the line says `previewing without: …` |
| R10 | A refresh lands (new epoch) | sliders resent, held note resent, setting indexes re-read |
| R11 | Server restarts | engine comes back on the saved show; the switch turns off |

**Save** (Task 15)

| # | Case | Result |
| --- | --- | --- |
| S1 | Clean save, show not playing | written; issues replace the page's |
| S2 | Impact not empty | dialog lists rows and what each loses; `Save anyway` prunes and saves both files; `Cancel` nothing |
| S3 | Show playing, clock stopped | saved, then reloaded |
| S4 | Show playing, clock running | `Apply to the running show?` first |
| S5 | Reload refused | saved; fault notice with the engine's reason |
| S6 | 409 | `This program changed on disk`: `Reload` / `Overwrite` |
| S7 | Save while "On the rig" is on | preview ends first (R1), then S1–S5 |
| S8 | Request in flight | Save disabled; edits made meanwhile stay unsaved |

## Review Focus

1. **Programs with `unknown`, `subgraph` or `z1` nodes** (every imported HILLDALE program, and the synthetic ones): open, move a node, save: only that position differs; delete an `unknown` node: its edges go, nothing else. Tests in Tasks 8 and 17.
2. **Pasting:** nodes whose `setting` names a parameter the target lacks (created by name), pasting twice (fresh ids, offset positions), pasting into the same program, pasting text that is not nodes (ignored, no error). Test in Task 9.
3. **Every way "On the rig" ends** (table R1–R11), above all the ones nobody clicks: a closed tab, a lost connection, a second tab, a server restart. Tests in Tasks 7 and 16.
4. **The core does not load** (wasm blocked, old browser, a 404): the page still edits and saves; curves and preview lights say `preview unavailable`; "On the rig" stays available. Test in Tasks 14 and 15.
5. **Values the screen cannot draw:** a divide by zero or a huge value (NaN, ±inf, 1e300) at a node: its curve clamps and shows `—` for non-finite samples; nothing throws; DMX stays 0–255. A 200-node program still steps within budget. Tests in Tasks 4 and 14.

---

### Task 1: The trial — the engine's evaluator in the browser

**Files:**
- Create: `crates/ptah-web/{Cargo.toml,src/lib.rs,src/trial.rs}`, `scripts/build-core.mjs`, `scripts/core-trial.test.mjs` (run with `node --test`), `docs/ledgers/builder-core-trial.md`
- Modify: `Cargo.toml` (workspace member), `rust-toolchain.toml` (`targets = ["wasm32-unknown-unknown"]`), `.github/workflows/ci.yml` (the target), `crates/ptah-model/{Cargo.toml,src/lib.rs}` (feature `fs`), `crates/ptah-vm/Cargo.toml`, `.gitignore` (`apps/web/public/core/`)

**Interfaces:**
- Produces:
  - `ptah-model` feature `fs`, on by default, gating `schema`, `store`, `tree`, `import`, `impact`, `unwind` and the optional dependencies `jsonschema` and `tempfile`. Every other crate keeps the default. `ptah-vm` depends on `ptah-model` with `default-features = false` and enables `fs` only under its `testing` feature.
  - `ptah-web`: `crate-type = ["cdylib", "rlib"]`, depends on `ptah-vm` and `ptah-model` without `fs`. For the trial it exports only:
    ```rust
    #[no_mangle] pub extern "C" fn core_alloc(len: usize) -> *mut u8;
    #[no_mangle] pub extern "C" fn core_free(ptr: *mut u8, len: usize);
    /// Input: JSON `{ "program": Program, "beats": f64, "stepsPerBeat": u32 }` at (ptr, len).
    /// Output: pointer to a u32 little-endian length followed by that many bytes: the DMX of universe 1, 512 bytes per step.
    #[no_mangle] pub extern "C" fn trial_run(ptr: *const u8, len: usize) -> *const u8;
    pub fn trial_frames(program: &Program, beats: f64, steps_per_beat: u32) -> Vec<u8>; // the same, native
    ```
    `trial_frames` builds a `CompiledShow` (one group of 4 lights, one `per-member` instance of the program, a held note on light 0 from beat 0, tempo 120) and calls `render_frame` per step.
  - `node scripts/build-core.mjs`: `cargo build -p ptah-web --target wasm32-unknown-unknown --release`, then copies the module to `apps/web/public/core/ptah_core.wasm` and prints its size.
- **Verdict rules (all must hold for PASS):** (1) the wasm build succeeds and `git diff Cargo.lock` adds no `[[package]]`; (2) `trial_run` in Node on the fixture `sine` program (`fixtures/shows/hilldale-reauthored/programs/866026d6-….json`), 4 beats at 24 steps per beat, returns bytes equal to `trial_frames` run natively (the test shells out to a `cargo run -p ptah-web --example trial` or reads a file the Rust test wrote); (3) the module is ≤ 3 MiB; (4) the median of 200 steps is ≤ 2 ms in Node.

- [ ] **Step 1: Failing test** — `scripts/core-trial.test.mjs`: loads `apps/web/public/core/ptah_core.wasm` with `WebAssembly.instantiate` (no imports), runs `trial_run` on `sine`, compares with the native bytes, checks size and step time. Run `node --test scripts/core-trial.test.mjs`. Expected: FAIL (no module).
- [ ] **Step 2: The feature gate.** Add `fs` to `ptah-model`; `cargo build -p ptah-model --no-default-features` and `cargo tree -p ptah-web --target wasm32-unknown-unknown` shows no `jsonschema`, `ahash` or `getrandom`. The whole native workspace still builds and `cargo nextest run -p ptah-model -p ptah-vm` passes unchanged.
- [ ] **Step 3: `ptah-web` and the build script.** One day is the budget. If the build needs a new crate or a `getrandom` backend flag, that is a FAIL of rule 1: stop and write the verdict.
- [ ] **Step 4: Run the test.** Record the four measurements.
- [ ] **Step 5: Write the verdict** in `docs/ledgers/builder-core-trial.md`: PASS or FAIL, the four numbers, what was needed to get there, and anything the later tasks must know (e.g. the `opt-level` chosen). On FAIL also keep the feature gate (harmless) and remove the wasm target from CI.
- [ ] **Step 6: Gates** — `cargo fmt --all --check && cargo clippy --all-targets -- -D warnings && cargo nextest run -p ptah-model -p ptah-vm -p ptah-web`; `pnpm check`.
- [ ] **Step 7: Commit** — `build(core): the evaluator builds for the browser (trial verdict: <PASS|FAIL>)`.

---

### Task 2: Per-node values out of the evaluator

**Files:**
- Modify: `crates/ptah-vm/src/{ops.rs,compile.rs,show/mod.rs,voices.rs}`, `docs/vm-rust.md`
- Test: `crates/ptah-vm/tests/probe.rs` (new)

**Interfaces:**
- Produces:
  ```rust
  // ops.rs — Compiled gains (serialised, after `stateful`):
  pub node_slots: Vec<(String, u32)>,   // node id → the slot of its FIRST output, in node order; a subgraph node maps to its first output
  // show/mod.rs
  /// The slot values of the newest voice of `instance` on `member` (None: no voice plays there). Read-only; valid until the next render_frame.
  pub fn probe(&self, instance: u32, member: Option<u32>) -> Option<&[f64]>;
  /// The compiled program an instance runs (None for a scene instance).
  pub fn compiled_of(&self, instance: u32) -> Option<&Compiled>;
  ```
- Rules: nothing on the render path changes; the allocation guard (`crates/ptah-engine/tests/perf.rs`) passes untouched; golden traces (`v1_traces`, `v2_traces`) are byte-identical (the new field must not change `ops` or `slots`). Deduplicated constants share a slot: both node ids map to it.

- [ ] **Step 1: Failing tests** in `tests/probe.rs` (using the `testing` rigs):

```rust
#[test] fn every_node_of_every_fixture_program_has_a_slot()       // node_slots.len() == nodes that produce a value; output nodes map to their input's slot or are absent (state which in the doc)
#[test] fn a_probe_reads_what_evaluate_wrote()                    // constant 0.25 → probe[slot] == 0.25; time node rises with the frame
#[test] fn no_voice_no_probe()                                    // before the note and after a reset stop: None
#[test] fn the_newest_voice_wins()                                // retrigger on the same member: the probe follows the new voice's time
#[test] fn compile_output_is_unchanged_but_for_node_slots()       // ops, slots, outputs, param_slots equal the pre-change serialisation of a fixture (golden file written by this test's first run is NOT allowed: compare field by field with compile_program run on the same input minus node_slots)
```

- [ ] **Step 2: Run** — `cargo nextest run -p ptah-vm --test probe`. Expected: FAIL.
- [ ] **Step 3: Implement.** **Step 4: Gates** — `cargo fmt --all --check && cargo clippy -p ptah-vm --all-targets -- -D warnings && cargo nextest run -p ptah-vm -p ptah-engine`.
- [ ] **Step 5: Commit** — `feat(vm): a voice's node values can be read`.

---

### Task 3: The node catalogue, derived outputs and notes

**Files:**
- Create: `crates/ptah-model/src/{catalogue.rs,program_edit.rs}`, `crates/ptah-model/tests/catalogue.rs`
- Modify: `crates/ptah-model/src/{lib.rs,types/program.rs,lint/program.rs}`, `schemas/program.schema.json`, `packages/model-tools/src/{types.ts,lint/program.ts}` and its oracle generator and counts (as Show Task 1 did), `docs/schemas.md`

**Interfaces:**
- Produces:
  ```rust
  // catalogue.rs (no `fs` needed)
  #[derive(Serialize)] pub struct FieldSpec { pub name: &'static str, pub kind: FieldKind, pub min: Option<f64>, pub max: Option<f64>, pub default: Option<f64>, pub choices: &'static [&'static str] }
  #[derive(Serialize)] #[serde(rename_all = "lowercase")] pub enum FieldKind { Number, Integer, Choice, Setting, Program, Text }
  #[derive(Serialize)] pub struct NodeSpec { pub r#type: &'static str, pub title: &'static str, pub family: &'static str,   // "inputs" | "shape" | "math" | "outputs" | "other"
      pub words: &'static [&'static str],                // search words, e.g. lfo: ["sine","triangle","square","saw","wave","oscillator"]
      pub fields: &'static [FieldSpec], pub inputs: Vec<PortSpec>, pub outputs: Vec<PortSpec>, pub editable: bool }   // false: unknown, subgraph, z1
  #[derive(Serialize)] pub struct PortSpec { pub name: &'static str, pub ty: PortType, pub default: Option<f64> }
  pub fn catalogue() -> Vec<NodeSpec>;                   // every NodeType once, in library order
  // program_edit.rs
  /// The `outputs` list the lint expects: one per output node, from `output_of`, in node order.
  pub fn derive_outputs(p: &Program) -> Vec<OutputDecl>;
  ```
  - `Program` gains `notes: Vec<Note>` (`#[serde(default, skip_serializing_if = "Vec::is_empty")]`), `Note { id, position: Position, text: String }`; the schema gains the optional `notes` array; the TypeScript `Program` type too. A file without `notes` serialises without the key (round trip unchanged).
- Rules: `ports` come from `ports::ports(NodeType)`; field ranges and defaults are **equal to the schema's** — the test below reads `schemas/program.schema.json` (test-only, with `fs`) and compares every `minimum`/`maximum`/`enum` per node type. Titles are the words the owner sees: `setting` for `parameter`, `which light` for `member`, `dimmer` for `out.intensity`, `colour` for `out.color`; `envelope` is `adsr`'s title and the V1 `envelope` node is titled `envelope (V1)`.

- [ ] **Step 1: Failing tests** in `tests/catalogue.rs`:

```rust
#[test] fn the_catalogue_has_every_node_type_once()
#[test] fn field_ranges_and_choices_equal_the_schema()       // walks the schema's node oneOf
#[test] fn ports_equal_the_ports_table()
#[test] fn only_unknown_subgraph_and_z1_are_not_editable()
#[test] fn searching_sine_finds_lfo()                         // "sine" ∈ lfo.words
#[test] fn derived_outputs_satisfy_the_lint()                 // for every fixture program: lint_program with outputs = derive_outputs(p) has no outputs-mismatch; and derive_outputs(p) == p.outputs
#[test] fn notes_round_trip_and_old_files_are_unchanged()     // serialise(parse(file)) == file for every fixture program; a program with one note keeps it
```
  and the TS side: the lint ignores `notes`; one oracle case `program-with-notes` yields no issue (Rust count bumped).

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Gates** — model-tools test + typecheck; `cargo fmt --all --check && cargo clippy -p ptah-model --all-targets -- -D warnings && cargo nextest run -p ptah-model -p ptah-vm -p ptah-server`; `cargo build -p ptah-web --target wasm32-unknown-unknown --release`; `pnpm check && pnpm format`.
- [ ] **Step 5: Commit** — `feat(model): the node catalogue, derived outputs, and notes on a program`.

---

### Task 4: The browser core — sessions on the engine's voice layer

**Files:**
- Create: `crates/ptah-web/src/{session.rs,rig.rs,abi.rs}`, `crates/ptah-web/tests/session.rs`, `scripts/core.test.mjs`
- Modify: `crates/ptah-web/src/lib.rs` (the trial's exports removed), `scripts/build-core.mjs` (source hash), `apps/web/package.json` (`prebuild`: build the core), `crates/ptah-server/src/http/app.rs` (`wasm` → `application/wasm`), `scripts/allcheck.mjs` (runs `node --test scripts/core.test.mjs`), `docs/rust-workspace.md`

**Interfaces:**
- Consumes: Task 2's `node_slots`, `probe`, `compiled_of`; Task 3's `catalogue`, `derive_outputs`, `lint_program`.
- Produces (Rust, native and wasm alike):
  ```rust
  // rig.rs — a built-in preview fixture type: 12 channels, in this order:
  // dimmer, red, green, blue, strobe, pan, pan fine, tilt, tilt fine, zoom, focus, iris
  pub const PREVIEW_CHANNELS: usize = 12;
  pub fn preview_rig(program: &Program, others: &[Program], lights: u32, plays: &Plays) -> Result<CompiledShow, Vec<Issue>>;
  #[derive(Deserialize)] #[serde(rename_all = "camelCase")]
  pub struct Plays { pub distribution: Distribution, pub mode: TriggerMode, pub on_stop: OnStop }
  // session.rs
  pub struct Session { /* a CompiledShow, the clock, the last step */ }
  #[derive(Serialize)] #[serde(rename_all = "camelCase")]
  pub struct Step { pub nodes: Vec<f64>,            // one per program node, in node order; NaN where the node has no slot or no voice plays
                    pub lights: Vec<Light> }
  #[derive(Serialize)] #[serde(rename_all = "camelCase")]
  pub struct Light { pub dimmer: f64, pub rgb: [f64; 3], pub strobe: f64, pub pan: f64, pub tilt: f64, pub zoom: f64, pub focus: f64, pub iris: f64 } // 0..1, decoded from the preview rig's DMX
  impl Session {
      pub fn open(program: &Program, others: &[Program], lights: u32, plays: &Plays) -> Result<Self, Vec<Issue>>;
      pub fn note(&mut self, on: bool, light: Option<u32>, velocity: f64);     // velocity 0..1
      pub fn set(&mut self, parameter_id: &str, value: f64);                   // through the engine's own smoothing (Event::ParamConst)
      pub fn step(&mut self, dt_seconds: f64, tempo_bpm: f64) -> &Step;        // advances the beat, renders one frame, probes light `probe_light` (the last light a note went to, else 0)
  }
  ```
  - `abi.rs`: `core_alloc`, `core_free`, and one entry `core_call(op: u32, ptr, len) -> *const u8` (length-prefixed JSON out; `{"error": …}` on failure), ops: `0 catalogue`, `1 lint {program, others}` → issues, `2 outputs {program}` → `OutputDecl[]`, `3 open {program, others, lights, plays}` → `{session: u32}` or `{issues}`, `4 note {session, on, light, velocity}`, `5 set {session, parameterId, value}`, `6 step {session, dt, tempo}` → `Step`, `7 close {session}`, `8 sources` → the source hash string.
  - `scripts/build-core.mjs` hashes (SHA-256) every file under `crates/ptah-{model,vm,web}/src` in path order and passes it to the build as `PTAH_CORE_SOURCES` (read with `env!`); op 8 returns it.
- Rules: `Light` values come from the rendered DMX of the preview rig (so rounding is the engine's); a light with no colour output has `rgb` `[1,1,1]`; non-finite node values serialise as `null` (Review Focus 5) and never reach DMX as anything but 0–255.

- [ ] **Step 1: Failing native tests** in `tests/session.rs`:

```rust
#[test] fn a_session_renders_what_the_engine_renders()        // sine held 4 beats on 4 lights == the trial's native frames (the DMX decoded back)
#[test] fn the_voice_layer_is_real()                          // a setting with smoothingMs slews (the value is between old and new one step after `set`); onStop release fades, reset cuts; oneshot ends by itself
#[test] fn spread_and_per_light_play_different_lights()
#[test] fn nodes_are_in_program_order_and_follow_the_note()   // adsr node rises after note on, falls after note off
#[test] fn a_program_that_does_not_compile_has_issues_not_a_session()   // cycle; wrong port type
#[test] fn a_divide_by_zero_does_not_poison_the_step()        // Review Focus 5: the node is null, lights are finite 0..1
#[test] fn two_hundred_nodes_step_in_budget()                 // generated_program(200): median step ≤ 2 ms (native; skipped under a debugger build flag if the repo's perf tests do so)
#[test] fn subgraph_programs_need_their_others()              // synthetic fixture with subgraph: opens with others, issues without
```
- [ ] **Step 2: Failing wasm test** — `scripts/core.test.mjs` (`node --test`): the module's `sources` equals the hash the script computes now (a stale module fails with the message `rebuild the core: node scripts/build-core.mjs`); for every fixture program, a scripted session (open, note on, 48 steps, set a setting, note off, 48 steps) gives the same `Step` JSON as the native run written by `cargo run -p ptah-web --example golden`.
- [ ] **Step 3: Run** both — FAIL. **Step 4: Implement.**
- [ ] **Step 5: Embedding** — `pnpm -F @ptah-app/web build` runs the core build first; `dist/core/ptah_core.wasm` exists; the server serves it as `application/wasm` (one route test).
- [ ] **Step 6: Gates** — `cargo fmt --all --check && cargo clippy --all-targets -- -D warnings && cargo nextest run -p ptah-web -p ptah-vm -p ptah-server`; `node --test scripts/core.test.mjs`; `pnpm check`.
- [ ] **Step 7: Commit** — `feat(core): preview sessions run the engine's voice layer in the browser`.

---

### Task 5: Program saves — revision, derived outputs, impact, prune

**Files:**
- Create: `crates/ptah-server/src/http/programs.rs` (move `get_program`, `put_program`, `copy_program`, `list_programs` from `shows.rs`), `crates/ptah-server/tests/programs.rs`
- Modify: `crates/ptah-model/src/program_edit.rs`, `crates/ptah-server/src/http/{mod.rs,shows.rs}`, `docs/api.md`

**Interfaces:**
- Produces (model):
  ```rust
  #[derive(Serialize, PartialEq, Debug)] #[serde(rename_all = "camelCase")]
  pub struct RowImpact { pub instance_id: String, pub row: String, pub group: String,
      pub bindings: Vec<LostBinding>,       // { parameterId, parameter (its name in the OLD program), source (short text: "CC 3") }
      pub velocity_to: Option<String>,      // the old parameter's name, when velocityTo names a setting the draft lacks
      pub routes: Vec<LostRoute> }          // { slot, reason: "gone" | "kind" }
  #[derive(Serialize)] #[serde(rename_all = "camelCase")]
  pub struct ProgramImpact { pub rows: Vec<RowImpact>, pub uses: u32, pub changes: bool }   // rows: only those that lose something; uses: every row on the program
  pub fn program_impact(old: Option<&Program>, new: &Program, show: &Show) -> ProgramImpact;
  /// Remove from `show` exactly what `program_impact` lists. True when something was removed.
  pub fn prune_for_program(show: &mut Show, old: Option<&Program>, new: &Program) -> bool;
  ```
- Produces (routes, under the existing write lock):
  - `GET /shows/{id}/programs/{pid}`: adds `ETag`.
  - `PUT /shows/{id}/programs/{pid}`: `If-Match` as the show `PUT` (409 `program changed on disk`); sets `outputs` to `derive_outputs` before validating; refuses (422, Issue shape, code `program-name-taken`, path `/name`, message `another program has this name`) a name another program of that show has when creating or renaming; answers `{ path, issues, revision }`. With `?prune=1`: computes the impact against the file on disk, applies `prune_for_program` to the show, and writes **both files or neither** (the show is validated first; on any failure nothing is written); answers also `showRevision`.
  - `POST /shows/{id}/programs/{pid}/impact`: the draft → `ProgramImpact`. Nothing written.
  - `DELETE /shows/{id}/programs/{pid}`: 409 `{ "error": "program in use", "rows": [names] }` while an instance uses it; otherwise removes the file and its entry in `show.programs`.
  - `POST /shows/{id}/programs/{pid}/duplicate` `{ name? }` → `{ id, name }` (`copy_name` rule).
  - `GET /programs`: each item gains `nodes` (count), `settings` (names), `uses` (rows).

- [ ] **Step 1: Failing tests** (`tests/programs.rs`, temp tree from the fixtures):

```rust
#[test] fn a_stale_program_put_is_409_and_outputs_are_derived()
#[test] fn impact_names_the_fader_the_velocity_and_the_routes()   // drop a bound setting; drop an output slot a row routes; change an output's kind on a routed slot; velocityTo
#[test] fn impact_is_empty_for_a_change_that_breaks_nothing()     // move a node; add a setting
#[test] fn a_plain_put_that_would_break_the_show_is_still_written_and_reports_the_show_issues_as_warnings() // the page asks impact first; the plain PUT keeps today's behaviour
#[test] fn prune_writes_both_files_and_the_show_then_loads()
#[test] fn prune_writes_nothing_when_the_show_would_not_validate() // inject via a show file that is already invalid
#[test] fn delete_is_409_while_a_row_uses_it()
#[test] fn duplicate_and_unique_names()
#[test] fn programs_list_counts_nodes_settings_and_uses()
```
- [ ] **Step 2: Run** — `cargo nextest run -p ptah-server --test programs`. FAIL.
- [ ] **Step 3: Implement** (the move first, tests green, then behaviour). **Step 4: Gates** — fmt, clippy, `cargo nextest run -p ptah-server -p ptah-model`; api.md rows.
- [ ] **Step 5: Commit** — `feat(server): program saves check the revision and say what they do to the show`.

---

### Task 6: The preview load

**Files:**
- Modify: `crates/ptah-engine/src/{command.rs,loader.rs,engine.rs,live_show.rs}`, `crates/ptah-server/src/http/status.rs`, `crates/ptah-engine/tests/suite/loader.rs` (or the file the loader's tests live in), `docs/engine.md`, `docs/api.md`

**Interfaces:**
- Consumes: Task 5's `prune_for_program`.
- Produces:
  ```rust
  // command.rs — wire: {"type":"previewProgram","program":{…Program…}}; engine-internal? NO: reachable only through the server's preview route (Task 7), so add it to the server's blocklist for POST /commands.
  Command::PreviewProgram { program: Box<serde_json::Value> }
  // loader.rs
  LoaderRequest::Preview { id: u64, program: Box<Program> }
  // live_show.rs — ShowInfo gains, and status.rs's ShowInfoView mirrors as `preview`:
  pub preview: Option<PreviewInfo>,   // { program_id: String, without: Vec<String> }  — `without`: one short line per binding/route left out ("flash (pars): CC 3 → speed")
  ```
- Behaviour: a preview is a load of the **playing** show on its venue and patch, from disk, with the program of that id replaced in memory by the given one and `prune_for_program` applied in memory (its removals listed in `without`); compiled off the render thread and swapped like any load (the clock kept, a new epoch). Refused, with these messages: `no show` (nothing plays), `unknown program` (the playing show has no program of that id), `clock running`, and the load's own refusal (`show cannot render: …`) when the draft does not compile. It does **not** call `remember` and does not change what the journal would resume (a restart loads the saved files). An ordinary `loadShow` clears `preview`.

- [ ] **Step 1: Failing tests:**

```rust
#[test] fn a_preview_plays_the_draft_and_says_so()             // frames differ from the saved program's; show_info.preview.program_id set; epoch bumped
#[test] fn a_preview_is_refused_in_each_named_case()           // the four messages
#[test] fn a_preview_leaves_out_what_the_draft_breaks_and_lists_it()
#[test] fn an_ordinary_load_ends_the_preview()                 // preview None; frames are the saved program's
#[test] fn a_preview_keeps_the_clock_and_writes_no_file()      // beat continues; tree bytes and settings.json unchanged
#[test] fn a_restart_comes_back_on_the_saved_show()            // journal resume after a preview: no preview, saved frames
```
  plus the existing allocation guard run unchanged.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Gates** — fmt, clippy, `cargo nextest run -p ptah-engine -p ptah-server`.
- [ ] **Step 5: Commit** — `feat(engine): a show can be loaded with one program previewed from memory`.

---

### Task 7: The preview lease (and the Rust checkpoint)

**Files:**
- Modify: `crates/ptah-server/src/{state.rs,http/programs.rs,http/mod.rs,http/commands.rs}`, the owner loop that already steps every 2 ms (where the mirror is refreshed), `crates/ptah-server/tests/programs.rs`, `docs/api.md`

**Interfaces:**
- Consumes: Task 6.
- Produces:
  - `PUT /shows/{id}/programs/{pid}/preview`, body `{ "program": <draft>, "holder": "<uuid the page made>" }` → 200 `{ "epoch", "without": [..], "leaseMs": 5000 }`: sends `PreviewProgram`, records the lease `{ show, program, holder, until }`. The same holder renews and refreshes; another holder **takes over** (the previous holder's next call answers 409 `{ "error": "preview taken" }`). 409 `{ "error": <the engine's refusal> }` otherwise.
  - `POST /shows/{id}/programs/{pid}/preview/renew` `{ holder }` → 200 `{ "leaseMs": 5000 }` or 409 `preview taken` / 410 `{ "error": "preview ended", "reason": "lease" | "clock" | "load" | "restart" }`.
  - `DELETE /shows/{id}/programs/{pid}/preview` `{ holder }` → 200; ends it.
  - Ending = an ordinary `loadShow` of the playing show on its venue and patch, sent by the server: on `DELETE`, when the lease runs out, on the first owner step that sees `clock_running` while a lease is held, and before any `loadShow` or restart the server handles. The reason is kept for the holder's next `renew`.
  - `POST /commands` refuses `previewProgram` (403 `engine-internal`), so a preview always has a lease.

- [ ] **Step 1: Failing tests** (state table R4, R5, R6, R7, R11):

```rust
#[test] fn a_preview_holds_while_renewed_and_ends_when_the_lease_runs_out()   // fake time or a short test lease; show-info.preview gone, saved frames back
#[test] fn the_clock_starting_ends_it_at_once_with_reason_clock()
#[test] fn another_load_ends_it_with_reason_load()
#[test] fn a_second_holder_takes_over_and_the_first_is_told()
#[test] fn delete_ends_it_and_is_idempotent()
#[test] fn previewprogram_is_not_reachable_through_commands()
#[test] fn a_refused_preview_holds_no_lease()                                  // clock running at PUT: 409, nothing to end later
```
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.**
- [ ] **Step 4: Rust checkpoint** — `cargo fmt --all --check && cargo clippy --all-targets -- -D warnings && cargo nextest run --workspace`; `node --test scripts/core.test.mjs` (the core still matches its sources).
- [ ] **Step 5: Commit** — `feat(server): a previewed program holds the rig only while its page renews it`.

---

### Task 8: The program draft — nodes, wires, settings

**Files:**
- Create: `packages/ds/src/builder/model/{index.ts,draft.ts,graph.ts}`, `packages/ds/src/builder/{index.ts,types.ts}`, `packages/ds/src/builder/model/__tests__/{draft.test.ts,graph.test.ts,roundtrip.test.ts,fixtures.ts}`
- Modify: `packages/ds/package.json` (`"./builder"` export), `packages/ds/vite.config.ts`, `packages/ds/tsconfig.build.json`

**Interfaces:**
- Consumes: `Program`, `Node`, `Edge`, `Parameter` from `@ptah-app/model-tools/types` (types only — no code from `model-tools/src/vm` or `lint`).
- Produces:
  ```ts
  export const BUILDER_EDIT_WIDTH = 900;
  // The catalogue's shape as the Core delivers it (Task 3's JSON):
  export type PortType = "number" | "color" | "bool";
  export type PortSpec = { name: string; ty: PortType; default: number | null };
  export type FieldSpec = { name: string; kind: "number" | "integer" | "choice" | "setting" | "program" | "text"; min: number | null; max: number | null; default: number | null; choices: string[] };
  export type NodeSpec = { type: string; title: string; family: "inputs" | "shape" | "math" | "outputs" | "other"; words: string[]; fields: FieldSpec[]; inputs: PortSpec[]; outputs: PortSpec[]; editable: boolean };
  export type Catalogue = ReadonlyMap<string, NodeSpec>;
  export type ProgramDraft = { base: Program; current: Program; past: Program[]; future: Program[] };
  export type ProgramEdit =
    | { kind: "rename"; name: string }
    | { kind: "addNode"; id: string; type: string; position: { x: number; y: number } }     // fields from the catalogue's defaults; an output takes the next free slot of its kind
    | { kind: "moveNodes"; moves: { id: string; position: { x: number; y: number } }[] }    // one step for a whole drag
    | { kind: "removeNodes"; ids: string[] }                                               // their edges go too
    | { kind: "setField"; nodeId: string; field: string; value: number | string }
    | { kind: "connect"; id: string; from: { node: string; port: number }; to: { node: string; port: number } }  // replaces a wire already on that input
    | { kind: "disconnect"; edgeId: string }
    | { kind: "addSetting"; id: string; name: string } | { kind: "setSetting"; id: string; patch: Partial<Omit<Parameter, "id">> } | { kind: "removeSetting"; id: string }
    | { kind: "replace"; program: Program };                                               // paste / tidy results: one step
  export function openDraft(p: Program): ProgramDraft;
  export function applyEdit(d: ProgramDraft, e: ProgramEdit, cat: Catalogue): ProgramDraft;   // the same object when refused or unchanged
  export function refusal(d: ProgramDraft, e: ProgramEdit, cat: Catalogue): string | null;
  export function undo(d: ProgramDraft): ProgramDraft; export function redo(d: ProgramDraft): ProgramDraft;
  export function isDirty(d: ProgramDraft): boolean; export function markSaved(d: ProgramDraft, saved?: Program): ProgramDraft;
  export function newProgram(id: string, name: string, ids: () => string): Program;          // one `time` node, one `out.intensity` node (slot 0), not wired
  // graph.ts
  export function canConnect(p: Program, from: { node: string; port: number }, to: { node: string; port: number }, cat: Catalogue): string | null; // null = allowed; else the line: "a number cannot feed a colour", "that would make a loop", "an output cannot feed itself"
  export function acceptingInputs(p: Program, from: { node: string; port: number }, cat: Catalogue): { node: string; port: number }[];
  export function unwiredValue(p: Program, nodeId: string, port: number, cat: Catalogue): number | null;   // the field's value or the port's default
  ```
- Rules (§4.3, §4.4): `connect` is refused with `canConnect`'s line; a number may feed a bool, nothing else crosses types; `removeSetting` is refused while a `parameter` node reads it (`read by <n> node(s)`); `setField` clamps nothing and refuses out-of-range values with `between <min> and <max>`; non-`editable` nodes refuse `setField` only. The file's `outputs` list is **not** maintained here (the page applies `Core.deriveOutputs`, Task 15). Node order in the file is never changed by an edit; new nodes are appended.

- [ ] **Step 1: Failing tests** — each edit, each refusal, undo/redo; `canConnect` table (types, loop through two nodes, self); `acceptingInputs`; **Review Focus 1:** for every fixture program (all four shows), open → `moveNodes` one node → the result differs from the file only in that position; `removeNodes` of an `unknown` node removes it and its edges only; round trip of key order (`Object.keys` equal) for every fixture.
- [ ] **Step 2: Run** — `pnpm -F @ptah-app/ds test -- builder/model`. FAIL. **Step 3: Implement.**
- [ ] **Step 4: Gates** — ds `test -- builder`, typecheck, build; `pnpm check && pnpm format`.
- [ ] **Step 5: Commit** — `feat(ds): the program draft: nodes, wires, settings, undo`.

---

### Task 9: The program draft — clipboard, tidy, search, notes, placement

**Files:**
- Create: `packages/ds/src/builder/model/{clipboard.ts,tidy.ts,search.ts,place.ts}` and their tests
- Modify: `packages/ds/src/builder/model/{draft.ts,index.ts}`

**Interfaces:**
- Produces:
  ```ts
  // clipboard.ts
  export const CLIP_KIND = "ptah.builder.nodes@1";
  export type Clip = { kind: typeof CLIP_KIND; nodes: Node[]; edges: Edge[]; settings: Parameter[]; notes: Note[] };   // edges among the copied nodes only; settings the copied `parameter` nodes read
  export function copyNodes(p: Program, ids: string[]): Clip;
  export function parseClip(text: string): Clip | null;                                    // anything else → null
  export function pasteClip(p: Program, clip: Clip, at: { x: number; y: number }, ids: () => string): { program: Program; added: string[] };
  // tidy.ts
  export function tidy(p: Program, cat: Catalogue): Program;                               // positions only: columns by depth from the inputs, 200 px apart; rows 96 px apart, ordered to keep wires short; notes untouched
  // search.ts
  export function searchNodes(cat: Catalogue, query: string, accepting?: PortType): NodeSpec[];   // by title prefix, then title substring, then words; `accepting`: only nodes with an input of that type (number feeds bool)
  // place.ts
  export function issuePlace(p: Program, path: string): { nodeId?: string; edgeId?: string } | null;  // "/nodes/3/…" → that node; "/edges/2/…" → that edge; "/parameters/…", "/outputs/…" → null (header only)
  // draft.ts gains
  | { kind: "addNote"; id: string; position: { x: number; y: number } } | { kind: "setNote"; id: string; text: string }
  | { kind: "moveNote"; id: string; position: { x: number; y: number } } | { kind: "removeNote"; id: string }
  ```
- Rules (§4.3, Review Focus 2): a paste gives every node, edge and note a fresh id, offsets positions so the clip's top-left lands at `at`, and for each copied setting reuses the target's setting **of the same name** or creates it (fresh id), rewriting the pasted `parameter` nodes; pasted outputs take the next free slots; pasting never touches existing nodes. `tidy` changes positions only (a test compares everything else).

- [ ] **Step 1: Failing tests** — copy then paste into another fixture program (ids fresh, wires kept, setting created by name; into a program that has the name: reused); paste twice; paste into the same program; `parseClip("hello")` and of a JSON of another kind → null; tidy: no two nodes overlap, every wire goes left to right, everything but positions deep-equal; `searchNodes("sine")[0].type === "lfo"`, `"lf"` → lfo first, `accepting: "color"` lists only nodes with a colour input; `issuePlace` for node, edge and parameter paths; note edits and their undo.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Gates** as Task 8.
- [ ] **Step 5: Commit** — `feat(ds): the program draft: clipboard, tidy, search, notes`.

---

### Task 10: The canvas

**Files:**
- Create: `packages/ds/src/builder/{Canvas.tsx,Canvas.module.css,NodeBox.tsx,NodeBox.module.css,Wire.tsx,Curve.tsx,canvasSample.ts,Canvas.stories.tsx}`, `packages/ds/src/builder/__tests__/canvas.test.tsx`
- Modify: `packages/ds/package.json` (`"@xyflow/react": "12.12.0"`), `pnpm-lock.yaml`, `packages/ds/scripts/test-visual.mjs` (boards `builder-canvas-*`), `packages/ds/src/builder/index.ts`

**Interfaces:**
- Consumes: Tasks 8–9; `@xyflow/react` (`ReactFlow`, custom node and edge types; its stylesheet is NOT imported — only the minimal positioning rules it needs are written in `Canvas.module.css` with our tokens).
- Produces:
  ```tsx
  export type NodeValues = ReadonlyMap<string, Float32Array>;        // per node id: the curve's samples, oldest first (NaN = no value)
  export type CanvasProps = {
    program: Program; catalogue: Catalogue; values: NodeValues | null;        // null: `—` on every node (C9, C11)
    issues: { nodeIds: ReadonlyMap<string, "error" | "warning">; edgeIds: ReadonlyMap<string, "error" | "warning"> };
    selection: string[]; onSelection: (ids: string[]) => void;
    onEdit: (edit: ProgramEdit) => void; onRefused: (line: string) => void;
    onDropWire?: (from: { node: string; port: number }, at: { x: number; y: number }) => void;   // C5
    readOnly?: boolean };                                                                       // the phone picture
  export function Canvas(props: CanvasProps): JSX.Element;
  export function Curve(props: { samples: Float32Array | null; kind: "number" | "color"; label: string }): JSX.Element;   // a canvas-drawn curve, fixed 132×28 box; `—` when null or all NaN
  ```
- Behaviour (§4.3; state table C1–C4, C9, C10): nodes are `NodeBox` (title from the catalogue, its few fields inline when ≤ 2, named handles when a side has several, the unwired inputs' values in dim text, the curve along the bottom; a colour output draws a band); wires are bezier paths in the control-line colour, fault or warning coloured when an issue names them; dragging a wire marks `acceptingInputs` and dims the rest; a drop calls `connect` or `onRefused(canConnect's line)`; a node drag is one `moveNodes` on release; Delete removes the selection; pan by dragging the background or two-finger scroll; zoom by pinch or Cmd/Ctrl-scroll; a `Fit` button in the corner. Keyboard: Tab moves through nodes in reading order, arrows move the selected nodes by 8 px (Shift: 40), Enter opens the inspector (Task 11's `onOpen` — expose `onActivate(nodeId)`), `W` on a focused output handle starts a wire and arrows + Enter choose the input.
- Nothing shifts: a node's box has a fixed width and its curve box a fixed size; values arriving never change layout (a `noShift` play pushes values).

- [ ] **Step 1: Failing tests** (`canvas.test.tsx`; React Flow needs `ResizeObserver` and DOM measures: use the test setup the library documents for jsdom, in this file only) — the sample renders one box per node with its title; an `unknown` node shows its type name; selecting calls `onSelection`; Delete sends `removeNodes`; `values: null` shows `—` on every node; an issue on an edge gives that path the fault class.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement**, stories: `well` (the sine fixture with fake moving values), `pulse` (the mockup's six nodes), `wiring` (a play that drags a wire: accepting inputs marked), `refused` (play: drop on a wrong type → the line), `not-compiling`, `unknown-nodes` (a HILLDALE literal program), `colour` (the `red` fixture), `selected`, `read-only`.
- [ ] **Step 4: Gates** — a new dependency and a new kind of part: `pnpm -F @ptah-app/ds test && typecheck && build && test:storybook && pnpm -F @ptah-app/ds test:visual` (full; new boards recorded with `--update --only builder-canvas`); `pnpm check && pnpm format`. In the report: the bundle size of `dist/builder.js` and that `@xyflow/react`'s CSS is not in the build.
- [ ] **Step 5: Commit** — `feat(ds): the Builder canvas`.

---

### Task 11: Add box, inspector, notes

**Files:**
- Create: `packages/ds/src/builder/{AddBox.tsx,Inspector.tsx,NoteBox.tsx}` (+ module CSS), `Editing.stories.tsx`, `__tests__/editing.test.tsx`
- Modify: `Canvas.tsx` (hosts them), `index.ts`, `test-visual.mjs` (`builder-editing-*`)

**Interfaces:**
- Produces:
  ```tsx
  export function AddBox(props: { catalogue: Catalogue; at: { x: number; y: number }; accepting?: PortType;
    onPick: (spec: NodeSpec) => void; onClose: () => void }): JSX.Element;
  export function Inspector(props: { program: Program; catalogue: Catalogue; selection: string[];
    onEdit: (e: ProgramEdit) => void; onRefused: (line: string) => void }): JSX.Element;   // always rendered: empty when nothing is selected, same box
  ```
  `CanvasProps` gains `adding: { at: {x,y}; from?: { node: string; port: number } } | null` and `onAdding(next)`.
- Behaviour (C5–C8): typing a letter on the focused canvas opens the add box at the pointer (canvas centre when the pointer is elsewhere); it lists `searchNodes`; arrows move, Enter adds the highlighted node at that spot (and, with `from`, wires it to its first accepting input, one undo step via `replace`); Escape closes. `note` is in the list. The inspector floats at the canvas's top right, fixed size; one node: one control per `FieldSpec` (`NumberField` with the range, `Select` for choices, a `Select` of the program's settings for `setting`, text for non-editable nodes' fields), refusals under the field; several nodes: `<n> nodes` and Duplicate, Delete. Notes: a text box, edited in place, moved like a node, no handles.

- [ ] **Step 1: Failing tests** — typing `lf` then Enter sends `addNode` of type `lfo` at the box's spot; the wire-drop variant sends one `replace` with the node and the wire; Escape sends nothing; the inspector shows an lfo's shape/rate/rate unit/phase from the catalogue and sends `setField`; out of range shows `between <min> and <max>`; an `unknown` node's fields are text; two selected show `2 nodes`; the inspector's box has the same size empty and filled.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement**, stories `add-box--open`, `add-box-filtered--open`, `inspector-lfo`, `inspector-many`, `inspector-unknown`, `note`; `noShift` on opening the add box and on selecting a node.
- [ ] **Step 4: Gates** — ds `test -- builder`, typecheck, build, test:storybook; `--only builder`.
- [ ] **Step 5: Commit** — `feat(ds): add a node by typing; the inspector; notes`.

---

### Task 12: The dock

**Files:**
- Create: `packages/ds/src/builder/{Dock.tsx,Dock.module.css,TestPanel.tsx,SettingsList.tsx,PreviewLights.tsx,RigPanel.tsx,Dock.stories.tsx}`, `__tests__/dock.test.tsx`
- Modify: `index.ts`, `test-visual.mjs` (`builder-dock-*`)

**Interfaces:**
- Produces:
  ```tsx
  export type Plays = { distribution: "all" | "per-member" | "spread"; mode: "gate" | "toggle" | "oneshot"; onStop: "release" | "reset" | "hold" };
  export type TestState = { held: boolean; loop: boolean; loopBeats: number; velocity: number /* 0–127 */; tempo: number;
    values: Record<string, number> /* by setting id */; plays: Plays; lights: number /* 1–8 */; light: number /* the one `one note per light` plays */ };
  export type Light = { dimmer: number; rgb: [number, number, number]; strobe: number; pan: number; tilt: number; zoom: number; focus: number; iris: number };
  export type RigState = { on: boolean; available: boolean; reason: string | null; rows: { instanceId: string; label: string }[]; row: string | null;
    without: string[]; dmx: { name: string; address: number; values: number[] }[] };
  export function Dock(props: { program: Program; test: TestState; onTest: (next: TestState) => void; onHold: (down: boolean) => void;
    lights: Light[] | null; rig: RigState; onRig: (on: boolean) => void; onRigRow: (instanceId: string) => void;
    onEdit: (e: ProgramEdit) => void; onRefused: (line: string) => void }): JSX.Element;
  ```
- Behaviour (§4.4, §4.5): one fixed-height band, three sections. **Test:** `Hold` (pointer down/up, leave, cancel, blur all release — one `onHold(false)` per `onHold(true)`); `Loop` with its length; velocity; one `Slider` per setting from its range, starting at its default; tempo; `Plays like` two `Select`s. Below, the settings list: add, rename, range, default, unit, delete (refusals shown under the row). **Preview:** `lights` as boxes whose colour is `rgb × dimmer`, a strobe as a blinking mark, pan/tilt and zoom/focus/iris as small numbers; the mode selector; with `one note per light` a click on a light selects it; `null` → `preview unavailable`. **On the rig:** the switch, the row chooser when several, the reason when unavailable, `previewing without: …` when `without` is not empty, and the DMX values as name, address, bytes.

- [ ] **Step 1: Failing tests** — a slider move calls `onTest` with that setting's value; `Hold` pairs every down with exactly one up across up/leave/cancel/blur; deleting a read setting shows the refusal; `lights: null` shows `preview unavailable`; the switch is disabled with its reason; `without` renders its line; the dock's height is equal across every story (measured in a play).
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement**, stories: `well`, `holding`, `many-settings` (scrolls inside its section), `colour-lights`, `one-note-per-light`, `unavailable-core`, `rig-off-reasons` (four), `rig-on`, `rig-without`.
- [ ] **Step 4: Gates** — as Task 11.
- [ ] **Step 5: Commit** — `feat(ds): the Builder dock: test panel, preview lights, on the rig`.

---

### Task 13: List, header, dialogs, phone — and the ds checkpoint

**Files:**
- Create: `packages/ds/src/builder/{BuilderScreen.tsx,BuilderScreen.module.css,BuilderHeader.tsx,ProgramList.tsx,BuilderPhone.tsx,dialogs/{ImpactDialog.tsx,ProgramDialogs.tsx}}`, `Screen.stories.tsx`, `__tests__/screen.test.tsx`
- Modify: `index.ts`, `test-visual.mjs` (`builder-screen-*`, `builder-list-*`, `builder-phone-390x844`; tap list)

**Interfaces:**
- Produces:
  ```tsx
  export type ProgramItem = { showId: string; show: string; playing: boolean; id: string; name: string; nodes: number; settings: string[]; uses: number; curve: Float32Array | null };
  export function ProgramList(props: { width: number; items: ProgramItem[]; shows: { id: string; name: string }[];
    onOpen: (showId: string, id: string) => void; onNew: (showId: string) => void; onDuplicate: (item: ProgramItem) => void;
    onCopyTo: (item: ProgramItem, showId: string) => void; onDelete: (item: ProgramItem) => void; refusals: Record<string, string> }): JSX.Element;
  export type BuilderIssue = { severity: "error" | "warning"; code: string; path: string; message: string };
  export type RowImpactView = { row: string; group: string; lines: string[] };       // e.g. `the fader CC 3 loses its setting "speed"`
  export function BuilderScreen(props: { width: number; draft: ProgramDraft; catalogue: Catalogue; show: { id: string; name: string }; uses: number;
    issues: BuilderIssue[]; values: NodeValues | null; onRig: boolean;
    onEdit: (e: ProgramEdit) => void; onUndo: () => void; onRedo: () => void; onTidy: () => void; onSave: () => void; onBack: () => void;
    onCopy: (ids: string[]) => void; onPaste: (at: { x: number; y: number }) => void;
    dock: React.ReactNode; notice?: React.ReactNode }): JSX.Element;                  // hosts Canvas, AddBox, Inspector; owns selection and the refusal line
  export function ImpactDialog(props: { open: boolean; rows: RowImpactView[]; busy: boolean; onAnswer: (a: "save" | "cancel") => void }): JSX.Element;
  export function BuilderPhone(props: { program: Program; catalogue: Catalogue }): JSX.Element;
  ```
- Behaviour (§4.1, §4.2, §4.8, §4.9): header per §4.2 (`on the rig` beside the name when `onRig`; the fault count and its list; `Tidy` sends one `replace` through `onTidy`); issues are placed with `issuePlace`, the rest counted only; a refusal line under the header for canvas refusals, one fixed line. Cmd/Ctrl-C/X/V/D on the canvas call `onCopy`/`onPaste`. The list is grouped by show, the playing show first, with the still curve; the name refusal on rename in place (`another program has this name`). Below `BUILDER_EDIT_WIDTH`: the list, and for a program `BuilderPhone` (name, settings, `Canvas readOnly`, the one line). Root follows the scroll rule; the canvas takes what the header and dock leave.

- [ ] **Step 1: Failing tests** — the list groups by show with the playing one first and shows `3 rows`; a delete refusal renders its line; the header's Save is disabled when clean; an issue at `/nodes/2/…` marks that node, one at `/parameters/0` only counts; `ImpactDialog` lists rows and answers both ways; the phone view has no button and renders the graph.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement**, stories: screen `well`, `unsaved`, `issues`, `on-the-rig`, `impact--open`, `conflict--open`; list `well`, `empty-show`, `refused-delete`; `phone`.
- [ ] **Step 4: ds checkpoint** — `pnpm -F @ptah-app/ds test && typecheck && build && test:storybook && test:visual` (full) `&& pnpm check && pnpm format`.
- [ ] **Step 5: Commit** — `feat(ds): the Builder screen, its program list and phone view`.

---

### Task 14: The Core in the page, and the preview clock

**Files:**
- Create: `apps/web/src/builder/{core.ts,coreWasm.ts,usePreview.ts}`, `apps/web/src/builder/__tests__/{core.test.ts,preview.test.ts,oneEngine.test.ts}`
- Modify: `apps/web/vite.config.ts` only if the module needs a rule to be copied (it is a static file in `public/core/`)

**Interfaces:**
- Consumes: Task 4's module and ops.
- Produces:
  ```ts
  export interface Core {
    catalogue(): Catalogue;
    lint(program: Program, others: Program[]): BuilderIssue[];
    deriveOutputs(program: Program): Program["outputs"];
    open(program: Program, others: Program[], lights: number, plays: Plays): CoreSession | { issues: BuilderIssue[] };
  }
  export interface CoreSession { note(on: boolean, light: number | null, velocity: number): void; set(parameterId: string, value: number): void;
    step(dtSeconds: number, tempo: number): { nodes: (number | null)[]; lights: Light[] }; close(): void }
  export function loadCore(url?: string): Promise<Core>;              // fetches `/core/ptah_core.wasm`, instantiates with no imports; rejects with a reason
  export function usePreview(core: Core | null, program: Program, others: Program[], test: TestState):
    { values: NodeValues | null; lights: Light[] | null; compiles: boolean };
  ```
- Behaviour: `usePreview` reopens the session when the program, `plays` or the light count changes (debounced 100 ms); steps on `requestAnimationFrame` with the real elapsed time (clamped to 100 ms after a pause); `held`, velocity (÷127), the loop (note on, off after `loopBeats`, on again) and slider values go to the session; each node keeps a ring of the last 240 samples (≈ 4 s) as a `Float32Array`; a `null` sample is `NaN`. It stops stepping when the tab is hidden. With `core` null: all nulls (C11).
- `oneEngine.test.ts`: no file under `packages/ds/src/builder` or `apps/web/src/builder` imports from `@ptah-app/model-tools` anything but `types` and `capabilities` (a scan of import specifiers).

- [ ] **Step 1: Failing tests** — `core.test.ts` (Vitest in Node, loading the built module from `apps/web/public/core/`): the catalogue has `lfo`; lint of the sine fixture is empty and of a cyclic draft names `cycle`; `deriveOutputs` equals the fixture's `outputs`; a session steps and returns one value per node and 4 lights; **Review Focus 4:** `loadCore("/missing.wasm")` rejects with a reason and never throws synchronously; **Review Focus 5:** a divide-by-zero program gives `NaN` samples and finite lights. `preview.test.ts` with a fake `Core` and fake frame clock: the ring fills oldest-first; a program change reopens once per burst; hidden tab stops steps; the loop sends on/off at the right beats; `core: null` gives nulls.
- [ ] **Step 2: Run** — `node scripts/build-core.mjs && pnpm -F @ptah-app/web test -- builder`. FAIL. **Step 3: Implement.**
- [ ] **Step 4: Gates** — web test, typecheck, build; `pnpm check && pnpm format`.
- [ ] **Step 5: Commit** — `feat(web): the engine's core in the page, and the preview clock`.

---

### Task 15: The Builder pages — list, edit, check, save

**Files:**
- Create: `apps/web/src/builder/{BuilderPage.tsx,ListPage.tsx,useProgram.ts,saveProgram.ts,derive.ts}`, `__tests__/{saveProgram.test.ts,page.test.tsx}`
- Modify: `apps/web/src/routes.ts` (`builderRoute`, `builderPath`, `shipped` gains `"builder"`), `apps/web/src/App.tsx`, `apps/web/src/api/types.ts`, `docs/app.md`

**Interfaces:**
- Consumes: Task 5's routes, Tasks 13–14; the Show page's patterns (`apps/web/src/show/{useShow.ts,saveShow.ts,ShowPage.tsx}`): revision reads, leave guard, conflict, apply.
- Produces:
  ```ts
  export type BuilderRoute = { showId: string; programId: string } | { list: true };
  export function builderRoute(path: string): BuilderRoute | null;   // "/builder", "/builder/<showId>/<programId>"
  export function builderPath(showId?: string, programId?: string): string;
  export type SaveProgramOutcome =
    | { kind: "saved"; revision: string; issues: BuilderIssue[] } | { kind: "saved-not-applied"; revision: string; issues: BuilderIssue[]; reason: string }
    | { kind: "impact"; rows: RowImpactView[] }                      // nothing written: ask
    | { kind: "refused"; issues: BuilderIssue[] } | { kind: "conflict"; revision: string } | { kind: "failed"; message: string };
  export function saveProgram(api: Api, showId: string, program: Program, revision: string | null, opts: { prune: boolean; playing: Playing }): Promise<SaveProgramOutcome>;
  ```
- Behaviour (§4.8, §5; state table Save S1–S8, C9, C11): the page loads the core once (`loadCore`), reads the program with its revision and the show's other programs; every edit goes through `applyEdit`, then `outputs` is set from `core.deriveOutputs` (not an undo step of its own), then `core.lint` gives the issues at once. Save: first `POST …/impact`; rows that lose something → `ImpactDialog`; `Save anyway` → `PUT ?prune=1`; otherwise the plain `PUT`. Then the Show page's flow: reload the playing show, `Apply to the running show?` when the clock runs, conflict dialog, fault notice. Copy puts `JSON.stringify(copyNodes(…))` on the system clipboard (`navigator.clipboard`, falling back to an in-memory clip when refused); paste reads it, `parseClip`, `pasteClip` at the pointer, one `replace`. The list page: `GET /programs`, grouped; New (a `newProgram` draft at its route, saved by Save), Duplicate, Copy to… (`copy-from` on the target show), Delete with its refusal. The still curve in the list is computed lazily with the core (a 2-beat held note) and is `null` without it. Without the core: the canvas shows `—`, the dock `preview unavailable`, lint issues come only from Save (C11).

- [ ] **Step 1: Failing tests** — `saveProgram.test.ts`: each outcome; impact asked before any write; `prune` sends `?prune=1`; reload only when playing. `page.test.tsx` (API and core mocked): an added node reaches the `PUT` body with derived `outputs`; a lint issue from the core marks its node; the impact dialog appears and `Cancel` writes nothing; **C11:** with `loadCore` rejecting, editing and Save still work and the dock says `preview unavailable`; S7 and S8.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Gates** — web test, typecheck, build; `pnpm check && pnpm format`.
- [ ] **Step 5: Commit** — `feat(web): the Builder: list, edit, check and save a program`.

---

### Task 16: On the rig

**Files:**
- Create: `apps/web/src/builder/rig.ts`, `__tests__/rig.test.ts`
- Modify: `apps/web/src/builder/BuilderPage.tsx`, `packages/ds/src/perform/…` where the show's name is drawn (the `previewing` mark) and its story/board, `packages/ds/src/live/types.ts` (`ShowInfo.preview`)

**Interfaces:**
- Consumes: Task 7's routes; the engine's `trigger` and `setParam` commands; `ShowInfo` (`instanceIds`, `instancePrograms`, `instanceParams`, `showEpoch`, `preview`); the frames stream for DMX.
- Produces:
  ```ts
  export const RIG_REFRESH_MS = 300; export const RIG_RENEW_MS = 2000; export const RIG_HIDDEN_MS = 5000;
  export function rigAvailability(a: { playingShowId: string | null; showId: string; rows: number; clockRunning: boolean; errors: number }): string | null;
  // "load <show> first" | "no row uses this program" | "Reaper is running" | "fix the errors first" | null, in that order
  export type RigDriver = { push(program: Program): void; hold(down: boolean, velocity: number): void; set(parameterId: string, value: number): void; row(instanceId: string): void; stop(reason?: string): void };
  export function startRig(api: RigApi, opts: { showId: string; programId: string; holder: string; instanceId: string;
    onState: (s: { on: boolean; without: string[]; ended: string | null }) => void; timers?: Timers; doc?: Document }): RigDriver;
  ```
- Behaviour (§4.7; state table R1–R11): `push` debounces 300 ms then `PUT …/preview`; after each answer (a new epoch) the driver re-reads the show info, maps `parameterId` → index for the row (`instanceParams`), resends every slider value with `setParam` and the note with `trigger` if still held (velocity ÷127; `member` = the test panel's light for a per-light row); `renew` every 2 s; 409 `preview taken` → `ended: "another page took over"`; 410 → `ended` by its reason (`clock` → `Reaper is running`, `lease` → `the preview timed out`, `load` → `another show was loaded`, `restart` → `PTAH restarted`); a draft with errors is not pushed (R8); `stop` sends `DELETE` once. The page stops it on switch off, unmount, route change, tab hidden 5 s, and before Save (S7). The DMX panel reads the frames stream for the fixtures the row's group is patched to. Perform shows `previewing` beside the show's name while `showInfo.preview` is set (a shared part: full visual gate).

- [ ] **Step 1: Failing tests** (`rig.test.ts`, fake timers and API) — one test per row R1–R11 that the page side owns (R1–R3, R6–R10; R4, R5, R11 as the 410 handling), plus: three edits within 300 ms make one `PUT`; sliders and the held note are resent after every `PUT` answer with the new epoch and re-read indexes; `stop` twice sends one `DELETE`; `rigAvailability` order.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.**
- [ ] **Step 4: Gates** — web test, typecheck, build; ds `test -- perform`, typecheck, **full** `test:visual` (the Perform mark; re-record only boards the mark changes, none should when no preview is on); `pnpm check && pnpm format`.
- [ ] **Step 5: Commit** — `feat(web): play the program being edited on the rig`.

---

### Task 17: End to end, docs, the full gate

**Files:**
- Create: `apps/web/e2e/builder.spec.ts`, `docs/ledgers/builder-owner-check.md`
- Modify: `apps/web/e2e/{engine.ts,scroll.spec.ts}`, `docs/{app.md,api.md,engine.md,rust-workspace.md,file-layout.md}`

- [ ] **Step 1: Failing e2e tests** against the real binary (`startEngine({ tree: true, artnet })`, `listenArtnet`):

```ts
test("a program built on the canvas plays once a row uses it")
// New program: type to add `constant` 0.5 and wire it to the dimmer; Save; add it to a row through the API; load; hold the row's chip on the Show page; the par's dimmer byte is 127 or 128
test("the preview curves move and the lights follow the fader")                  // curves canvas pixels change while held; a slider move changes a preview light's colour; no request leaves the page for it (network log)
test("on the rig: an unsaved change reaches the DMX, and leaves when the page closes")
// switch on; change the constant to 1; the wire byte goes 255 with nothing saved (the program's revision unchanged); close the page; within 7 s the byte is back to the saved value
test("on the rig turns off when the clock starts, and says why")
test("a save that would break a row asks first, and Save anyway leaves a show that loads")
test("moving one node changes only that node in the file")                       // Review Focus 1, on a HILLDALE literal program
test("the Builder scrolls inside the page, never the window")                    // in scroll.spec.ts
```
- [ ] **Step 2: Run** — `node scripts/build-core.mjs && pnpm -F @ptah-app/ds build && pnpm -F @ptah-app/web build && cargo build -p ptah && pnpm -F @ptah-app/web test:e2e -- builder scroll`. Fix what it finds in the owning package with a unit test there.
- [ ] **Step 3: Docs** — `docs/app.md` (the Builder: routes, the core, the preview, on the rig, save and its guard); `docs/rust-workspace.md` (`ptah-web`, the `fs` feature, the wasm build); api.md and engine.md complete for Tasks 5–7; `docs/ledgers/builder-owner-check.md`: the six exit checks of §8 as steps on the rig.
- [ ] **Step 4: The full gate** — `pnpm allcheck`. Expected: exit 0 (it now also runs `node --test scripts/core.test.mjs`).
- [ ] **Step 5: Commit** — `test(web): the Builder end to end`, `docs: the Builder, the browser core and the preview load`.
