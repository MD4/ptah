# V2 Step 1A — Rust foundation (`ptah-model`, V1 importer, `ptah check`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Rust workspace in `~/projects/ptah-v2` whose `ptah-model` crate reads, validates and lints every Step 0 file with the same issue codes and paths as `model-tools`, ports the health check, the SMF reader, patch folding and the V1 importer with collapse, and exposes them through `ptah check` and `ptah import-v1`.

**Architecture:** The TypeScript `model-tools` package stays the executable spec. This plan first makes it emit parity oracles (every lint issue over `fixtures/`, health lists, import and collapse reports, the ports table, patch proposals) as JSON under `fixtures/oracles/model/`, then ports each module to Rust with a test that compares against the oracle. Byte-level parity on files means equality of `serde_json::Value` (semantic), which is what "canonical JSON" means here. `ptah-model` does no IO except through an explicit `store` module; the render thread never touches it. Plans 1B (VM, clock), 1C (runtime, IO) and 1D (API, CLI tools, replay) build on this crate.

**Tech Stack:** Rust stable (edition 2024), `serde` + `serde_json` (with `preserve_order`), `jsonschema` (draft 2020-12), `uuid` (v5), `thiserror`, `clap`, `tempfile` (dev), `insta` is not used (oracles are explicit JSON files). TypeScript side: existing `model-tools` (`tsx`, `vitest`).

**Spec:** `docs/superpowers/specs/2026-10-26-v2-step1-engine-design.md` (V1 repo; copy at `ptah-v2/docs/specs/step1-engine.md`), sections 3, 4.1, 8, 10, 11.1. Step 0 contract: `ptah-v2/docs/schemas.md`, `docs/file-layout.md`, `docs/vm-instruction-set.md` §9 (oracle formats), `docs/specs/step0-domain-model.md` §4, §5, §7.

## Global Constraints

