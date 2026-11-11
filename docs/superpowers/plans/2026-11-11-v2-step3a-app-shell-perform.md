# PTAH V2 Step 3A — App Shell and the Perform Page on the Engine: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One command (`ptah`) supervises the engine, serves the web app from the binary and opens the browser on a readiness checklist; the owner confirms the show and the 2C Perform page runs live, with Restart, Reload, Blackout, Freeze and switch show wired, on the laptop and the phone.

**Architecture:** The engine gains a waiting start (`ptah run --wait`), a supervised restart (exit 75, `POST /api/v1/restart`), a server block (`GET /api/v1/server`), per-device `lastMessageAt`, and an embedded static app. The design system gains a public `perform` entry (the 2C page moved out of the stories), a `Checklist`, a `ShowPicker`, a `PhoneLink` (QR) and a `Shell`, all with stories under the 2C gates. A thin `apps/web` Vite app wires them to the engine (routing, data fetching, the `Rig`, commands) and is proven end to end with Playwright against the real binary with fake I/O.

**Tech Stack:** Rust (axum 0.8, clap 4, `include_dir`), React 19.3.1, TypeScript strict, Vite 6.4.5, Vitest 3, Playwright 1.59.1, Storybook 8.6.19, Biome 2.5.15, pnpm 9.15.4.

**Spec:** `docs/superpowers/specs/2026-11-11-v2-step3a-app-shell-perform-design.md` (V1 repo). Code lives in `~/projects/ptah-v2`; contracts in `ptah-v2/docs/engine.md`, `docs/api.md`, `docs/design-system.md`.

## Global Constraints

- Repo `~/projects/ptah-v2`, branch `step3a-app-perform` from `master` (tag `step2c-complete`). V1 (`~/projects/ptah`) is never modified by this plan.
- React 19, TypeScript strict, Vite, **Biome only** (no ESLint, no Prettier), Base UI only through `@ptah-app/ds`, styling through tokens only (`var(--…)`; no literal colours, sizes or shadows in app or ds CSS), motion 80/120/200 ms with the ds easing, no shadows but the focus ring, touch targets ≥ 44 px, every screen in normal and stage mode.
- The 2C rules bind every new composition: calm when well, loud only when wrong, **nothing shifts when a value changes** (fixed-width status words, fixed-height rows, truncating text).
- New dependencies: **published ≥ 14 days before the day they are added, pinned exactly** (`"x.y.z"`, `= "x.y.z"` in Cargo), in `package.json` and `Cargo.toml` alike; check the publish date on npm / crates.io and record it in the commit message.
- Tests never touch `~/.ptah`: temporary roots through `--root` / `PTAH_HOME`; never start V1 services or pm2; no real MIDI or DMX hardware (`--fake-io`).
- Node ≥ 20.11, pnpm 9.15.4, Rust 1.93.0 (`rust-toolchain.toml`), `cargo clippy -- -D warnings` clean.
- Contracts extended, never forked: `docs/engine.md` and `docs/api.md` are updated in the task that changes the shape; one shape per thing.
- Commits: Conventional Commits with scopes (`feat(ptah)`, `feat(ds)`, `feat(web)`, `feat(server)`, `docs`).
- `pnpm allcheck` green at the end of every task (the merge gate while GitHub Actions is billing-blocked).
- Copy on screens: the spec's words exactly (`waiting for Reaper`, `Reaper connected`, `locked`, `not sending`, `L to load`, `Restart with <venue>`, `local only`, `Not ready — N waiting`, `Ready to load — press L`).

## Review Focus

1. **Bound to `127.0.0.1` (`--local`)**: the Phone line must say `local only` with no QR, never a QR of a loopback URL. Test in Task 8 (`deriveChecklist` phone row) and Task 3 (`/server` urls empty).
2. **A refused `loadShow`** (unknown patch, `patch of another show`, `show cannot render`): a toast with the engine's message, the picker stays open, nothing else changes. Test in Task 11.
3. **The remembered show is gone from disk** (`currentShowId` names no show in `GET /shows`): the picker preselects nothing and the Show line reads `no show — L to choose`, no crash. Test in Task 8 and Task 9.
4. **The WebSocket drops during a restart** on the explicit port: the source reconnects (1, 2, 4 s…) and the page comes back without a reload, the band playing `restarting` → `not in sync` → well. Test in Task 12 (e2e).
5. **A tree with zero shows**: the picker shows the ds `EmptyState` (`No shows. Import V1 with ptah import-v1.`) and Enter does nothing. Test in Task 9.

---

### Task 1: The `perform` entry of the design system

**Files:**
- Move: `packages/ds/src/stories/perform/{Perform,DetailColumn,DmxStrip,Emergency,HoldButton,LatencyRow,MidiBlock,Programs,SongBlock,StatusBand,StatusWords}.tsx` → `packages/ds/src/perform/`; `packages/ds/src/stories/Perform.module.css` → `packages/ds/src/perform/Perform.module.css`
- Create: `packages/ds/src/perform/index.ts`, `packages/ds/src/perform/rig.ts` (the pure part of the old `rig.ts`)
- Modify: `packages/ds/src/stories/perform/rig.ts` (keeps the fixture imports, `TYPES`, `SYNTHETIC`, `LARGE`; imports `rigOf` from `../../perform/rig`), `packages/ds/src/stories/Perform.stories.tsx` (imports), `packages/ds/src/stories/perform/scenario.ts` (imports), `packages/ds/vite.config.ts` (entry `perform`), `packages/ds/package.json` (`exports["./perform"]`), `packages/ds/src/__tests__/build.test.ts` (the entry list), `packages/ds/src/__tests__/docs.test.ts` if it enumerates entries, `docs/design-system.md` ("Perform, assembled": the entry)
- Test: `packages/ds/src/stories/__tests__/rig.test.ts`, `packages/ds/src/__tests__/build.test.ts`

**Interfaces:**
- Produces: `@ptah-app/ds/perform` exporting `Perform`, `PerformProps`, `PerformCommand`, `Rig`, `RigUniverse`, `rigOf(show: ShowFile, venue: { universes: Universe[]; fixtures: VenueFixture[] }, types: ReadonlyMap<string, FixtureType>): Rig` (`types` **required**), `modeOf`, `postCommand`, `getDevices`. `PerformProps` gains `onRestart?: () => Promise<unknown>` (default: none → the Restart hold is disabled with the toast `Restart needs ptah supervise`), and the `restart` palette command calls it.
- No fixture JSON is reachable from `src/perform/` (the stories keep them).

