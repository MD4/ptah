# V2 Step 1D — Surface (API, readout, replay, V1 replay oracle, rehearsal) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close Step 1: the headless engine of plan 1C gets its surface (the `/api/v1` HTTP + WebSocket server, a static `/debug` page, `ptah tui`), its proof tools (`ptah play-midi`, DMX capture on both V1 and V2, `ptah compare-captures`, `ptah replay`), the V1 replay oracle on the band's rendered LIGHTS track with every mismatch classified, the Pi 4 performance check, the clock validated against real recordings, and the owner's rehearsal checklist. Step 1 exits on the owner's word after the rehearsal.

**Architecture:** A new crate `ptah-server` (axum + tokio on its own thread, started by `ptah run`) owns the single `EngineHandle` and multiplexes clients through a command channel with an id allocator; it never touches the render thread. Wire shapes are `serde` derives on the engine's existing types plus three small accessors (show identity and instance ids, run beat and voice list at journal cadence, live-health sets). The readout tools are clients of that API. Capture is one `OutputSink` on V2 and one `IUniverseDriver` file on V1; the oracle compares two capture files with one pure comparator, run once by hand against V1 and then forever in CI against the committed V1 capture through an in-process V2 replay.

**Tech Stack:** Rust 1.93.0 pinned; `axum` 0.8 (`ws` feature), `tokio` (rt-multi-thread, net, sync, time), `tower-http` (fs, cors), `serde_json`, `ratatui` + `crossterm`, `tokio-tungstenite` (TUI client), `midir` (output ports for `play-midi`), `clap`; dev: `tempfile`, `reqwest` (blocking, for server tests). V1 side: one TypeScript file + a 6-line guarded branch (no other V1 change).