- Repository: `~/projects/ptah-v2`, branch `step1a-foundation` off `master`. Private; the band's files under `fixtures/v1/` stay committed only because the repo is private.
- "Rust stable, one workspace, one binary `ptah`; macOS (Apple silicon and Intel) and Linux ARM64/x86-64 from the same source." No platform-specific code in this plan.
- "V2 never writes V1's files; V1 files are read only by the importer." The importer and the store must never write to `.ptah-settings.json`, `shows/*.json` (flat) or `programs/*.json` (flat) under the V1 root.
- "`~/.ptah` with the Step 0 layout (`docs/file-layout.md`); JSON, versioned, migrated on load." Layout: `settings.json`, `library/types/<typeId>.json`, `venues/<venueId>.json`, `shows/<showId>/show.json`, `shows/<showId>/programs/<programId>.json`, `.backups/<entity>/<id>.<schema>.json`.
- Lint parity: same `code`, `level` and `path` as `model-tools` for every issue; the codes are the ones listed in `docs/schemas.md`. Messages are free text but never empty.
- Issue shape (Step 0 `issue.ts`): `{ level: "error" | "warning", code, path, message }`; `path` is a JSON-pointer-like string starting with `/`.
- Tree codes: `unknown-schema`, `invalid-json`, `schema`, `lint-failed`, all errors; `validateTree` skips the `v1` and `oracles` directories and non-`.json` files, walks in byte-order of names.
- Deterministic ids: UUID v5 with `V1_NAMESPACE = 6ba7b810-9dad-11d1-80b4-00c04fd430c8` and the exact name strings of `import/v1.ts` (`v1:universe:<showId>:1`, `v1:program:<key>`, `v1:node:<key>:<id>`, `v1:edge:<key>:<id>`, `v1:param:<key>:cc<N>`, `v1:node:<key>:<id>:x127`, …). V1 type ids are the fixed `V1_TYPE_IDS`.
- Gate (spec §11.1): "`fixtures/**` validate with the same lint codes … `health` outputs equal" and (spec §10) the importer's output on the band's files equals `fixtures/shows/hilldale-literal`, `hilldale-collapsed`, `fixtures/venues/hilldale-v1.json` and `fixtures/settings.json` is not touched (the importer's settings are compared to the oracle report, not to `fixtures/settings.json`).
- Rust quality gate: `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `cargo test` all green; `pnpm allcheck` runs them (Task 1).
- Conventional Commits with a crate or package scope (`feat(ptah-model): …`, `test(model-tools): …`).
- No new runtime dependency on Node. The TypeScript side changes only to emit oracles and keep its tests green.

## Review Focus

Spec-implied inputs no task's tests would otherwise exercise, most likely to bite first; each has its pinning test added to the owning task:

1. A JSON file with a BOM or CRLF line endings (a show zipped on Windows): `invalid-json` must not fire; parse succeeds. → Task 9.
2. A show directory whose `programs/` holds a non-program JSON (a stray settings copy): the show's `missing-program` lints must still resolve the real programs and the stray file reports `schema` on its own, nothing panics. → Task 9.
3. An SMF with a tempo map but zero notes (an empty LIGHTS track), and one longer than 2^28 ticks: `read_smf` returns empty notes without error; `health` reports every mapped note as `unused-note`. → Tasks 10, 11.
4. A V1 show whose `programs` map names a program file that exists twice with different casing (`Red.json`, `red.json` on a case-insensitive disk): name resolution takes the first in sorted byte order and reports the other as dropped. → Task 13.
5. Store writes on a read-only directory or a full disk: `write_atomic` returns an error, never leaves a half-written target, and the temp file is removed. → Task 15.

---

## File structure

```
ptah-v2/
  Cargo.toml                      workspace: members = ["crates/*"], shared [workspace.dependencies], lints
  rust-toolchain.toml             channel = "stable", components rustfmt, clippy
  .cargo/config.toml              [alias] allcheck (fmt --check, clippy, test)
  crates/ptah-model/
    Cargo.toml
    src/lib.rs                    pub mod issue, types, schema, capabilities, ports, lint, tree, smf, health, patch, import, store
    src/issue.rs                  Issue, Level
    src/types/{mod,fixture_type,venue,program,show,settings}.rs   serde types (deny_unknown_fields), one file per entity
    src/schema.rs                 embedded schemas, validate(entity, &Value) -> Result<(), Vec<String>>
    src/capabilities.rs           Capability, capabilities_of(&Mode)
    src/ports.rs                  PORTS table (NodeType -> PortSet)
    src/lint/{mod,ids,fixture_type,settings,venue,program,show}.rs
    src/tree.rs                   validate_tree(root) -> Vec<TreeResult>
    src/smf.rs                    read_smf(&[u8]) -> Result<Timeline>
    src/health.rs                 health(&HealthInput) -> Vec<Issue>
    src/patch/{mod,fold,matching}.rs
    src/import/{mod,v1_shapes,v1_types,v1,collapse}.rs
    src/store/{mod,layout,atomic,migrate}.rs
    tests/oracles.rs              one #[test] per oracle file (lint issues, ports, health, patch, import, collapse)
    tests/fixtures_roundtrip.rs   every fixture file round-trips through the types
    tests/support/mod.rs          repo_root(), fixtures_dir(), read_json(), canonical(Value)
  crates/ptah/
    Cargo.toml                    [[bin]] name = "ptah"
    src/main.rs                   clap: check, import-v1 (more subcommands in 1B–1D)
    src/cmd/{check,import_v1}.rs
    tests/cli.rs                  runs the binary on fixtures and a tempdir
  packages/model-tools/src/scripts/write-model-oracles.ts     Task 2
  packages/model-tools/src/__tests__/model-oracles.test.ts    Task 2 drift guard
  fixtures/oracles/model/{lint-issues,ports,health,patch,import-report,collapse-report,import-settings}.json
  package.json                    allcheck also runs `cargo allcheck`
  .github/workflows/ci.yml        pnpm allcheck on ubuntu + macos
  docs/rust-workspace.md          crate map, how oracles gate the port, how to add a subcommand
```

---

### Task 1: Rust workspace, `ptah-model` and `ptah` skeletons, CI

**Files:**
- Create: `Cargo.toml`, `rust-toolchain.toml`, `.cargo/config.toml`, `crates/ptah-model/Cargo.toml`, `crates/ptah-model/src/lib.rs`, `crates/ptah-model/src/issue.rs`, `crates/ptah-model/tests/support/mod.rs`, `crates/ptah/Cargo.toml`, `crates/ptah/src/main.rs`, `crates/ptah/tests/cli.rs`, `.github/workflows/ci.yml`, `docs/rust-workspace.md`
- Modify: `package.json` (root), `.gitignore` (add `target/`), `biome.json` (ignore `target/`, `crates/`)

**Interfaces:**
- Produces: `ptah_model::issue::{Issue { level: Level, code: String, path: String, message: String }, Level { Error, Warning }}` with serde (`level` serialized as `"error"`/`"warning"`); `tests/support::{repo_root() -> PathBuf, fixtures_dir() -> PathBuf, read_json(&Path) -> serde_json::Value, canonical(&Value) -> String}` where `canonical` pretty-prints with sorted keys and two-space indent, trailing newline.
- Workspace dependencies pinned in the root `Cargo.toml`: `serde = { features = ["derive"] }`, `serde_json = { features = ["preserve_order", "float_roundtrip"] }`, `jsonschema`, `uuid = { features = ["v5"] }`, `thiserror`, `clap = { features = ["derive"] }`, `tempfile`.
- Workspace lints: `[workspace.lints.clippy] all = "warn", pedantic = "warn"` with `module_name_repetitions = "allow"`, `[workspace.lints.rust] unsafe_code = "forbid"` for `ptah-model`.
- Cargo alias `allcheck = "..."` is not expressible for a sequence; instead add root `package.json` script `"rust:allcheck": "cargo fmt --all --check && cargo clippy --all-targets -- -D warnings && cargo test --all"` and make `allcheck` run it last.

- [ ] **Step 1: Write the failing CLI test** in `crates/ptah/tests/cli.rs`

```rust
#[test]
fn version_prints_crate_version() {
    let out = std::process::Command::new(env!("CARGO_BIN_EXE_ptah")).arg("--version").output().unwrap();
    assert!(out.status.success());
    assert!(String::from_utf8_lossy(&out.stdout).contains(env!("CARGO_PKG_VERSION")));
}
```

and in `crates/ptah-model/tests/fixtures_roundtrip.rs` a placeholder that only proves the support module and fixtures path:

```rust
mod support;
#[test]
fn fixtures_dir_has_settings() {
    assert!(support::fixtures_dir().join("settings.json").is_file());
}
```

- [ ] **Step 2: Run to verify it fails**: `cargo test --all` → fails (no workspace / crates).
- [ ] **Step 3: Create the workspace files** listed above. `ptah` depends on `ptah-model` and `clap`; `main.rs` is a clap `Parser` with `#[command(version)]` and an empty `Commands` enum placeholder (`Check` and `ImportV1` arrive in Task 16; use a single `Noop` hidden subcommand so the enum compiles, or a struct without subcommands). `lib.rs` declares `pub mod issue;` only.
- [ ] **Step 4: Run** `cargo test --all` → both tests PASS; `cargo clippy --all-targets -- -D warnings` clean; `cargo fmt --all --check` clean.
- [ ] **Step 5: Wire the gates**: root `package.json` `allcheck` becomes `pnpm format && pnpm check && pnpm typecheck && pnpm test && pnpm rust:allcheck`; `.github/workflows/ci.yml` runs `pnpm i --frozen-lockfile` and `pnpm allcheck` on `ubuntu-latest` and `macos-latest` with `dtolnay/rust-toolchain@stable` and `pnpm/action-setup`. Add `target/` to `.gitignore`; add `"crates/**"` and `"target/**"` to biome's ignore so `pnpm format` passes. Write `docs/rust-workspace.md` (crate map from the File structure above, the oracle gating idea in three sentences, how to run each gate).
- [ ] **Step 6: Run** `pnpm allcheck` → green.
- [ ] **Step 7: Commit**: `chore(workspace): Rust workspace with ptah-model and ptah skeletons, CI`

---

### Task 2: Parity oracles emitted by `model-tools`

**Files:**
- Create: `packages/model-tools/src/scripts/write-model-oracles.ts`, `packages/model-tools/src/__tests__/model-oracles.test.ts`, `fixtures/oracles/model/lint-issues.json`, `fixtures/oracles/model/ports.json`, `fixtures/oracles/model/health.json`, `fixtures/oracles/model/patch.json`, `fixtures/oracles/model/import-report.json`, `fixtures/oracles/model/collapse-report.json`, `fixtures/oracles/model/import-settings.json`
- Modify: `packages/model-tools/package.json` (script `oracles:model`), `README.md` ("How Step 1 consumes this": add the model oracles), `docs/vm-instruction-set.md` §9 (one paragraph pointing to `fixtures/oracles/model/`)

**Interfaces:**
- Produces the oracle formats every later Rust test reads:
  - `lint-issues.json`: `{ files: { "<path relative to fixtures/, forward slashes>": Issue[] } }` from `validateTree(fixturesDir)`, **all levels**, each issue reduced to `{ level, code, path }` (messages dropped: they are free text), files in walk order.
  - `ports.json`: `{ "<nodeType>": { inputs: Port[], outputs: Port[] } }` exactly the `PORTS` table.
  - `health.json`: `{ cases: [{ name, show, venue, patchIndex, timeline: string|null, issues: Issue[] }] }` with `issues` reduced to `{ level, code, path, message }` (messages **kept** here: health messages are user-facing and the Rust port copies them) for these cases: `synthetic-on-a` (synthetic show, `venues/synthetic-a.json`, patch 0, `shows/synthetic/timeline.mid`), `synthetic-on-b` (venue B, patch 0, same timeline), `hilldale-literal` (`venues/hilldale-v1.json`, patch 0, no timeline), `hilldale-collapsed` (patch 1, no timeline), `synthetic-no-timeline` (venue A, patch 0, `null`).
  - `patch.json`: `{ fold: [{ positions, fixtures, expected }], order: [{ fixtures, expected }], propose: [{ show, venue, result }] }` using the exact inputs of `patch.test.ts` ("fold", "orderFixtures", "proposePatch" describe blocks) and `proposePatch` of the synthetic show on venues A and B.
  - `import-report.json`: `importV1(...).report` for `fixtures/v1/`; `collapse-report.json`: `collapse(...).report`; `import-settings.json`: `importV1(...).settings`.
- The drift-guard test regenerates in memory and deep-equals every file, as `v2-oracles.test.ts` does.

- [ ] **Step 1: Write the failing drift-guard test** `model-oracles.test.ts`: one `it` per oracle file, `expect(readJson(path)).toEqual(generate<name>())`, importing the generators from the script module (export the generator functions; the script's `main` only runs when `import.meta.url` is the entry).
- [ ] **Step 2: Run** `pnpm --filter @ptah-app/model-tools test -- model-oracles` → FAIL (files missing).
- [ ] **Step 3: Implement** `write-model-oracles.ts` with exported `generateLintIssues()`, `generatePorts()`, `generateHealth()`, `generatePatch()`, `generateImportReport()`, `generateCollapseReport()`, `generateImportSettings()` and a `main()` that writes each with `JSON.stringify(x, null, 2) + "\n"`. Add script `"oracles:model": "tsx src/scripts/write-model-oracles.ts"`.
- [ ] **Step 4: Run** `pnpm --filter @ptah-app/model-tools oracles:model` then the test → PASS. Check `lint-issues.json` contains at least one `warning` (the hilldale venue address overlaps or `duplicate-trigger`) and that `files` has one key per fixture file outside `v1/` and `oracles/`.
- [ ] **Step 5: Document** in README and `vm-instruction-set.md` §9.
- [ ] **Step 6: Run** `pnpm allcheck` → green. **Commit**: `test(model-tools): parity oracles for the Rust model port`

---

### Task 3: Entity types with serde round-trip

**Files:**
- Create: `crates/ptah-model/src/types/mod.rs`, `types/fixture_type.rs`, `types/venue.rs`, `types/program.rs`, `types/show.rs`, `types/settings.rs`
- Modify: `crates/ptah-model/src/lib.rs`, `crates/ptah-model/tests/fixtures_roundtrip.rs`

**Interfaces:**
- Produces Rust mirrors of every type in `packages/model-tools/src/types.ts` with the same JSON shape: `FixtureType, Mode, Channel, Role, Range, Venue, Universe, UniverseOutput, VenueFixture, Patch, Assignment, Fallback, FallbackStrategy, Program, Node, NodeType, Edge, Parameter, ParameterKind, OutputDecl, OutputType, Show, Group, Scene, SceneEntry, SceneValue, Instance, Route, Mapping, Trigger, Source, Binding, OverrideBinding, Song, Settings, Device`. Tagged unions use serde `tag = "kind"` / `tag = "type"` exactly as the schemas do; `Capability` is `enum { Intensity, Color, Strobe, Position, Beam, Channel { channel: u16 } }` with `#[serde(untagged)]` over a string enum and a struct. Every struct is `#[serde(deny_unknown_fields)]`; optional fields `#[serde(skip_serializing_if = "Option::is_none")]`. Numbers that the schema declares integer are `u16`/`u8`/`i32` per range; unit values are `f64`.
- Produces `pub fn entity_of(tag: &str) -> Option<Entity>` and `pub enum Entity { FixtureType, Venue, Program, Show, Settings }` with `Entity::schema_tag(self) -> &'static str` (`"fixtureType@1"`, …).

- [ ] **Step 1: Write the failing test** in `tests/fixtures_roundtrip.rs`: walk `fixtures/` (skipping `v1`, `oracles`), for each `.json` read the `Value`, pick the type by `schema` tag, deserialize into it, serialize back, and assert `canonical(&back) == canonical(&original)`; assert at least 30 files were checked. Add a second test: deserializing `{"schema":"settings@1","devices":[],"renderRateHz":44,"uiPort":1,"library":{"oflRefresh":"manual"},"extra":1}` into `Settings` fails (unknown field).
- [ ] **Step 2: Run** `cargo test -p ptah-model --test fixtures_roundtrip` → FAIL (types missing).
- [ ] **Step 3: Implement the types**, one file per entity, copying field names, optionality and enums from `types.ts` and the schemas (the schemas are authoritative for `required`). Keep field declaration order equal to the schema `properties` order.
- [ ] **Step 4: Run** the test → PASS for every fixture. If a fixture fails only because of float formatting (`1.0` vs `1`), the `canonical` helper normalizes numbers through `f64` before comparing; add that to `support` rather than loosening the test.
- [ ] **Step 5: Commit**: `feat(ptah-model): serde types for every Step 0 entity, round-trip on all fixtures`

---

### Task 4: Schema validation

**Files:**
- Create: `crates/ptah-model/src/schema.rs`
- Modify: `lib.rs`; test in `crates/ptah-model/tests/schema.rs` (create)

**Interfaces:**
- Produces `pub fn validate(entity: Entity, data: &serde_json::Value) -> Result<(), Vec<SchemaError>>` with `pub struct SchemaError { pub path: String, pub message: String }`; `path` is the instance JSON pointer, `"/"` for the root (same convention as `schemas.ts`). Schemas are embedded with `include_str!("../../../schemas/<name>.schema.json")` and registered under `ptah://schemas/<name>` so `$ref`s to `common` resolve.

- [ ] **Step 1: Write the failing tests** in `tests/schema.rs`: (a) every fixture file validates (`Ok(())`); (b) `{ "schema": "settings@1" }` yields exactly four errors (the four missing required properties, as the TS test asserts four `schema` issues); (c) a patch with `strategy: "teleport"` fails (mirror of `patch.test.ts` "rejects an unknown strategy"); (d) an error path for a nested violation is the pointer, e.g. a venue fixture with `address: 0` reports path `/fixtures/0/address`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** with the `jsonschema` crate, draft 2020-12, a `Retriever`/resource registry for the `ptah://` ids, `format` assertions enabled (the schemas use `uuid`, `date-time`). Build validators once in a `std::sync::OnceLock`.
- [ ] **Step 4: Run** → PASS. **Commit**: `feat(ptah-model): embedded JSON Schema validation with pointer paths`

---

### Task 5: Capabilities, ports table, `duplicate-id`, fixture-type and settings lints

**Files:**
- Create: `src/capabilities.rs`, `src/ports.rs`, `src/lint/mod.rs`, `src/lint/ids.rs`, `src/lint/fixture_type.rs`, `src/lint/settings.rs`; tests `tests/oracles.rs` (create, with the `ports` test) and unit tests inside each module

**Interfaces:**
- Produces `pub fn capabilities_of(mode: &Mode) -> Vec<Capability>` (exact rule of `capabilities.ts`: intensity if role intensity or any color role; color if rgb, cmy or white-only; strobe if strobe or shutter; position if pan and tilt; beam if zoom, focus or iris; then `{channel: i}` for every channel without `fineOf`, in channel order).
- `pub struct Port { name: &'static str, ty: PortType, default: Option<f64> }`, `pub struct PortSet { inputs: &'static [Port], outputs: &'static [Port] }`, `pub fn ports(node: NodeType) -> &'static PortSet`.
- `pub fn duplicate_ids<'a>(ids: impl Iterator<Item = &'a str>, path: &str) -> Vec<Issue>` (path `"<path>/<i>/id"`, error, first occurrence index in the message).
- `pub fn lint_fixture_type(t: &FixtureType) -> Vec<Issue>` (`channel-count-mismatch`, `fine-of-out-of-range`), `pub fn lint_settings(s: &Settings) -> Vec<Issue>` (`multiple-clock-masters` error, `no-enabled-device` warning). Paths exactly as the TS modules emit them; read `fixtureType.ts` and `lint/settings.ts` for the path strings and copy them.

- [ ] **Step 1: Write the failing tests**: in `tests/oracles.rs`, `ports_match_oracle` serializes the whole table (iterate all `NodeType` variants) and compares `canonical` to `fixtures/oracles/model/ports.json`; unit tests: `capabilities_of` on the five V1 library types (`fixtures/library/types/v1-*.json`) equals the expected lists derived by hand (`v1-dimmer` → `[intensity, {channel:0}]`; `v1-rgb` → `[intensity, color, {0},{1},{2}]`; `v1-rgbw` → `[intensity, color, {0..3}]`; `v1-rgb-dimmer` → `[intensity, color, {0..3}]`; `v1-rgbw-dimmer` → `[intensity, color, {0..4}]`), the mover type adds `strobe, position, beam` and skips fine channels; `lint_fixture_type` on `example-mover-16bit.json` is empty and on a copy with `fineOf: 99` yields one `fine-of-out-of-range`; `lint_settings` on `fixtures/settings.json` is empty, on two clock masters yields `multiple-clock-masters`, on all-disabled yields `no-enabled-device`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** the four modules.
- [ ] **Step 4: Run** → PASS. **Commit**: `feat(ptah-model): capabilities, ports table, id, fixture-type and settings lints`

---

### Task 6: Venue lint

**Files:**
- Create: `src/lint/venue.rs`; tests in `tests/oracles.rs` (extend) and module unit tests

**Interfaces:**
- Produces `pub fn fixture_channels(f: &VenueFixture, types: &HashMap<String, FixtureType>) -> Option<u16>` and `pub fn lint_venue(v: &Venue, types: &HashMap<String, FixtureType>) -> Vec<Issue>` with codes `duplicate-id`, `unknown-universe`, `unknown-type`, `unknown-mode`, `address-overflow`, `address-overlap`, `park-unsupported`. Copy the path strings and the level of each code from `lint/venue.ts`.
- Produces in `tests/oracles.rs` a shared helper `lint_oracle_for(relative_file: &str) -> Vec<ReducedIssue>` reading `lint-issues.json`, and `reduce(&[Issue]) -> Vec<ReducedIssue>` (`{level, code, path}`).

- [ ] **Step 1: Write the failing tests**: for each `fixtures/venues/*.json`, `reduce(lint_venue(..))` equals the oracle entry for that file (`lint-issues.json` was produced after schema validation, so run `validate` first and skip files that fail it, none should). Unit: a venue with a fixture at address 510 in a 4-channel mode → `address-overflow`; two fixtures overlapping in the same universe → one `address-overlap` warning, same addresses in different universes → none (Step 0 deferred minor, pinned here).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit**: `feat(ptah-model): venue lint with oracle parity`

---

### Task 7: Program lint

**Files:**
- Create: `src/lint/program.rs`; tests extend `tests/oracles.rs` and module unit tests

**Interfaces:**
- Produces `pub fn lint_program(p: &Program, programs: &HashMap<String, Program>) -> Vec<Issue>` with codes `duplicate-id`, `outputs-mismatch`, `unknown-node`, `unknown-parameter`, `port-out-of-range`, `port-type-mismatch`, `duplicate-input-edge`, `cycle`, `subgraph-recursion`, `missing-program`. Rules to carry from `lint/program.ts` and the Step 0 rulings: edges touching an `unknown` node are exempt from port checks; edges into `z1` are not dependencies for the cycle check; a `z1 → z1` self edge is not a cycle; duplicate edges on one input are a warning and the last wins; `subgraph` recursion includes a program referencing itself.
- Produces `pub fn topo_order(p: &Program) -> Result<Vec<usize>, CycleError>` (Kahn, ties by node file order), reused by plan 1B's compiler.

- [ ] **Step 1: Write the failing tests**: every program file under `fixtures/shows/*/programs/` matches its oracle entry; unit tests ported from `program.test.ts` by name: a cycle through two math nodes → `cycle`; a cycle through `z1` → none; a self-referencing subgraph → `subgraph-recursion`; an edge from an `unknown` node into a color port → no `port-type-mismatch`; two edges into one input → one `duplicate-input-edge` warning; `topo_order` on `fixtures/shows/synthetic/programs/…1000.json` places every edge source before its target.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit**: `feat(ptah-model): program lint and topological order with oracle parity`

---

### Task 8: Show lint

**Files:**
- Create: `src/lint/show.rs`; tests extend `tests/oracles.rs` and module unit tests

**Interfaces:**
- Produces `pub fn lint_show(show: &Show, programs: &HashMap<String, Program>) -> Vec<Issue>` with the codes listed in `docs/schemas.md` for show; `pub fn required_capabilities(show: &Show, programs: &HashMap<String, Program>) -> HashMap<String /*groupId*/, Vec<Capability>>` (union of `group.requires` and what instances and scenes use, the Step 0 ruling); `pub fn cap_key(c: &Capability) -> u32` for stable ordering as `lint/show.ts` does.

- [ ] **Step 1: Write the failing tests**: every `fixtures/shows/*/show.json` matches its oracle entry (programs loaded from the sibling `programs/` directory); unit tests ported from `show.test.ts` by name for: `member-out-of-range`, `member-offset-out-of-range`, `range-exceeds-group` (counts `memberOffset`, warning), `inverted-range`, `range-needs-per-member`, `route-capability-mismatch`, `route-slot-unknown`, `duplicate-trigger` (same trigger and instance, warning), `missing-scene`; `required_capabilities` on the synthetic show equals the hand-derived map used in `patch.test.ts` "unions group.requires with what instances use".
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit**: `feat(ptah-model): show lint and required capabilities with oracle parity`

---

### Task 9: `validate_tree` and the fixtures gate

**Files:**
- Create: `src/tree.rs`; test `tests/tree.rs` (create); extend `tests/oracles.rs` with `lint_issues_match_oracle`

**Interfaces:**
- Produces `pub struct TreeResult { pub file: PathBuf, pub issues: Vec<Issue> }` and `pub fn validate_tree(root: &Path) -> Vec<TreeResult>`: walk as `validateTree.ts` (sorted byte order, skip `v1` and `oracles` dirs, `.json` only), `invalid-json`, `unknown-schema`, `schema` (one issue per schema error, path = the error's pointer), lint by entity with the same context loading (`library/types` for venues, sibling directory for programs, `programs/` for shows), `lint-failed` if a lint panics (`catch_unwind`).
- `pub fn read_json_lossy(path) -> Result<Value, String>` strips a UTF-8 BOM and accepts CRLF (Review Focus 1).

- [ ] **Step 1: Write the failing tests**: `lint_issues_match_oracle`: `validate_tree(fixtures_dir())` reduced per file (paths relative, forward slashes) equals `lint-issues.json` **in full** (same files, same order, same issues); `tests/tree.rs` ports "reports unknown tags and bad files without throwing" with the exact expected code lists `[["unknown-schema"],["invalid-json"],["schema"×4]]`; Review Focus 1: a settings file written with a BOM and CRLF has no issues; Review Focus 2: a show dir whose `programs/` contains a copy of `settings.json` lints the show without `missing-program` for its real programs and the stray file reports `schema` or lints as settings (it has a valid tag, so it lints as settings cleanly, and the show's program map must ignore it because its `schema` is not `program@1`).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS, and `cargo test --all` green. **Step 5: Commit**: `feat(ptah-model): validate_tree with full lint parity on fixtures`

---

### Task 10: SMF reader

**Files:**
- Create: `src/smf.rs`; tests in the module and `tests/smf.rs` (create)

**Interfaces:**
- Produces `pub struct Timeline { pub ppq: u16, pub tempo: Vec<TempoEvent { tick: u64, bpm: f64 }>, pub notes: Vec<NoteEvent { channel: u8, note: u8, start_tick: u64, end_tick: u64, velocity: u8 }>, pub ccs: Vec<CcEvent { channel: u8, cc: u8, tick: u64, value: u8 }>, pub program_changes: Vec<ProgramChange { channel: u8, program: u8, tick: u64 }> }` mirroring `midi/smf.ts` (`channel` is 1-based as there), and `pub fn read_smf(bytes: &[u8]) -> Result<Timeline, SmfError>`. Same semantics as the TS reader: formats 0 and 1, running status, velocity-0 note-off, sysex cancels running status (a bare data byte after sysex is an error), tempo from meta 0x51 as `60_000_000 / µs` (compare to 3 decimals in tests), tracks merged and sorted by tick (stable).

- [ ] **Step 1: Write the failing tests**: ports of `health.test.ts` "readSmf" and "readSmf edge cases" by name (synthetic `timeline.mid`: same counts the TS test asserts; running status / velocity-0 / sysex; tempo meta; minimal format 0; sysex then bare data byte → `Err`); the replay fixture `fixtures/v1/replay/HILLDALE-LIGHTS-rendered.mid` reads to `ppq 960`, `47` tempo events, `9151` notes, `128064` CCs with per-CC counts `{0: 89472, 1: 31088, 2: 2416, 3: 5088}`; Review Focus 3: a hand-built file with one tempo event and no notes returns empty `notes` and `Ok`; a delta time encoded in 4 VLQ bytes (tick beyond 2^28) is read correctly.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit**: `feat(ptah-model): SMF reader with parity on the synthetic and replay files`

---

### Task 11: Health

**Files:**
- Create: `src/health.rs`, `src/patch/mod.rs`, `src/patch/matching.rs` (only `same_cap`, `has_all`, `union_capabilities` needed here; `propose_patch` comes in Task 12); extend `tests/oracles.rs`

**Interfaces:**
- Produces `pub struct HealthInput<'a> { show, programs: &HashMap<String, Program>, venue, patch: &Patch, types: &HashMap<String, FixtureType>, timeline: Option<&Timeline> }` and `pub fn health(input: &HealthInput) -> Vec<Issue>` with the codes of `docs/schemas.md` (patch section). **Messages are copied verbatim** from `health.ts` (the oracle keeps them).
- `pub fn same_cap(a, b) -> bool`, `pub fn has_all(have: &[Capability], need: &[Capability]) -> bool`, `pub fn union_capabilities(a: &[Capability], b: &[Capability]) -> Vec<Capability>` (order as the TS helper).

- [ ] **Step 1: Write the failing test** `health_matches_oracle`: for each case in `health.json`, load the named files (timeline via `read_smf` when not null), run `health`, compare the full `{level, code, path, message}` list in order; Review Focus 3: the synthetic show with a timeline that has no notes yields one `unused-note` per note mapping (count equals the number of note-kind mappings).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** by porting `health.ts` top to bottom, keeping the issue emission order.
- [ ] **Step 4: Run** → PASS. **Step 5: Commit**: `feat(ptah-model): health check with oracle parity`

---

### Task 12: Patch folding and proposal

**Files:**
- Create: `src/patch/fold.rs`; extend `src/patch/matching.rs` with `propose_patch`; extend `tests/oracles.rs`

**Interfaces:**
- Produces `pub fn order_fixtures(fixtures: &[&VenueFixture], universes: &[Universe]) -> Vec<&VenueFixture>` (position.x, then universe number, then address; without positions: universe then address), `pub fn fold(positions: usize, fixtures: &[String]) -> Vec<Option<Vec<String>>>` with the Step 0 rules (equal → one each; more fixtures → contiguous runs, tuples; fewer → cycle, so venue B gives `[a,b,c,d,a,b,c,d]`; `any` → one per fixture; none → nulls) and `pub fn propose_patch(show: &Show, programs: &HashMap<String, Program>, venue: &Venue, types: &HashMap<String, FixtureType>) -> Patch` (requirements = `required_capabilities`; fixtures not reused across groups; unfillable → null positions and an `ignore` fallback; `any` unfillable → empty members).

- [ ] **Step 1: Write the failing test** `patch_matches_oracle`: `fold`, `order` and `propose` sections of `patch.json` all equal.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** by porting `patch/fold.ts` and `patch/match.ts`. **Step 4: Run** → PASS. **Step 5: Commit**: `feat(ptah-model): patch fold and proposal with oracle parity`

---

### Task 13: V1 importer

**Files:**
- Create: `src/import/mod.rs`, `src/import/v1_shapes.rs`, `src/import/v1_types.rs`, `src/import/v1.rs`; test `tests/import_v1.rs` (create); extend `tests/oracles.rs`

**Interfaces:**
- Produces `pub mod v1_shapes` with serde types for V1 files (`V1Settings`, `V1Show`, `V1ShowFixture`, `V1PatchEntry`, `V1Program`, `V1Node` as an enum of the nine known types plus `Other { type, rest: Map }` via `#[serde(untagged)]` fallback, `V1Edge`), tolerant of unknown fields (no `deny_unknown_fields` here: V1 files carry `position`, `version`).
- `pub const V1_NAMESPACE: Uuid`, `pub const V1_TYPE_IDS`, `V1_PROFILE_ROLES` as in `v1-types.ts`.
- `pub struct ImportV1Input { settings: V1Settings, show: V1Show, programs: Vec<(String /*file name*/, V1Program)> }`, `pub struct ImportV1Result { settings: Settings, venue: Venue, show: Show, programs: Vec<Program>, report: ImportReport }`, `pub fn import_v1(input: &ImportV1Input) -> ImportV1Result`. `ImportReport` mirrors `ImportReport` in `v1.ts` field for field and serializes identically.
- `pub fn vid(name: &str) -> Uuid` = UUID v5 over `V1_NAMESPACE`.

- [ ] **Step 1: Write the failing tests**: `import_matches_fixtures`: run on `fixtures/v1/` (programs sorted by file name as the TS script does) and assert `canonical(show) == canonical(fixtures/shows/hilldale-literal/show.json)`, each program equals its file under `programs/`, `venue` equals `fixtures/venues/hilldale-v1.json` **with `patches` truncated to its first element** (the fixture's second patch comes from collapse, Task 14), `settings` equals `import-settings.json`, `report` equals `import-report.json`; port by name the `import-v1.test.ts` cases that construct their own V1 input: "drops the back edge of a cycle", "drops patch entries for unknown fixtures without throwing", "imports every cc parameter with smoothingMs 0", "drops edges into ports V2 does not have", "reports input-controls sharing a controlId", "widens the range of input-control defaults above 127", "skips mappings whose program name has no file", "keeps only the last edge on an input", "scopes group, instance and mapping ids to the show", "returns settings with the V1 virtual port as the clock master"; Review Focus 4: two program files `Red.json` and `red.json` whose contents share the same `name` → the first in byte order (`Red.json`) resolves the name, and the mapping is **not** dropped; the report keeps its shape, and the duplicate is recorded in `droppedMappings` with reason `duplicate program name <name>: kept <file>` only when the two files also differ in content. Add the same case to `import-v1.test.ts`, implement it in `v1.ts` if it does not already behave so, and regenerate the model oracles in this task.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** by porting `import/v1.ts` function by function in file order (helpers first), reproducing every `vid` name string and every report reason string verbatim. If the TS side needs the Review Focus 4 rule, add it to `v1.ts` with its test, regenerate `fixtures/oracles/model/*` and the hilldale fixtures (`pnpm --filter @ptah-app/model-tools exec tsx src/scripts/write-hilldale-import.ts --collapse`), and confirm `pnpm allcheck` stays green.
- [ ] **Step 4: Run** → PASS. **Step 5: Commit**: `feat(ptah-model): V1 importer reproducing the HILLDALE literal fixtures`

---

### Task 14: Collapse

**Files:**
- Create: `src/import/collapse.rs`; extend `tests/import_v1.rs` and `tests/oracles.rs`

**Interfaces:**
- Produces `pub fn graph_signature(p: &Program) -> String` (stable JSON with sorted keys, same content as `collapse.ts`'s `stable`), `pub fn routing_shape(i: &Instance) -> String`, `pub fn is_collapsible(show, programs) -> bool`, `pub fn collapse(show: &Show, programs: &[Program]) -> (Show, Vec<Program>, CollapseReport)`, `pub fn collapse_patch(patch: &Patch, report: &CollapseReport, old_show: &Show, new_show: &Show) -> Patch`.

- [ ] **Step 1: Write the failing tests**: `collapse_matches_fixtures`: collapsed show and programs equal `fixtures/shows/hilldale-collapsed/**`, `collapse_patch(literal_patch, …)` equals the second patch of `fixtures/venues/hilldale-v1.json`, the report equals `collapse-report.json`; port by name from `collapse.test.ts` the cases that construct inputs: contiguous notes → `noteRange`; alternating shapes → `midi.note` per member with `memberOffset`; differing bindings are not merged; the collapsed show id differs from the literal one.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit**: `feat(ptah-model): collapse pass reproducing the HILLDALE collapsed fixtures`

---

### Task 15: Store: layout, atomic writes, migrations, V1 source detection

**Files:**
- Create: `src/store/mod.rs`, `src/store/layout.rs`, `src/store/atomic.rs`, `src/store/migrate.rs`; test `tests/store.rs` (create)

**Interfaces:**
- `pub struct Layout { root: PathBuf }` with `Layout::new(root)`, `default_root() -> PathBuf` (`$PTAH_HOME` else `~/.ptah`), `settings()`, `type_file(id)`, `venue_file(id)`, `show_dir(id)`, `show_file(id)`, `program_file(show_id, program_id)`, `backup_file(entity: Entity, id, schema_tag)`, `runtime_dir()` (`runtime/`, for plan 1C), `v1_sources() -> Option<V1Sources { settings: PathBuf, shows: Vec<PathBuf>, programs: Vec<PathBuf> }>` detecting `.ptah-settings.json`, flat `shows/*.json` (files, not the V2 show directories) and flat `programs/*.json` under the same root. `Layout` exposes no method that writes to a V1 path.
- `pub fn write_atomic(path: &Path, bytes: &[u8]) -> io::Result<()>`: temp file in the same directory, write, `sync_all`, rename; on any error remove the temp file and leave the target as it was.
- `pub trait Migration { fn from_version(&self) -> u32; fn up(&self, v: Value) -> Result<Value, MigrateError>; }` and `pub fn load_entity(layout: &Layout, entity: Entity, path: &Path, chain: &[Box<dyn Migration>]) -> Result<(Value, bool /*migrated*/), LoadError>`: parses the schema tag `<entity>@<n>`, applies the chain from `n` upward, on a change writes a backup to `backup_file(entity, id, old_tag)` then the upgraded file atomically, then validates with `schema::validate`. Chains are empty in Step 1 (all `@1`); the mechanism is tested with a fake `@0 → @1` migration.
- `pub fn load_tree(layout: &Layout) -> Result<Loaded { settings, types, venues, shows: Vec<LoadedShow { show, programs }> }, Vec<TreeResult>>` using `validate_tree` semantics on the V2 directories only.

- [ ] **Step 1: Write the failing tests** on a `tempfile::tempdir()` root: layout paths equal the Step 0 layout strings; `v1_sources` finds a planted `.ptah-settings.json`, `shows/HILLDALE.json`, `programs/red.json` and ignores `shows/<uuid>/show.json`; `write_atomic` then read equals; Review Focus 5: `write_atomic` into a directory made read-only (`chmod 0o500`, skipped on Windows) returns `Err`, the directory holds no leftover temp file and a pre-existing target is unchanged; `load_entity` with a fake migration on a `settings@0` file writes `.backups/settings/<id>.settings@0.json`, rewrites the file as `settings@1`, returns `migrated == true`, and a second load returns `migrated == false`; `load_tree` on a copy of `fixtures/` (minus `v1`, `oracles`) loads 4 venues, 8 types, 4 shows with their programs.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit**: `feat(ptah-model): ~/.ptah layout, atomic writes, migrations, V1 source detection`

---

### Task 16: `ptah check` and `ptah import-v1`

**Files:**
- Create: `crates/ptah/src/cmd/mod.rs`, `cmd/check.rs`, `cmd/import_v1.rs`; extend `crates/ptah/src/main.rs`, `crates/ptah/tests/cli.rs`; modify `README.md` (a "Rust workspace" section: build, `ptah check`, `ptah import-v1`), `docs/rust-workspace.md`

**Interfaces:**
- `ptah check [ROOT] [--json]`: `ROOT` defaults to `default_root()`; runs `validate_tree`; human output one line per issue `"<level> <file>:<path> <code>: <message>"` sorted as produced; `--json` prints `TreeResult[]` as JSON; exit code 0 when no error-level issue, 1 otherwise, 2 on IO failure. With `--health <showId> --venue <venueId> [--patch N]` it also runs `health` for that pair (timeline read from `show.timeline.file` relative to the show directory when present).
- `ptah import-v1 [--from V1_ROOT] [--to ROOT] [--collapse] [--dry-run]`: reads `v1_sources()` from `--from` (default `default_root()`), imports every V1 show (one `ImportV1Input` per show file, all programs), optionally collapses, writes the V2 layout under `--to` (default the same root) with `write_atomic`, never under a V1 path, prints the `ImportReport` (and `CollapseReport`) as JSON to stdout; `--dry-run` prints without writing; exit 1 if any produced file fails `validate_tree`.

- [ ] **Step 1: Write the failing CLI tests**: `check_fixtures_is_clean`: `ptah check <fixtures dir> --json` exits 0 and the parsed output, reduced, equals `lint-issues.json` (yes, a third time, through the binary); `check_reports_errors`: on a tempdir with a `{ "schema": "nope@1" }` file exits 1 and prints `unknown-schema`; `import_v1_reproduces_fixtures`: copy `fixtures/v1/{settings.json→.ptah-settings.json, HILLDALE.json→shows/HILLDALE.json, programs/}` into a tempdir, run `ptah import-v1 --from <tmp> --to <tmp>/v2 --collapse`, then assert `shows/<literal id>/show.json` and `shows/<collapsed id>/show.json` canonical-equal the fixtures, the venue file equals `fixtures/venues/hilldale-v1.json`, `settings.json` equals `import-settings.json`, **and the V1 files in `<tmp>` are byte-identical to before** (hash before and after); `ptah check <tmp>/v2` exits 0.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** the two subcommands. **Step 4: Run** → PASS; `pnpm allcheck` green. **Step 5: Docs**: README and `docs/rust-workspace.md` (commands, exit codes, where the oracles live, what plan 1B adds next). **Step 6: Commit**: `feat(ptah): check and import-v1 subcommands`

---

## Self-review notes

- Spec coverage for 1A: §3 constraints (platform, files, V1 never written, lint parity) → Tasks 1, 9, 15, 16; §4.1 `ptah-model` responsibilities (types, validation, lint with same codes, layout, identity, migrations, importer) → Tasks 3–9, 13–15; §10 (layout, runtime dir, importer verified against fixtures) → Tasks 15, 16, 13, 14; §11.1 (fixtures validate with same codes, health equal, `all-fixtures.test.ts` ported) → Tasks 9, 11. Not in 1A by design: VM, clock, oracles `v1-traces`/`v2-traces`/`v2-render`, `channelMap` (plan 1B); everything runtime (1C); API, TUI, replay, play-midi (1D).
- Type consistency: `Entity` (Task 3) is used by Tasks 4, 9, 15; `Capability` (Task 3) by 5, 8, 11, 12; `Issue` (Task 1) everywhere; `Timeline` (Task 10) by 11 and 16; `required_capabilities` (Task 8) by 12; `validate_tree` (Task 9) by 15 and 16; `vid` (Task 13) by 14.
- Oracle completeness: Task 2 must run **before** any Rust lint task; Task 13 may regenerate oracles once (Review Focus 4) and must say so in its report.
- Proportion: this plan is about one third the length of the spec section it implements plus the Step 0 modules it ports, and holds no function bodies.