- [ ] **Step 1: Write the failing tests**

In `packages/ds/src/__tests__/build.test.ts` add to the entry expectations: `perform` builds to `dist/perform.js` and `dist/types/perform/index.d.ts`, and `dist/perform.js` contains neither `synthetic` nor `hilldale` (grep the bundle text). In `rig.test.ts`: `rigOf(show, venue, new Map())` marks every fixture unlit (mode `channelCount 0`) and warns once.

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm -F @ptah-app/ds test -- rig build`
Expected: FAIL (no `perform` entry; `rigOf` has a default `types`).

- [ ] **Step 3: Move the files and add the entry**

`git mv` the components; split `rig.ts` so `src/perform/rig.ts` holds the types, `modeOf`, `unknownMode`, `rigOf` with `types` required; the story `rig.ts` keeps the JSON imports and exports `TYPES`, `SYNTHETIC`, `LARGE`, re-exporting `rigOf` with `TYPES` bound for the stories. Add `perform: resolve(src, "perform/index.ts")` to the Vite `entry` map and the `./perform` export (same shape as `./live`). Add `onRestart` to `PerformProps` and route the `restart` palette command and the Restart hold through it (disabled + toast without it).

- [ ] **Step 4: Run the package gates**

Run: `pnpm -F @ptah-app/ds build && pnpm -F @ptah-app/ds test && pnpm -F @ptah-app/ds typecheck && pnpm -F @ptah-app/ds test:storybook && pnpm -F @ptah-app/ds test:visual`
Expected: all PASS, visual boards 0.000 % (a pure move changes no pixel).

- [ ] **Step 5: Commit**

```bash
git add -A packages/ds docs/design-system.md
git commit -m "refactor(ds): Perform page moves to the public perform entry; rigOf takes its types"
```

---

### Task 2: `ptah run --wait`, `--supervised`, exit 75 and the supervisor's first-child rule

**Files:**
- Modify: `crates/ptah/src/cmd/run.rs` (flags, the no-show start, `EXIT_RESTART = 75`), `crates/ptah/src/cmd/supervise.rs` (first child only gets `--wait`; every child gets `--supervised`; 75 = requested restart, not counted, level 0, `restart_delay`), `crates/ptah-engine/src/loader.rs` (`StartRequest.wait: bool`: level 0 with no show build and no resume; no `engine.degraded` fault), `crates/ptah-engine/src/engine.rs` (`EngineConfig.wait: bool`), `docs/engine.md` (`ptah run` flags table, supervise section, exit codes), `README.md` (the `ptah run` / `ptah supervise` headings)
- Test: `crates/ptah/tests/cli.rs`, `crates/ptah-engine/tests/` (the start-up suite that covers degradation levels)

**Interfaces:**
- Produces: `ptah run --wait` (no show loaded, level 0, `GET /status` `engine.degradation == 0`, `engine.showLoaded == false`, `GET /show-info` 404 until a `loadShow`); `ptah run --supervised` (hidden; accepted, read by Task 3); exit code **75** from `ptah run` means "restart requested"; `ptah supervise [--wait] RUN_ARGS` passes `--wait` to its first child only and `--supervised` to every child; a child exiting 75 is restarted after `restart_delay` at level 0 and **does not** increment the crash count; stderr line `ptah supervise: ptah run asked for a restart after T ms; restarting in D ms at degradation 0`.
- `pub const EXIT_RESTART: i32 = 75;` in `run.rs`.

- [ ] **Step 1: Write the failing CLI tests**

In `crates/ptah/tests/cli.rs`, following `run_serves_the_api_on_the_ui_port` and `supervise_restarts_a_crashing_child_with_backoff_and_degradation`:

```rust
#[test]
fn run_wait_starts_with_no_show_at_level_0() {
    // ptah run --wait --fake-io --ui-port 0 --root <synthetic root> (show and venue remembered)
    // GET /status: engine.degradation == 0, engine.showLoaded == false; no fault engine.degraded
    // GET /show-info -> 404
    // POST /commands loadShow {synthetic show, synthetic venue} -> ok; then GET /show-info 200
}