**Spec:** `docs/superpowers/specs/2026-10-26-v2-step1-engine-design.md` §6.3 (`ptah replay`), §6.4 (live health in the API, static health on show load), §6.6 (readout tools), §9 (API), §10 (last-used patch), §11 (proof: 11.2 V1 replay, 11.4 performance, 11.5 rehearsal). Binding engine contract: `ptah-v2/docs/engine.md` (its "Known limits (plan 1D)" section and the 1C final review's three API regrets in `ptah-v2/docs/ledgers/step1c-execution-ledger.md` are inputs to Task 1). Clock tuning list: `ptah-v2/docs/vm-rust.md` "Tuning items for plan 1D". Previous ledgers: `ptah-v2/docs/ledgers/step1c-*`.

## Global Constraints

- Repository `~/projects/ptah-v2`, branch `step1d-surface` off `master` (a76059b or later). Private.
- Gates on every commit: `cargo fmt --all --check`, `cargo clippy --all-targets -- -D warnings` (pedantic on), `cargo test --all`, `pnpm allcheck`. Conventional Commits with a crate scope. CI (ubuntu + macOS) must be green before merge.
- The render thread stays as 1C left it: no allocation (the guards in `tests/frame_loop.rs` and `tests/perf.rs` stay at 0), no IO, no logging, no shared mutex. Nothing in this plan runs on it except the two `Command` additions of Task 1, which are allocation-free.
- "Every dropped, unmapped or clamped value is counted and visible": the server's own drops (a slow WebSocket client, a full command channel) are counted in a server counters struct exposed at `/api/v1/status`.
- Fault codes stay exactly the 18 of 1C. The server raises none.
- Files: the engine writes only under `runtime/` plus `settings.json` (last used show, venue and now patch); the server writes shows, venues, patches, fixture types and settings through `ptah_model::store` with validation and lint (errors in the lint format with codes), never V1 paths.
- The API binds `127.0.0.1:settings.uiPort` by default and all interfaces with `--listen`; no authentication in Step 1 (design §9).
- Versioned prefix `/api/v1`; JSON everywhere except the binary frame stream; every WebSocket topic sends a full snapshot on subscribe, then deltas.
- Hidden CLI flags and test seams stay hidden (`#[arg(hide = true)]`, `#[doc(hidden)]`).
- Every test is hermetic: `PTAH_HOME`/tempdir roots, fakes, injected time, the server on port 0; no real MIDI, serial or audio device except behind `#[ignore]`. The V1 replay oracle's live run is a documented manual procedure; its CI gate uses the committed V1 capture.
- V1 (`~/projects/ptah`): one new file `apps/service-main/src/drivers/capture.driver.ts` and a guarded branch in `dmx.service.ts` active only when `PTAH_DMX_CAPTURE` is set; nothing else changes; `pnpm allcheck` there stays green.
- Band files (`fixtures/v1/replay/*`) are committed only because the repository is private.

## Review Focus

1. A WebSocket client that stops reading must never slow the engine or the other clients: the server drops that client's backlog (counted) and the engine's subscriber queues are drained by the server, not by clients (Task 2 test: a stalled client, frames keep flowing to another).
2. A command sent while a `LoadShow` is in flight must not land on the wrong instance: `Trigger`/`SetParam` carry the epoch the client saw and are refused `stale-epoch` when it moved (Task 1 test).
3. `ptah play-midi` must emit MIDI clock at the file's tempo map with no drift: over the full LIGHTS file the last pulse lands within 5 ms of the tempo-map time (Task 5 test on the scheduler, injected clock).
4. The comparator must not hide a V2 bug behind a classification: every mismatch run is classified by an explicit rule with its evidence (frame indices, channels, values), and an unclassified run fails the test (Task 7).
5. `ptah replay` must reproduce the recorded output: replaying a recorder chunk set through the driven engine yields the same frames the recorder captured, byte for byte, at the debug rate (Task 8 test).

---

### Task 1: Wire shapes, accessors and command guards in `ptah-engine`

**Files:**
- Modify: `crates/ptah-engine/src/{telemetry/mod.rs, report.rs, faults.rs, timers.rs, engine.rs, command.rs, frame_loop.rs, live_show.rs, live_health.rs, journal.rs, telemetry/core.rs, telemetry/sinks.rs}`, `crates/ptah-engine/tests/{engine.rs, frame_loop.rs}`, `docs/engine.md`

**Interfaces:**
- Produces: `Serialize` (+ `Deserialize` where a replay reads it back) on `TelemetrySnapshot`, `Counters` and every nested counters struct, `TimersSnapshot`, `EngineStatus`, `Fault`, `TickReport`, `InEvent`, `RecordEvent`, `JournalState`, `VoiceSnapshot`, `PublishedFrame` (bytes as base64 only in JSON contexts; the WebSocket frame topic is binary), `ClockState` (via `clock_state_name`), `QuietState`, `Overrides`.
- `EngineHandle::show_info(&self) -> Option<Arc<ShowInfo>>` (show_id, venue_id, patch_index, show_epoch, instance_ids, faulted, universes); `ShowInfo` gains `pub program_ids: Vec<String>` and `pub instance_params: Vec<Vec<String>>` (parameter names per instance in declaration order) so the API maps ids to the `u32` indices.
- `TickReport` gains `run_beat: f64`; `TelemetrySnapshot` gains `run_beat: f64`, `voices: Vec<VoiceView>` (`VoiceView { instance: u32, member: u32, kind, started_at_beat: f64, gate: bool, orphan_deadline: Option<f64> }`, refreshed from each journal payload: at most 250 ms old) and `live_health: LiveHealthView` (`seen`/`unmapped` counts + the unmapped list, refreshed with each live-health write); `EngineHandle::recorder_chunks(&self) -> Vec<ChunkInfo>`.
- `Command::Trigger` and `Command::SetParam` gain `epoch: Option<u64>`: when `Some(e)` and `e != show_epoch` the loop refuses with `"stale epoch"` (allocation-free). `EngineHandle::send` refuses ids `>= 1 << 62` with `Err(command)` and the reserved range is documented on `send`.
- `EngineHandle::live_health_sets(&self) -> LiveHealthView`.

- [ ] **Step 1: Write the failing tests**: `serde_json::to_string(&snapshot)` round-trips the documented field names (camelCase); `show_info()` after start names the synthetic show, its instance ids and parameter names; `run_beat` in the snapshot advances while the clock is Stopped; the voice list shows a held note within 250 ms of fake time and empties after note-off; `Trigger { epoch: Some(old) }` after a `LoadShow` is acked `"stale epoch"` and `Trigger { epoch: None }` is accepted (Review Focus 2); `send(1 << 62, ..)` returns `Err`; the allocation test still reports 0 with the new command fields.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit**: `feat(ptah-engine): wire shapes, show info and voice views for the API, epoch-guarded commands`

---

### Task 2: `ptah-server` — HTTP API and WebSocket topics

**Files:**
- Create: `crates/ptah-server/{Cargo.toml, src/lib.rs, src/state.rs, src/http/{mod,files,commands,health,recorder,status}.rs, src/ws/{mod,topics,frames}.rs, src/clients.rs, tests/http.rs, tests/ws.rs}`
- Modify: `Cargo.toml` (workspace members + deps: `axum`, `tokio`, `tower-http`, `futures-util`, `base64`; dev: `reqwest`, `tokio-tungstenite`), `crates/ptah/src/cmd/run.rs` (`--listen`, `--ui-port`, starts the server), `crates/ptah/Cargo.toml`

**Interfaces:**
- `Server::start(config: ServerConfig { layout, listen: SocketAddr, static_dir: Option<PathBuf>, engine: EngineHandle, registry: Arc<DeviceRegistry> }) -> Result<ServerHandle, ServerError>`; `ServerHandle { local_addr(), shutdown() }`; the server owns the `EngineHandle` on a dedicated thread (`EngineOwner`) that drains `subscribe_acks/faults/debug_frames` receivers continuously (never letting the engine drop a subscriber) and serializes commands from an `mpsc` of `(client_id, Command, reply)` with ids allocated from 1 upward (never `>= 1 << 62`).
- HTTP (`/api/v1`): `GET /status` (snapshot JSON + server counters: clients, ws_dropped_messages, command_queue_full), `GET /show-info`; files: `GET/PUT /shows/{id}`, `GET /shows`, `GET/PUT /venues/{id}`, `GET /venues`, `GET/PUT /venues/{id}/patches/{index}`, `GET/PUT /types/{id}`, `GET /types`, `GET/PUT /settings` (PUT validates + lints through `ptah_model::store`; 422 with the lint issues `[{path, code, message, severity}]`); commands: `POST /commands` with `{ "type": "loadShow" | "setOverride" | "setSong" | "internalClock" | "trigger" | "setParam" | "setRenderRate" | "setFallbackLook" | "measureInstances" | "shutdown", ...fields }` → `{ id, ok, message }` after the ack (timeout 2 s → 504); `POST /health` (`{ showId, venueId, patchIndex }` → the static health issues via `ptah_model::health`); `GET /recorder/chunks`; `GET /live-health` (the file's JSON); `POST /import-v1` (`{ from, collapse, dryRun }` → the import report); `GET /devices`.
- WebSocket `/api/v1/ws`: client sends `{ "subscribe": ["frames","voices","events","faults","metrics","clock","state"] }` / `{ "unsubscribe": [...] }`; server sends `{ "topic", "kind": "snapshot" | "delta", "data" }` as text, except `frames` as binary `[u32 universe][u64 seq][u64 at][512 bytes]` at `debugRateHz`; cadence: `voices`/`clock`/`metrics`/`state` on every snapshot publication (100 ms), `events` per drained event batch (from the recorder event ring copy telemetry already forwards; add an `events` subscription on `TelemetryHandle` if missing), `faults` on change. Per-client bounded outbox (256 messages; frames keep only the latest per universe); overflow counted in `ws_dropped_messages` and the client is never blocked (Review Focus 1).
- Static: `/debug` (Task 3) and `settings.staticDir` (optional) via `tower-http::services::ServeDir`.
- `ptah run` gains `--listen` (bind all interfaces) and `--ui-port N` (default `settings.uiPort`), starts the server after the engine and stops it first on shutdown; the server thread runs a multi-thread tokio runtime with 2 workers.

- [ ] **Step 1: Write the failing tests** (server on port 0 with a driven engine and fakes): `GET /status` returns the snapshot with `frameIndex` and `engine.showLoaded`; `PUT /shows/{id}` with an invalid show returns 422 with a `lint-*` code and writes nothing; a valid PUT writes the file and `GET` returns it; `POST /commands {"type":"setOverride","kind":"master","value":0.5}` returns `ok: true` and the next snapshot shows it; `POST /commands {"type":"trigger", ..., "epoch": 1}` after a `loadShow` returns `"stale epoch"`; WS: subscribe `frames` → a binary frame per `step_frame`; subscribe `faults` → a snapshot then a delta when a fault is raised; a stalled client (never reads) does not stop a second client's frames and `ws_dropped_messages` grows (Review Focus 1); `POST /health` returns the `health` oracle's issues for the synthetic fixtures; `GET /recorder/chunks` lists the chunk written by a driven run.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS; `ptah run --frames 50 --ui-port 0` (hidden, port 0 prints the bound address on stderr) serves `/api/v1/status` in a CLI test. **Step 5: Commit**: `feat(ptah-server): /api/v1 HTTP commands and files, WebSocket topics with bounded per-client outboxes`

---

### Task 3: `/debug` page

**Files:**
- Create: `crates/ptah-server/static/debug.html` (embedded with `include_str!`), `crates/ptah-server/tests/debug_page.rs`

**Interfaces:** `GET /debug` serves one HTML file (no framework, no build): per universe a grid of coloured squares from the binary `frames` topic (one square per channel, 32 per row, brightness = value), the fault list from `faults`, the timers from `metrics`, the clock line from `clock`; reconnects on close; nothing else.

- [ ] **Step 1: Write the failing test**: `GET /debug` is 200 `text/html`, contains `new WebSocket(` and `/api/v1/ws`, and under 40 KB. **Step 2: Run** → FAIL. **Step 3: Write the page** (plain JS: subscribe to the four topics, parse the binary frame layout of Task 2, draw with `<canvas>`). **Step 4: Run** → PASS; open it once by hand against `ptah run --fake-io --ui-port 0` and note the result in the report. **Step 5: Commit**: `feat(ptah-server): static /debug page on the frame stream`

---

### Task 4: `ptah tui`

**Files:**
- Create: `crates/ptah/src/cmd/tui.rs`, `crates/ptah/src/tui/{mod,client,view,model}.rs`, `crates/ptah/tests/tui.rs`
- Modify: `crates/ptah/src/main.rs`, `crates/ptah/Cargo.toml` (`ratatui`, `crossterm`, `tokio-tungstenite`, `tokio`, `futures-util`, `serde_json`)

**Interfaces:**
- `ptah tui [--url http://127.0.0.1:PORT] [--root ROOT]` (default URL from `settings.uiPort`): a WebSocket client subscribing to `frames`, `voices`, `events`, `faults`, `metrics`, `clock`, `state`; screens: status bar (show, venue, patch, song, clock state + beat + tempo, rt priority, degradation), per universe a DMX grid (the master plan's coloured number grid: value in a cell coloured by brightness; `u`/`U` switch universe), running voices with beat position, the last 20 input events, stage timers (p50/p99/max of each), active faults; keys: `q` quit, `b`/`h`/`f` toggle blackout/house lights/freeze (POST /commands), `+`/`-` master, `l` load show (prompt for id), `r` reconnect. Rendering is pure: `view::render(&Model, &mut Frame)`; `model::apply(&mut Model, Message)` is pure and tested with recorded messages.
- Doubles as the box's diagnostic screen over SSH: works at 80×24.

- [ ] **Step 1: Write the failing tests**: `model::apply` on a recorded `state` snapshot + `frames` binary + `faults` delta yields the expected `Model` (universe grid values, fault rows, voice rows); `view::render` into a `ratatui::backend::TestBackend` 80×24 contains the status bar text and the grid's first row; the client parses the Task 2 binary frame layout exactly (shared helper with the server tests). **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS; run `ptah tui` by hand against `ptah run --fake-io --fake-note 60` and note it. **Step 5: Commit**: `feat(ptah): ptah tui, a terminal readout over the API`

---

### Task 5: `ptah play-midi`

**Files:**
- Create: `crates/ptah/src/cmd/play_midi.rs`, `crates/ptah-io/src/midi/{player.rs, out.rs}`, `crates/ptah-io/tests/player.rs`
- Modify: `crates/ptah/src/main.rs`, `crates/ptah-model/src/smf.rs` (tempo map helpers: `Timeline::tick_to_ns(tick) -> u64`, `Timeline::pulses(ppq_divisor 24) -> impl Iterator<Item = (tick, ns)>`)

**Interfaces:**
- `ptah play-midi FILE --to PORT_NAME [--channel N (remap every event to N)] [--from-beat B] [--tempo-scale F] [--no-clock] [--virtual NAME (create a virtual output instead)] [--dry-run (print the first 50 events and the clock count)]`: `midir::MidiOutput` connected to the first port whose name contains `PORT_NAME` (or a virtual output); emits, in time: MIDI clock (24 per quarter from the tempo map, never from a fixed tempo), Start at the first event (or SPP + Continue when `--from-beat`), notes, CCs, Program Changes on their channels (or `--channel`), Stop at the end; schedule computed once (`player::Schedule::from_timeline`, pure, tested) and played by a real-time loop (sleep until 2 ms before, then spin) with the drift measured and printed at the end (`max late µs`).
- Exit 0 at the end; SIGINT sends Stop + All Notes Off on every used channel and exits 0.

- [ ] **Step 1: Write the failing tests** (pure, injected clock): `Schedule::from_timeline` on `fixtures/shows/synthetic/timeline.mid` gives 24 pulses per quarter at each tempo; on `fixtures/v1/replay/HILLDALE-LIGHTS-rendered.mid` the last pulse's time equals the tempo map's end within 5 ms and the counts are 9151 note-ons and 128 064 CCs (Review Focus 3); `--channel 1` remaps; `--from-beat 32` starts with SPP 128 + Continue; the player loop on a fake clock and a recording `MidiOut` emits bytes in order. **Step 2: Run** → FAIL. **Step 3: Implement** (`#[ignore]` loopback test: virtual out → the Task 7 of 1C parser via a `midir` input). **Step 4: Run** → PASS. **Step 5: Commit**: `feat(ptah): play-midi, a MIDI file player with clock, Start and SPP from the tempo map`

---

### Task 6: DMX capture on both sides and the comparator

**Files:**
- Create: `crates/ptah-io/src/capture.rs` (`CaptureSink`), `crates/ptah/src/cmd/compare_captures.rs`, `crates/ptah-engine/src/capture_format.rs` (shared reader/writer), `crates/ptah-engine/tests/capture.rs`, V1: `~/projects/ptah/apps/service-main/src/drivers/capture.driver.ts`, `~/projects/ptah/apps/service-main/src/__tests__/capture.driver.test.ts`
- Modify: `crates/ptah/src/cmd/run.rs` (hidden `--capture-dmx PATH`: a `CaptureSink` replaces every venue universe's sink), `crates/ptah/src/main.rs`, V1 `apps/service-main/src/services/dmx.service.ts` (guarded branch)

**Interfaces:**
- Capture file `capture@1`: a header line `{"schema":"capture@1","source":"v1"|"v2","startedWallMs":..,"channels":512,"universe":N}` then one JSON line per frame `{"t":<ms since start, f64>,"i":<frame index>,"d":"<base64 512 bytes>"}`; written at every frame the driver receives (V1: each `update` call, which V1 makes once per MIDI clock tick; V2: every rendered frame, 44 Hz).
- V2: `CaptureSink::new(path, universe)` implements `OutputSink` (`open` creates the file, `send` appends a line with `t` from `RealClock` since open); `ptah run --capture-dmx PATH` (hidden) uses it for every universe (`PATH` gets `-u<N>` inserted when there are several).
- V1: `capture.driver.ts` implements `IUniverseDriver` (`update(u)` merges the sparse channel map into a 512 array and appends a line with `t = performance.now() − start`), and `dmx.service.initialize` uses it as the main universe when `process.env.PTAH_DMX_CAPTURE` is set instead of waiting for a serial port (the only V1 behaviour change, inert without the variable); its test writes two updates and reads them back.
- `ptah compare-captures A B [--resample-ms 20] [--tolerance 2] [--channels 1-24] [--align auto|<ms>] [--report OUT.md] [--json]`: pure comparator `capture::compare(a, b, opts) -> Report`: both captures resampled to a 20 ms grid (sample-and-hold), aligned on the first non-zero frame (or `--align`), compared per channel with `±tolerance` and one frame (20 ms) of time tolerance either way; every mismatch run (consecutive frames on one channel) classified by rules in this order: `jitter` (resolves within one extra frame), `silent-drop` (a value V1 never shows because its 40 Hz driver skipped a tick's frame between two updates: V2's value appears in V1's neighbour frames), `legacy-merge` (V1's per-channel last-writer differs from V2's per-fixture HTP where two programs overlap on the channel: both values present in the two captures' own history), else `unclassified`; the report lists per class the runs with frame indices, channel, both values, and the totals; exit 1 when any `unclassified` run exists.

- [ ] **Step 1: Write the failing tests**: `CaptureSink` writes the header and frames (fake clock); the V2 reader parses what the writer wrote and what the V1 driver test wrote (a fixture line); `compare` on two identical captures reports 0 runs; a one-frame late copy reports only `jitter`; a copy missing every other frame reports `silent-drop`; a copy where one channel holds a lower overlapping value reports `legacy-merge`; a random corruption reports `unclassified` and exit 1 (Review Focus 4); `ptah run --frames 30 --capture-dmx` writes a readable capture. **Step 2: Run** → FAIL. **Step 3: Implement** (Rust first, then the V1 driver + its Jest test; `pnpm allcheck` in V1 green). **Step 4: Run** → PASS. **Step 5: Commit** (two repos): V2 `feat(ptah): DMX capture sink and compare-captures with mismatch classification`; V1 `test(service-main): DMX capture driver behind PTAH_DMX_CAPTURE (Step 1 replay oracle)`.

---

### Task 7: The V1 replay oracle (manual run, committed capture, CI gate)

**Files:**
- Create: `fixtures/v1/replay/HILLDALE-v1-capture.jsonl.zst` (the V1 capture, compressed), `fixtures/v1/replay/REPORT.md` (the classified report), `docs/v1-replay.md` (the procedure), `crates/ptah-engine/tests/v1_replay.rs`, `scripts/v1-replay.sh`
- Modify: `fixtures/v1/replay/README.md`, `Cargo.toml` (dev-dep `zstd`)

**Interfaces:**
- `scripts/v1-replay.sh` (run by hand on the owner's Mac, documented step by step in `docs/v1-replay.md`): (1) V1: `PTAH_DMX_CAPTURE=/tmp/v1.jsonl pnpm start` in `~/projects/ptah` with the HILLDALE show current in V1's `~/.ptah` (V1 restores it at start; its virtual input port is `ptah`); (2) `ptah play-midi fixtures/v1/replay/HILLDALE-LIGHTS-rendered.mid --to ptah --channel 1`; (3) stop V1; (4) V2: `ptah run --root <imported tree> --show <HILLDALE id> --venue <venue id> --capture-dmx /tmp/v2.jsonl` with a settings device `{ name: "ptah-v2", virtualPortName: "ptah-v2", clockMaster: true }` and `ptah play-midi ... --to ptah-v2 --channel 1`; (5) `ptah compare-captures /tmp/v1.jsonl /tmp/v2.jsonl --report fixtures/v1/replay/REPORT.md`; (6) commit the V1 capture (zstd) and the report.
- CI gate `tests/v1_replay.rs`: an in-process V2 replay of the rendered file (`FakeMidi::timeline` on a driven engine with `FakeOutput`s, the imported HILLDALE tree from `fixtures/v1` via `import-v1` into a tempdir, the real tempo map, frames taken at the driven 44 Hz grid with `t` from the fake clock) compared with the committed V1 capture by the same comparator; the test fails on any `unclassified` run and prints the per-class totals; it also asserts the totals do not exceed the committed report's by more than 1 % (a regression guard). Runtime budget: < 60 s debug (the file is ~137 k events; the driven engine renders ~ 4 beats per real ms).
- **Ruling (controller):** the live V1 run is executed by the controller on this Mac (V1 repo and `~/.ptah` are here); the owner is asked only if V1's current show is not HILLDALE or a V1 upgrade requires opening the show once in V1 first (owner item from 1A).

- [ ] **Step 1: Write the CI test** against a placeholder capture (a V2 self-capture) → it passes trivially; then run the manual procedure once, commit the real V1 capture and the report, and make the test read it. **Step 2:** every `unclassified` run is a V2 bug or a new rule with evidence: fix the engine (own commits) or extend the comparator's rules with the evidence written in `REPORT.md` (a rule without evidence is a weakened bound: forbidden). **Step 3: Run** → PASS; `docs/v1-replay.md` complete. **Step 4: Commit**: `test(ptah-engine): V1 replay oracle on the rendered LIGHTS track, classified report` (+ fixes).

---

### Task 8: `ptah replay`

**Files:**
- Create: `crates/ptah/src/cmd/replay.rs`, `crates/ptah-engine/src/replay.rs`, `crates/ptah-engine/tests/replay.rs`
- Modify: `crates/ptah/src/main.rs`, `crates/ptah-engine/src/recorder.rs` (a reader: `RecorderReader::open(dir) -> impl Iterator<Item = RecordEvent>` over the chunk list in order, frames from the `.frames` sidecar)

**Interfaces:**
- `ptah replay DIR --root ROOT [--show ID --venue ID] [--speed 1.0|max] [--capture-dmx PATH] [--compare]`: reads the recorder chunks, rebuilds the input stream (`InEvent` lines) and plays it into a driven engine on the same tree (`FakeMidi::scripted` from the events, `FakeOutput`s), stepping the driven clock to each recorded tick's `drained_at`; `--compare` diffs the replayed frames against the recorded `Frame` records (same index) and prints the first difference and totals; `--capture-dmx` writes a capture of the replay; `--speed` throttles to real time for a TUI to watch (`--ui-port` optional: the replay serves the API too).

- [ ] **Step 1: Write the failing tests**: record a driven run (synthetic timeline, 4 beats) with the recorder on; `RecorderReader` yields the events and frames in order across two chunks (rotate at 30 s of fake time); `replay` of that directory reproduces every recorded frame byte for byte at the same indices (Review Focus 5); a truncated last chunk is skipped with a warning, not a panic. **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit**: `feat(ptah): replay recorder chunks through the engine with frame comparison`

---

### Task 9: Static health on show load, remembered patch, show-load API parity

**Files:**
- Modify: `crates/ptah-engine/src/loader.rs`, `crates/ptah-engine/src/telemetry/{core,mod}.rs`, `crates/ptah-model/src/types/settings.rs` (+ `schemas/settings.schema.json`, `packages/model-tools` mirror and regenerated oracles if the schema gains `currentPatchIndex`), `crates/ptah-engine/tests/engine.rs`, `docs/engine.md`

**Interfaces:**
- On every show load (start-up and `LoadShow`) the loader runs `ptah_model::health::health` with the show's timeline when `show.timeline` names a readable `.mid` beside the show (else without) and publishes the issues in the snapshot as `health: HealthView { issues: Vec<Issue>, at }` (also `GET /api/v1/status`), raising nothing (the spec's §6.4 "static health runs on show load").
- `settings.json` remembers `currentPatchIndex` with the show and venue (additive optional field; migration not needed: absent = 0); the start-up show takes it when present.

- [ ] **Step 1: Write the failing tests**: loading the synthetic show with an `unmapped-note` in its timeline yields that issue in the snapshot; a `LoadShow` to patch 1 writes `currentPatchIndex: 1` and the next start uses it; oracle fixtures unchanged byte for byte (`pnpm allcheck`). **Step 2: Run** → FAIL. **Step 3: Implement** (TypeScript mirror only if the schema changes; keep oracles identical elsewhere). **Step 4: Run** → PASS. **Step 5: Commit**: `feat(ptah-engine): static health on show load and the remembered patch`

---

### Task 10: Pi 4 performance check

**Files:**
- Create: `scripts/pi-bench.sh`, `docs/pi-benchmark.md`
- Modify: `crates/ptah-engine/tests/perf.rs` (an env-gated strict budget: `PTAH_PERF_BUDGET_MS=2` asserts release p99 < 2 ms and prints the numbers), `docs/rust-workspace.md`

**Interfaces:**
- `scripts/pi-bench.sh [user@pi]`: rsyncs the workspace, installs `libasound2-dev pkg-config libudev-dev` once, runs `cargo test --release -p ptah-engine --test perf -- --nocapture` with `PTAH_PERF_BUDGET_MS=2` and `cargo test --release -p ptah-engine --test rig`, copies the numbers back into `docs/pi-benchmark.md` ("Measured on <model, OS, date>").
- **Ruling (controller):** if no Pi 4 is reachable when this task runs, the task records the `qemu-system-aarch64` (or an Apple-silicon ARM64 native) release numbers with a documented scaling factor and marks the Pi row "pending owner's Pi"; the VM tuning items (`evaluate all once`, per-fixture merge capacity) are taken up here ONLY if the measured p99 misses 2 ms, as separate `perf(ptah-vm)` commits with the perf guard proving the gain.

- [ ] **Step 1:** add the env-gated budget and run it locally in release (expect pass on the M4). **Step 2:** run `scripts/pi-bench.sh` on the Pi if reachable, else the documented fallback; **Step 3:** if the budget fails on the target, implement the VM savings until it passes; **Step 4: Commit**: `perf: Pi 4 benchmark script and the 2 ms release budget` (+ `perf(ptah-vm)` commits).

---

### Task 11: Clock validated against real recordings

**Files:**
- Create: `fixtures/clock/reaper-lights.events.jsonl.zst` (the recorder's input events from the Task 7 V2 run, real CoreMIDI timing), `crates/ptah-clock/tests/recordings.rs`
- Modify: `crates/ptah-clock/src/lib.rs` (only if a tuning item fails), `docs/vm-rust.md` ("Tuning items for plan 1D" closed or kept with measurements)

**Interfaces:** the recorded pulse stream from the V1-replay V2 run (Task 7, recorder on) replayed into `BeatClock` in PLL and hard-snap modes: relock error after the file's tempo changes (47 events) under one pulse; no `clock.lost` entry while pulses keep coming; the estimator's error at the ≥ 180 bpm passages (if any in the set; else a synthetic 180 bpm section with the recorded jitter profile resampled) under 1 %; a phase-shifted return (the recording cut and resumed off-grid) relocks within the window.

- [ ] **Step 1: Write the tests** with the bounds above on the recorded stream. **Step 2: Run** → any failure is a clock fix (`fix(ptah-clock)`, bounds unchanged) or a documented, measured limit if the design's own bound is met. **Step 3: Commit**: `test(ptah-clock): relock and estimator bounds on the recorded Reaper clock`

---

### Task 12: Rehearsal checklist, docs, Step 1 exit

**Files:**
- Create: `docs/rehearsal.md`
- Modify: `docs/engine.md` (Known limits updated: what 1D closed, what remains for Step 2+), `README.md` (`ptah run --ui-port/--listen`, `ptah tui`, `ptah play-midi`, `ptah replay`, `ptah compare-captures`, `/debug`), `docs/rust-workspace.md` (crate map: `ptah-server`), `~/projects/ptah/docs/superpowers/specs/2026-10-25-v2-master-plan.md` (Step 1 status line)

**Interfaces:** `docs/rehearsal.md` is the owner's script for spec §11.5: Reaper setup (ReaControlMIDI "MIDI channel: 1", the LIGHTS track routed to the `ptah-v2` virtual port or the cable to the box, clock + SPP sent, the offset note from master plan §9), V2 setup (`ptah import-v1` once, `ptah check`, `ptah run --ui-port 3001` under `ptah supervise`, `ptah tui` on a second terminal, `/debug` in a browser), the four exercises (play a song; pull the Enttec USB cable mid-song and watch `output.lost` then the reopen; `kill -9` the engine mid-song and watch the supervisor resume within a second; stop Reaper's clock for 3 s), what to look at in the TUI for each, and the exit question ("Step 1 exits on the owner's word after that session").

- [ ] **Step 1:** write the docs; verify every command in them runs (`--help` and a `--fake-io` dry run); `pnpm allcheck` green. **Step 2: Commit**: `docs: Step 1D surface, V1 replay procedure and the rehearsal checklist`. **Step 3 (owner):** the rehearsal; its findings become issues or fixes; Step 1 closes on the owner's word.

---

## Self-review notes

- Spec coverage for 1D: §6.3 `ptah replay` → Task 8; §6.4 live health in the API and static health on show load → Tasks 2, 9; §6.6 readout tools → Tasks 3, 4; §9 API → Tasks 1, 2; §10 last-used patch → Task 9; §11.2 V1 replay → Tasks 5, 6, 7; §11.4 performance → Task 10; §11.5 rehearsal → Task 12; the 1C final review's three API regrets → Task 1 (ids/epoch, send id range, serde + accessors) and Task 2 (server-side multiplexing instead of `&mut send`, bounded outboxes instead of silently unsubscribed receivers); the clock tuning list → Task 11; `evaluate all once`/merge capacity → Task 10 (conditional, ruled).
- Type consistency: `capture@1` (Task 6) read by Tasks 7 and 8; the binary frame layout (Task 2) parsed by Tasks 3 and 4 through one shared helper; `Schedule` (Task 5) used by Task 7's script; `VoiceView`/`HealthView`/`LiveHealthView` (Tasks 1, 9) serialized by Task 2 and rendered by Task 4.
- Proportion: twelve tasks, interfaces and tests only; the server's route list and the comparator's rules are the design decisions, named here and documented in code.
- Known risks for the executor: axum's WebSocket upgrade needs the `ws` feature and `tokio` `rt-multi-thread`; `midir` output to another process's virtual *input* port works on CoreMIDI and ALSA (the port appears as a destination); the V1 capture is large (zstd it, keep under 10 MB; if larger, downsample to the 20 ms grid before committing and say so in the README); the in-process replay of 137 k events must stay under the CI budget (batch the FakeMidi feed; the driven engine renders without sleeping).