#[test]
fn supervise_passes_wait_to_the_first_child_only_and_restarts_on_75() {
    // ptah supervise --wait --restart-delay-ms 10 --max-restarts 1 --root R --fake-io --exit-after-ms 300 --exit-code 75
    // (new hidden run flags for tests: --exit-after-ms MS exits with --exit-code N once the API serves)
    // stderr: first child line contains "--wait"? No: assert via the children's own stderr lines
    //   "ptah run: waiting for a show" (first child) and "ptah run: show <id> on venue <id>" (second)
    // decisions(): [(10, 0)] and the line says "asked for a restart", not "exited"
    // runtime/supervisor.log holds both
}
```

Use the test's own hidden flags `--exit-after-ms MS` and `--exit-code N` (added in this task, hidden, tests only) rather than a crash.

- [ ] **Step 2: Run to verify they fail**

Run: `cargo test -p ptah --test cli run_wait supervise_passes_wait`
Expected: FAIL (unknown argument `--wait`).

- [ ] **Step 3: Implement**

`RunArgs` gains `wait: bool` (long, documented), `supervised: bool` (hidden), `exit_after_ms: Option<u64>` and `exit_code: Option<i32>` (hidden, tests). With `wait`: the show/venue check requires only a readable tree (venue optional); stderr prints `ptah run: waiting for a show on venue <id or ->`; `EngineConfig.wait = true` → `StartRequest.wait = true` → the loader starts no show and runs no resume, at level 0, raising no fault. `supervise.rs`: `SuperviseArgs.wait: bool` (long); the first spawn appends `--wait`, every spawn appends `--supervised`; on status 75 log the "asked for a restart" line, sleep `restart_delay`, respawn at level 0 without touching the crash counter or the 60 s window.

- [ ] **Step 4: Run the Rust gates**

Run: `cargo test -p ptah -p ptah-engine && cargo clippy --all-targets -- -D warnings && cargo fmt --all --check`
Expected: PASS.

- [ ] **Step 5: Update `docs/engine.md` and `README.md`** (flags table rows for `--wait`, `--supervised`, `--exit-after-ms`/`--exit-code`; exit code 75; the first-child rule and the 75 row in the supervise table). Run `cargo test -p ptah --doc` if docs are doctested.

- [ ] **Step 6: Commit**

```bash
git add crates docs/engine.md README.md
git commit -m "feat(ptah): run --wait starts with no show; supervise restarts a child that exits 75 without counting it"
```

---

### Task 3: `POST /api/v1/restart`, `GET /api/v1/server`, `lastMessageAt`

**Files:**
- Create: `crates/ptah-server/src/http/server.rs` (the two handlers), `crates/ptah-server/src/restart.rs` (`RestartRequest`)
- Modify: `crates/ptah-server/src/lib.rs` (`ServerConfig { supervised: bool, venue_id: Option<String>, version: &'static str }`, `ServerHandle::take_restart() -> Option<RestartRequest>`), `crates/ptah-server/src/state.rs` (`Shared.restart: Mutex<Option<RestartRequest>>`, `supervised`, `venue_id`, `listen`), `crates/ptah-server/src/http/mod.rs` (routes), `crates/ptah-server/src/http/status.rs` (`DeviceView.last_message_at: Option<u64>`), `crates/ptah-engine/src/devices.rs` (`last_message: Vec<AtomicU64>`, `note_message(index: u16, at_ns: u64)`, `last_message_at(index) -> Option<u64>`), `crates/ptah-io/src/midi/backend.rs` (call `note_message` on every message of a port, clock and transport included), `crates/ptah/src/cmd/run.rs` (`serve` passes `supervised`, `venue_id`, version; `wait()` polls `take_restart()`; on a request: shutdown, then with `venue_id` write `currentVenueId` via `loader::remember`-style JSON edit and delete `journal_path(&layout)`, exit `EXIT_RESTART`), `Cargo.toml` workspace deps (an interface-enumeration crate, pinned, ≥ 14 days old), `docs/api.md`
- Test: `crates/ptah-server/tests/http.rs`, `crates/ptah/tests/cli.rs`, `crates/ptah-engine/src/devices.rs` unit tests

**Interfaces:**
- Produces: `POST /api/v1/restart` body `{}` or `{ "venueId": "<id>" }` → `202 { "ok": true }` when `supervised`, else `409 { "error": "no-supervisor", "message": "ptah run is not under ptah supervise" }`; a second request while one is pending → 202 again (idempotent). `GET /api/v1/server` → `{ "version": "<CARGO_PKG_VERSION>", "listen": "<ip:port>", "urls": [ "http://<ip>:<port>", … ] (non-loopback IPv4 of this host when bound to 0.0.0.0, else []), "supervised": bool, "venueId": string|null, "staticDir": "embedded" | "<path>" | null }`. `GET /api/v1/devices[].lastMessageAt: number|null` (engine ns).
- `pub struct RestartRequest { pub venue_id: Option<String> }`.

- [ ] **Step 1: Write the failing tests**

`crates/ptah-server/tests/http.rs` (using `support::TestServer`, started with `supervised: false` by default and a new `TestServer::start_supervised`):

```rust
#[test] fn restart_is_409_without_a_supervisor()            // 409 no-supervisor; take_restart() is None
#[test] fn restart_is_202_under_a_supervisor_and_hands_the_request_over()  // 202 {ok:true}; take_restart() == Some(RestartRequest{venue_id:None}); with {"venueId":"v"} → Some(.. "v")
#[test] fn the_server_block_names_the_bind_the_venue_and_the_mode()  // GET /server: listen == local_addr, urls == [] on 127.0.0.1, supervised false, venueId == synthetic venue, staticDir null
#[test] fn devices_carry_the_last_message_time()           // registry.note_message(0, 5_000); GET /devices[0].lastMessageAt == 5000; a device with none → null
```

`crates/ptah/tests/cli.rs`:

```rust
#[test] fn restart_under_supervise_exits_75_and_comes_back()  // supervise --restart-delay-ms 10 --max-restarts 1 --fake-io --ui-port <free port>: POST /restart → 202; the child exits 75 (stderr "asked for a restart"); GET /server answers again on the same port within 10 s
#[test] fn restart_with_a_venue_remembers_it_and_drops_the_journal()  // POST /restart {"venueId": SYNTHETIC_VENUE_B}: settings.json currentVenueId == B; runtime/journal file absent; the new child's stderr says "on venue <B>"
```

- [ ] **Step 2: Run to verify they fail**

Run: `cargo test -p ptah-server --test http restart server_block devices_carry && cargo test -p ptah --test cli restart_`
Expected: FAIL (404 on the routes; no `lastMessageAt`).

- [ ] **Step 3: Implement** the handlers, the `Shared` fields, `DeviceRegistry::note_message`, the MIDI backend call (one store per message, `Relaxed`), the `run.rs` wiring (exit 75 only after `running.shutdown()` returned, so the journal is final), the interface enumeration behind a small `fn host_urls(listen: SocketAddr) -> Vec<String>` in `server.rs` (loopback bind → empty).

- [ ] **Step 4: Run the Rust gates**

Run: `cargo test --all && cargo clippy --all-targets -- -D warnings && cargo fmt --all --check`
Expected: PASS.

- [ ] **Step 5: Update `docs/api.md`** (routes table: `/restart`, `/server`; `GET /devices` shape; the "Not in this API" list loses the restart item).

- [ ] **Step 6: Commit**

```bash
git add crates Cargo.toml Cargo.lock docs/api.md
git commit -m "feat(server): POST /restart under a supervisor, GET /server, per-device lastMessageAt"
```

---

### Task 4: The embedded app

**Files:**
- Create: `crates/ptah-server/build.rs` (copies `../../apps/web/dist` into `$OUT_DIR/web` when it exists, else writes `$OUT_DIR/web/index.html` = the placeholder `<!doctype html><title>PTAH</title><p>The web app is not built: run <code>pnpm build</code> and rebuild ptah.`; `cargo:rerun-if-changed=../../apps/web/dist`), `crates/ptah-server/src/http/app.rs` (the embedded service)
- Modify: `crates/ptah-server/Cargo.toml` (`include_dir`, pinned), `crates/ptah-server/src/lib.rs` (`router`: `--static-dir` → `ServeDir` with `index.html` fallback as today; else the embedded service at `/`), `docs/api.md` ("Pages")
- Test: `crates/ptah-server/tests/app.rs`

**Interfaces:**
- Produces: `GET /` and any path not under `/api/v1`, `/debug` → the embedded `index.html` (`Cache-Control: no-cache`); `GET /assets/<hashed>` → the file with its MIME type and `Cache-Control: public, max-age=31536000, immutable`; a path that matches no file falls back to `index.html` with 200 (client routing). `GET /server` `staticDir` = `"embedded"` in this mode.

- [ ] **Step 1: Write the failing tests** in `crates/ptah-server/tests/app.rs`: `the_root_serves_the_embedded_index`, `an_unknown_path_falls_back_to_the_index_for_client_routing` (`/venue` → 200, same body, `no-cache`), `assets_are_immutable` (skipped with a note when the placeholder is embedded: the test reads `$OUT_DIR` marker file `web/.placeholder` written by build.rs), `api_404_is_not_the_index` (`/api/v1/nope` → 404 JSON).

- [ ] **Step 2: Run to verify they fail**

Run: `cargo test -p ptah-server --test app`
Expected: FAIL (no fallback; 404 at `/`).

- [ ] **Step 3: Implement** `build.rs`, `app.rs` (`include_dir!("$OUT_DIR/web")`, MIME by extension: html, js, css, svg, woff2, png, json, ico, map), the router change.

- [ ] **Step 4: Run the Rust gates** (as Task 3 Step 4). Expected: PASS with the placeholder (no `apps/web` yet).

- [ ] **Step 5: Commit**

```bash
git add crates docs/api.md
git commit -m "feat(server): the web app is embedded and served at / with client-routing fallback"
```

---

### Task 5: Bare `ptah` and the settings keys

**Files:**
- Create: `crates/ptah/src/cmd/up.rs`
- Modify: `crates/ptah/src/main.rs` (`command: Option<Commands>`, `#[command(flatten)] up: cmd::up::UpArgs`; drop `arg_required_else_help`; `None` → `cmd::up::run(&cli.up)`; hidden subcommand `up` as the same), `crates/ptah/src/cmd/mod.rs`, `crates/ptah-model/src/types/settings.rs` (`listen: Option<bool>`, `open_browser: Option<bool>`), `schemas/settings.schema.json` (`"listen": { "type": "boolean", "default": true }`, `"openBrowser": { "type": "boolean", "default": true }`), `packages/model-tools` fixtures/tests if the schema is mirrored there, `crates/ptah/src/cmd/run.rs` (`listen_addr`: `--listen` or `settings.listen != Some(false)` when called from `up`; plain `ptah run` keeps `127.0.0.1` default), `docs/engine.md`, `README.md`
- Test: `crates/ptah/tests/cli.rs`, `crates/ptah-model` settings tests

**Interfaces:**
- Produces: `ptah [--root R] [--no-open] [--local] [--ui-port N] [--show ID] [--venue ID] [--patch N]`: writes the three `current*` keys when given (through the same JSON edit `loader::remember` uses, so other keys survive), prints `ptah: anyone on this network can control the lights; --local to restrict` (unless `--local` or `settings.listen == false`), then runs `supervise::run` in-process with `--wait --supervised --ui-port N` plus `--listen` unless local; a thread polls `GET http://127.0.0.1:<port>/api/v1/server` every 250 ms for up to 15 s and then prints `ptah: open http://127.0.0.1:<port>` and one `ptah: phone <url>` per `urls[]`, and opens the browser (`open` on macOS, `xdg-open` on Linux) unless `--no-open` or `settings.openBrowser == false`; the exit code is the supervisor's.
- `UpArgs` is `pub`; `cmd::up::run(&UpArgs) -> i32`.

- [ ] **Step 1: Write the failing tests**

```rust
#[test] fn bare_ptah_writes_the_preselection_and_prints_the_urls()  // ptah --root R --no-open --local --ui-port <free> --show S --venue V --fake-io? (fake-io is a run flag: UpArgs gains hidden `--fake-io` passed through) ; settings.json currentShowId == S; stderr has "ptah: open http://127.0.0.1:<port>" and no "phone" line; GET /server supervised == true; SIGTERM ends it 0
#[test] fn bare_ptah_warns_about_the_network_unless_local()          // without --local: stderr has "anyone on this network"; with --local: not
#[test] fn ptah_help_lists_the_subcommands_and_the_gig_flags()       // `ptah --help` exit 0 mentions "--no-open" and "supervise"
```

Settings: `listen`/`openBrowser` round-trip through the model and validate against the schema (existing settings tests' style).

- [ ] **Step 2: Run to verify they fail**

Run: `cargo test -p ptah --test cli bare_ptah ptah_help && cargo test -p ptah-model settings`
Expected: FAIL (bare `ptah` prints usage; unknown keys refused).

- [ ] **Step 3: Implement** `up.rs`, the `main.rs` shape, the settings fields and schema, the `listen` rule in `run.rs`.

- [ ] **Step 4: Run the Rust gates and the schema tests**

Run: `cargo test --all && cargo clippy --all-targets -- -D warnings && cargo fmt --all --check && pnpm -F @ptah-app/model-tools test`
Expected: PASS.

- [ ] **Step 5: Update `docs/engine.md`** (a `## ptah` section before `ptah run`), `README.md`, and the settings row in `docs/file-layout.md` if it lists keys.

- [ ] **Step 6: Commit**

```bash
git add crates schemas packages/model-tools docs README.md
git commit -m "feat(ptah): bare ptah supervises, serves, prints the URLs and opens the browser; settings listen/openBrowser"
```

---

### Task 6: The TUI's readiness header

**Files:**
- Modify: `crates/ptah/src/cmd/tui.rs` and its model module (the header rows), `docs/engine.md` (tui section)
- Test: `crates/ptah/tests/tui.rs`

**Interfaces:**
- Consumes: `GET /devices` (`present`, `clockMaster`, `lastMessageAt`), `GET /server`, the `state`, `clock`, `metrics`, `faults` topics.
- Produces: the header's seven lines with the checklist's words (`engine up · rt yes · level 0`, `show <name> loaded` / `show <name> — load it from the page`, `midi port waiting for Reaper` / `Reaper connected`, `clock locked 120.0`, `dmx U1 sending · U2 not sending`, `midi devices 1 / 1`, `phone http://…` / `phone local only`), 1 Hz refresh.

- [ ] **Step 1: Write the failing test** in `tests/tui.rs`, after `the_client_follows_a_served_engine`: `the_header_says_what_is_ready` — against a `TestServer` under `--wait` semantics (no show): header contains `waiting for Reaper`, `show` line contains `load it from the page`; after `note_message(0, now)` and a `loadShow`, contains `Reaper connected` and `loaded`.

- [ ] **Step 2: Run to verify it fails** — `cargo test -p ptah --test tui the_header`. Expected: FAIL.

- [ ] **Step 3: Implement** the header model as a pure `fn readiness(devices: &[DeviceView], server: &ServerBlock, state: Option<&Value>, clock: Option<&Value>, faults: &[Value]) -> [String; 7]` (unit-tested) and draw it.

- [ ] **Step 4: Run** `cargo test -p ptah && cargo clippy --all-targets -- -D warnings`. Expected: PASS.

- [ ] **Step 5: Commit** — `git commit -am "feat(ptah): tui readiness header"`.

---

### Task 7: `apps/web` scaffold, shell route, build order

**Files:**
- Create: `apps/web/package.json` (`@ptah-app/web`, private; scripts `dev`, `build` (`vite build` → `dist/`), `typecheck`, `test` (vitest), `test:e2e` (Task 12)), `apps/web/vite.config.ts` (React plugin, `server.proxy` `/api` → `http://127.0.0.1:8420` with `ws: true`, `build.outDir: "dist"`, `emptyOutDir`), `apps/web/tsconfig.json` (extends `../../tsconfig.base.json`, jsx `react-jsx`, DOM libs), `apps/web/index.html` (`<title>PTAH</title>`, `lang`, viewport, the ds stylesheet import through `main.tsx`), `apps/web/src/main.tsx` (imports `@ptah-app/ds/ds.css`, `initMode()`, renders `<App/>`), `apps/web/src/App.tsx` (the router switch), `apps/web/src/routes.ts` (`ROUTES = { perform: "/", venue: "/venue", show: "/show", builder: "/builder", settings: "/settings" }`, `shipped: ["perform"]`), `apps/web/src/pages/NotYet.tsx` (ds `EmptyState` "Not yet. Back to Perform."), `apps/web/src/__tests__/routes.test.tsx`, `apps/web/vitest.config.ts` (jsdom)
- Modify: `pnpm-workspace.yaml` (`apps/*`), root `package.json` (`allcheck`: web build runs inside the existing `pnpm -r --if-present build` before `rust:allcheck`, already ordered; add `apps/web/dist` to `.gitignore`), `.github/workflows/ci.yml` (Chromium install also for `@ptah-app/web`), `biome.json` (nothing: `apps/web` is covered by `**`)
- Test: `apps/web/src/__tests__/routes.test.tsx`

**Interfaces:**
- Produces: `apps/web/dist/index.html` + `dist/assets/*` from `pnpm -F @ptah-app/web build`; `App` renders `PerformPage` (a placeholder `<main data-page="perform">` until Task 11) at `/`, `NotYet` at the four reserved paths and at unknown paths; `window.history` routing with `navigate(path)` exported from `routes.ts` (no router library: builder's call per spec).
- Dependencies: `react 19.3.1`, `react-dom 19.3.1`, `@ptah-app/ds workspace:*`, dev `vite 6.4.5`, `@vitejs/plugin-react` (pinned; the version `packages/ds` already resolves), `vitest`, `@testing-library/react 16.3.3`, `jsdom` (the ds versions), `typescript`.

- [ ] **Step 1: Write the failing test** `routes.test.tsx`: renders `<App/>` at `/` → `[data-page=perform]`; at `/venue` → text `Not yet`; at `/nope` → `Not yet`; `navigate("/")` from `/venue` → perform without reload.

- [ ] **Step 2: Run to verify it fails** — `pnpm -F @ptah-app/web test`. Expected: FAIL (package missing).

- [ ] **Step 3: Scaffold** the package and files listed; `pnpm i` (lockfile updated).

- [ ] **Step 4: Verify the whole chain**

Run: `pnpm -F @ptah-app/web build && ls apps/web/dist/index.html && cargo build -p ptah && cargo test -p ptah-server --test app && pnpm allcheck`
Expected: dist present; the embedded tests now serve the real `index.html` (`assets_are_immutable` runs); allcheck PASS.

- [ ] **Step 5: Commit**

```bash
git add -A apps pnpm-workspace.yaml pnpm-lock.yaml package.json .gitignore .github
git commit -m "feat(web): apps/web scaffold with routes, served embedded by ptah"
```

---

### Task 8: The checklist model and the `Checklist` composition (ds)

**Files:**
- Create: `packages/ds/src/perform/checklist/model.ts`, `packages/ds/src/perform/checklist/Checklist.tsx`, `packages/ds/src/perform/checklist/Checklist.module.css`, `packages/ds/src/perform/checklist/__tests__/model.test.ts`, `packages/ds/src/stories/Checklist.stories.tsx`
- Modify: `packages/ds/src/perform/index.ts` (exports), `packages/ds/scripts/test-visual.mjs` (boards `checklist-normal`/`checklist-stage` at COLUMN, `checklist-phone` at PHONE), `docs/design-system.md` ("Perform, assembled" → "The checklist")
- Test: `model.test.ts`, the story play functions (`noShift`)

**Interfaces:**
- Produces:
  ```ts
  export type Readiness = "ready" | "waiting" | "missing";
  export interface ChecklistRow { id: "engine"|"show"|"port"|"clock"|"dmx"|"universes"|"devices"|"phone"; label: string; word: string; tone: "fg"|"warn"|"fault"|"dim"; readiness: Readiness; reason?: string; key?: string /* "L" on the show row */ }
  export interface ChecklistInputs { link: LinkStatus; state: StateMsg | null; clock: ClockMsg | null; metrics: MetricsMsg | null; faults: Fault[] | null; devices: DeviceInfo[] | null; shows: { id: string; name: string }[] | null; remembered: { showId: string | null; venueId: string | null }; server: ServerBlock | null; now: number }
  export interface ServerBlock { version: string; listen: string; urls: string[]; supervised: boolean; venueId: string | null; staticDir: string | null }
  export function deriveChecklist(i: ChecklistInputs): { rows: ChecklistRow[]; band: { text: string; tone: "warn"|"fg" }; waiting: number; missing: number }
  export function Checklist(props: { model: ReturnType<typeof deriveChecklist>; phoneUrl: string | null; onLoad: () => void; width?: number }): JSX.Element
  ```
- Rows exactly as the spec's §4.4 table; `band.text` = `Ready to load — press L` when `missing == 0 && waiting == 0` else `Not ready — ${waiting + missing} waiting`; tone `warn` while anything waits, `fault` never on the checklist band (missing rows are red themselves).
- `DeviceInfo` gains `lastMessageAt?: number | null` (in `live/perform/model.ts`).

- [ ] **Step 1: Write the failing model tests** (one per row state, with the spec's words):

```ts
it("the port waits for Reaper until the clock master has a message")   // devices [{clockMaster:true, present:true, lastMessageAt:null}] → word "waiting for Reaper", warn; lastMessageAt 1 → "Reaper connected", fg
it("the show row names the remembered show and the key")               // state.showInfo null, remembered S in shows → word "Hilldale", reason "L to load", key "L", warn
it("a remembered show gone from disk asks to choose")                   // remembered id not in shows → word "no show", reason "L to choose"
it("the phone row says local only when bound to loopback")             // server.urls [] → "local only", dim; urls [u] → u, fg
it("the dmx row names a lost universe in red")                          // faults output.lost active subject "2" → "U2 not sending", fault, missing
it("the band counts what waits")                                        // 2 waiting → "Not ready — 2 waiting"; none → "Ready to load — press L"
it("nothing is red before the first load for a missing show or Reaper")
```

- [ ] **Step 2: Run to verify they fail** — `pnpm -F @ptah-app/ds test -- checklist`. Expected: FAIL.

- [ ] **Step 3: Implement** `deriveChecklist` and `Checklist` (40 px rows, label in `--track-label`, `StatusWord`-style fixed-width words: measure the longest word per row in the browser as 2C did and pin `min-width` in px; the QR slot is a fixed 160 × 160 box that holds the code or the words `local only`). Stories: `Cold` (nothing ready but engine), `Waiting` (show loaded? no: show preselected, Reaper waiting), `Missing` (U2 lost, a device absent), `Ready`, each with Stage variants and a `Phone` at 390; `noShift` play walks Cold → Ready through a state flip (`_shared/flip.ts`).

- [ ] **Step 4: Run the package gates** (Task 1 Step 4 command, plus `pnpm -F @ptah-app/ds update:visual` once for the new boards; commit the darwin baselines). Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A packages/ds docs/design-system.md
git commit -m "feat(ds): the readiness checklist (model, composition, stories, boards)"
```

---

### Task 9: `ShowPicker` and `PhoneLink` (ds)

**Files:**
- Create: `packages/ds/src/perform/picker/ShowPicker.tsx`, `packages/ds/src/perform/picker/model.ts` (`pickVenue`), `packages/ds/src/perform/picker/__tests__/model.test.ts`, `packages/ds/src/perform/phone/PhoneLink.tsx`, `packages/ds/src/perform/phone/qr.ts` (own encoder, byte mode, EC level M, versions 1–6, or a pinned package ≥ 14 days old: builder's call, recorded in the commit), `packages/ds/src/perform/phone/__tests__/qr.test.ts`, `packages/ds/src/stories/ShowPicker.stories.tsx`, `packages/ds/src/stories/PhoneLink.stories.tsx`
- Modify: `packages/ds/src/perform/index.ts`, `docs/design-system.md`

**Interfaces:**
- Produces:
  ```ts
  export interface PickerShow { id: string; name: string }
  export interface PickerVenue { id: string; name: string; patches: { index: number; showId: string }[] }
  export function pickVenue(showId: string, venues: PickerVenue[], remembered: { venueId: string | null; patchIndex: number | null }): { candidates: PickerVenue[]; venueId: string | null; patchIndex: number | null }
  export type PickerAction = { kind: "load"; showId: string; venueId: string; patchIndex: number } | { kind: "restart"; showId: string; venueId: string; patchIndex: number }
  export function ShowPicker(props: { open: boolean; onOpenChange: (o: boolean) => void; shows: PickerShow[] | null; venues: PickerVenue[] | null; remembered: { showId: string | null; venueId: string | null; patchIndex: number | null }; engineVenueId: string | null; busy?: boolean; onAction: (a: PickerAction) => void }): JSX.Element
  export function PhoneLink(props: { url: string | null; size?: number }): JSX.Element  // inline SVG, white on --bg, quiet zone 4
  export function qrModules(text: string): boolean[][]
  ```
- Picker rules: `candidates` = venues with a patch for `showId`; `venueId` = remembered if a candidate, else the single candidate, else null (a second `Combobox` shows when `candidates.length > 1`); `patchIndex` = remembered when the pair matches, else the first patch of the show in that venue. The action is `load` when `venueId === engineVenueId`, else `restart` with the button text `Restart with <venue name>`. Empty `shows` → `EmptyState` `No shows. Import V1 with ptah import-v1.` and Enter does nothing. A remembered show absent from `shows` → no preselection.

- [ ] **Step 1: Write the failing tests**: `pickVenue` (remembered wins; single candidate; several → null with candidates; patch rule), `qrModules("http://192.168.1.12:8420")` decodes with a reference (a small vector test: the finder patterns at the three corners, module count 29 for version 3-M, and a known-vector round trip from a published test string), and Testing Library tests for the picker: preselection, `Restart with Garage` text when venues differ, `EmptyState` on `[]`, Enter on the preselected show calls `onAction` with `load`.

- [ ] **Step 2: Run to verify they fail** — `pnpm -F @ptah-app/ds test -- picker qr`. Expected: FAIL.

- [ ] **Step 3: Implement** both compositions on ds `Dialog` + `Combobox` + `Button` + `EmptyState`; stories `OneVenue`, `SeveralVenues`, `OtherVenue` (restart text), `Empty`, `Busy`, Stage variants, Open/OpenStage per the overlay rule; `PhoneLink` `Normal`, `Stage`, `LocalOnly`.

- [ ] **Step 4: Run the package gates** (Task 1 Step 4). Expected: PASS (overlays are axe-checked open).

- [ ] **Step 5: Commit** — `git commit -am "feat(ds): ShowPicker and PhoneLink (QR)"` (with `git add -A packages/ds docs`).

---

### Task 10: `Shell` (ds)

**Files:**
- Create: `packages/ds/src/shell/Shell.tsx`, `packages/ds/src/shell/Shell.module.css`, `packages/ds/src/shell/index.ts`, `packages/ds/src/stories/Shell.stories.tsx`
- Modify: `packages/ds/vite.config.ts` (entry `shell`), `packages/ds/package.json` (`./shell`), `packages/ds/src/__tests__/build.test.ts`, `packages/ds/scripts/test-visual.mjs` (`shell-laptop` at LAPTOP, `shell-phone` at PHONE, normal + stage), `docs/design-system.md`

**Interfaces:**
- Produces: `Shell(props: { screens: { id: string; title: string; href: string; shipped: boolean }[]; current: string; onNavigate: (href: string) => void; children: ReactNode; width: number })`: a 40 px strip (`--line` hairline below, the one hairline of the composition) with the mark `PTAH` (`--track-label`), the shipped screens as ds `Tabs` (unshipped ones not rendered), the mode toggle (ds `Toggle`, label `Stage`, bound to `toggleMode`/`getMode`), and the `⌘K` `Kbd` hint; below 600 px only the mark and the hint. `children` fill the rest (`height: calc(100dvh - 40px)`).

- [ ] **Step 1: Write the failing test** in `packages/ds/src/stories/__tests__/stories.test.tsx` style or a new `shell.test.tsx`: renders only shipped tabs; at `width: 390` no tabs and no toggle; the strip is 40 px (CSS text assertion as 2C does).

- [ ] **Step 2: Run to verify it fails** — `pnpm -F @ptah-app/ds test -- shell`. Expected: FAIL.

- [ ] **Step 3: Implement** and add stories `Laptop`, `Phone`, `LaptopStage`, `PhoneStage` with a Perform-sized grey block as children; `noShift` play toggles the mode.

- [ ] **Step 4: Run the package gates** (Task 1 Step 4 + `update:visual` for the new boards). Expected: PASS.

- [ ] **Step 5: Commit** — `git add -A packages/ds docs && git commit -m "feat(ds): Shell"`.

---

### Task 11: The Perform page on the engine (app)

**Files:**
- Create: `apps/web/src/api/client.ts` (`getJson<T>(path)`, `postJson`, `restart(venueId?)`, `postCommand` re-export), `apps/web/src/api/types.ts` (`ServerBlock`, `SettingsView`, `ShowListItem`, `VenueListItem`), `apps/web/src/perform/useRig.ts`, `apps/web/src/perform/useEngineData.ts` (server block once + on reconnect; settings, shows, venues on open and after each load; devices every 1 s through `getDevices`), `apps/web/src/perform/PerformPage.tsx`, `apps/web/src/perform/layout.ts` (`layoutFor(width) → { layout: "column"|"full"; width: number }`: `full` at ≥ 1024, else `column` with `min(440, width)`), `apps/web/src/__tests__/{useRig,layout,performPage}.test.tsx`
- Modify: `apps/web/src/App.tsx` (the `Shell` around the routes, `screens` from `routes.ts`), `packages/ds/src/perform/Perform.tsx` only if a prop is missing (then `Perform` gains it in this task with its story)

**Interfaces:**
- Consumes: `@ptah-app/ds/perform` (Task 1, 8, 9), `@ptah-app/ds/shell` (Task 10), `@ptah-app/ds/live` (`createWebSocketSource`, `StreamProvider`, `useStream`), the API of Tasks 3–5.
- Produces: `PerformPage()` renders, inside one `StreamProvider` on `createWebSocketSource(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/v1/ws`)`: the `Checklist` while `state?.showInfo == null` (and on `C` / palette `Checklist` while a show plays, as an overlay `Dialog`), else `Perform` with `rig` from `useRig`, `sendCommand = postCommand`, `onRestart = () => restart()` (only when `server.supervised`), `pollDevices = getDevices`, `layout`/`width` from `layoutFor(window.innerWidth)` (re-read on resize, debounced 120 ms). `L` and the palette commands `Load show` / `Switch show` open `ShowPicker`; `PickerAction.load` → `postCommand({type:"loadShow",…})` with the band's `loading <name>` (a `Toast` of kind info while pending, the refusal message as a fault toast, picker stays); `PickerAction.restart` → `restart(venueId)` then the picker closes and the checklist shows the show preselected. Palette additions: `Checklist` (`C`), `Phone link` (opens `Dialog` with `PhoneLink` and the URL text), `Full / column layout` (toggles a `layout` override kept in `localStorage` `ptah.web.layout`). Overrides reflect `state.overrides` (Blackout / Freeze buttons show `on`).
- `useRig(showInfo)`: fetches `/shows/{showId}`, `/venues/{venueId}`, and `/types/{id}` for every distinct `typeId` of the patch's fixtures, builds `rigOf(show, { universes, fixtures: patch.fixtures }, types)`; keyed by `showEpoch`; a failed type → that type absent from the map (unlit tiles) and one console warning.

- [ ] **Step 1: Write the failing tests** (Vitest, `fetch` stubbed with `vi.fn` per path):

```ts
it("layoutFor: 1280 → full; 700 → column 440; 390 → column 390")
it("useRig fetches the show, the venue and each type once per epoch and builds the rig")
it("useRig leaves a type that 404s out and still returns a rig")
it("PerformPage shows the checklist when no show is loaded and the board once showInfo arrives")   // a fake StreamSource emitting state snapshots
it("L opens the picker; a refused loadShow keeps it open and toasts the message")                  // POST /commands → 200 {ok:false,message:"patch of another show"}
it("the Restart hold is disabled when the server block says not supervised")
```

- [ ] **Step 2: Run to verify they fail** — `pnpm -F @ptah-app/web test`. Expected: FAIL.

- [ ] **Step 3: Implement** the files above. Keep `PerformPage` free of styling beyond centring the column (`margin-inline: auto`, `--bg` background); every visual belongs to ds compositions.

- [ ] **Step 4: Run** `pnpm -F @ptah-app/web test && pnpm -F @ptah-app/web typecheck && pnpm -F @ptah-app/web build && pnpm check`. Expected: PASS.

- [ ] **Step 5: Smoke it by hand against the binary** (no commit gate, the e2e is Task 12): `cargo run -p ptah -- run --wait --fake-io --ui-port 8420 --root <copy of fixtures>` and `pnpm -F @ptah-app/web dev`; open the page, load the synthetic show, see the board. Note anything off in the task report.

- [ ] **Step 6: Commit**

```bash
git add -A apps/web packages/ds
git commit -m "feat(web): the Perform page on the engine — checklist, picker, restart, phone link, layout"
```

---

### Task 12: End to end against the real binary

**Files:**
- Create: `apps/web/e2e/perform.spec.ts`, `apps/web/e2e/engine.ts` (spawns `target/debug/ptah supervise --wait --restart-delay-ms 50 --fake-io --ui-port <free port> --root <temp copy of fixtures/ with settings.json currentShowId = synthetic show, currentVenueId = synthetic-a>`; waits for `GET /api/v1/server`; kills on teardown; `PTAH_HOME` set to the temp root), `apps/web/playwright.config.ts` (Chromium, `baseURL` from the engine, 1280 × 800 and 390 × 844 projects, `--static-dir apps/web/dist` **not** used: the embedded build is what ships, so the test runs `pnpm -F @ptah-app/web build && cargo build -p ptah` first through `globalSetup`), `apps/web/scripts/test-e2e.mjs` (builds, runs Playwright, exits with its status)
- Modify: `apps/web/package.json` (`test:e2e`), root `package.json` (`allcheck` gains `pnpm -F @ptah-app/web test:e2e` after the Storybook gates and before `rust:allcheck`), `.github/workflows/ci.yml` (nothing new if Chromium is installed for the workspace; otherwise add the install for `@ptah-app/web`)

**Interfaces:**
- Consumes: everything above. Produces: the proof of spec §4.8, in `pnpm allcheck`.

- [ ] **Step 1: Write the spec**

```ts
test("cold start → checklist → load → live board → blackout → restart → switch", async ({ page }) => {
  // 1 checklist: engine "up", show row "Synthetic" + "L to load", port "waiting for Reaper", band "Not ready — 2 waiting"
  // 2 press L, Enter: band "loading Synthetic" then the board: [data-component=StatusRegion] not "No show"; bar text matches /^\d{3}\.\d$/ and changes within 3 s (internal clock on: POST /commands internalClock {tempo:120, running:true})
  // 3 POST /commands trigger {instance:0, velocity:1, on:true, epoch}: a U1 tile's background is not the off fill within 2 s
  // 4 hold B 600 ms: state.overrides.blackout true via GET /status; the button reads on; hold again → off
  // 5 hold R 600 ms: band goes through "restarting" and "not in sync" and back to "All well" within 15 s; the WebSocket reconnected (no page reload: a window marker set before survives)
  // 6 ⌘K "Switch show" → picker lists "Synthetic"; Escape
  // noShift across the run: the 2C helper's assertion on the column's rows (import from @ptah-app/ds test helpers if exported, else re-implement: record each row's rect at step 2 and compare at steps 4–6)
});
test("phone viewport shows the same board", …)   // 390 × 844 project: the board renders, hold buttons ≥ 44 px
test("--local: the phone row says local only", …) // a second engine started with 127.0.0.1 only
```

- [ ] **Step 2: Run to verify it fails** — `pnpm -F @ptah-app/web test:e2e`. Expected: FAIL (no runner yet) then, once the runner exists, PASS or a real defect: fix the defect in its owning file within this task.

- [ ] **Step 3: Implement** the runner, the engine helper, the config; make it pass.

- [ ] **Step 4: Run the whole gate** — `pnpm allcheck`. Expected: PASS end to end.

- [ ] **Step 5: Commit**

```bash
git add -A apps/web package.json .github
git commit -m "test(web): end-to-end run against the real binary with fake I/O, in allcheck"
```

---

### Task 13: Documentation

**Files:**
- Create: `docs/app.md` (the command, the shell and routes, how a screen is added, the data layer, the dev loop with the proxy, the e2e, the owner's exit criteria checklist), `docs/ledgers/step3a-owner-check.md` (the five criteria of spec §4.8 as checkboxes with space for the owner's notes)
- Modify: `README.md` (Development: `ptah`, `pnpm -F @ptah-app/web dev`), `docs/api.md` (a final read-through: `/restart`, `/server`, `lastMessageAt`, "Pages"), `docs/engine.md` (`ptah`, `--wait`, exit 75, first-child rule), `docs/design-system.md` ("What comes next": 3A done; entries `perform`, `shell`), `packages/ds/src/__tests__/docs.test.ts` if it checks headings
- Test: the docs tests of `packages/ds`; `cargo test --doc`

- [ ] **Step 1: Write the docs.** Every name in them must exist in the code (`grep` each flag, route and export once).
- [ ] **Step 2: Run** `pnpm allcheck`. Expected: PASS.
- [ ] **Step 3: Commit** — `git add docs README.md packages/ds && git commit -m "docs: the app (3A), API and engine additions"`.

---

## Self-review notes

- Spec coverage: §4.1 → Tasks 2, 5; §4.2 → Tasks 2, 3; §4.3 → Tasks 4, 7, 10, 11; §4.4 → Tasks 3, 8, 6; §4.5 → Tasks 9, 11; §4.6 → Tasks 1, 11; §4.7 → Task 5; §4.8 → Tasks 8–10 (stories), 12 (e2e), 13 (owner check file); §4.9 → Task 13 and the per-task doc steps.
- Names used across tasks: `EXIT_RESTART` (2, 3), `RestartRequest` (3), `ServerBlock` (3, 8, 11), `DeviceInfo.lastMessageAt` (3, 8, 11), `rigOf(show, venue, types)` (1, 11), `PickerAction` (9, 11), `deriveChecklist` (8, 11), `Shell` props (10, 11), `onRestart` (1, 11).
- Review Focus items 1–5 are pinned in Tasks 3/8, 11, 8/9, 12, 9.
