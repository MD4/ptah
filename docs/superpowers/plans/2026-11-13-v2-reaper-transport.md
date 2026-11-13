# Reaper Transport From the Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Start, Stop and Go to beginning of Reaper from the Perform page (laptop, phone, palette) over a second virtual MIDI output sending MIDI Machine Control plus three fallback notes.

**Architecture:** The engine owns a `TransportSink` (midir virtual output in `ptah-io`, a recording fake under `--fake-io`) opened at start from `settings.transportPortName`; `Engine::transport(action)` writes the MMC SysEx and the fallback note synchronously off the render thread; the server's owner routes `{"type":"transport"}` to it and builds the ack itself; `/server` reports the port; the ds Perform column gains a Transport section (layout B) with `P`, `S` hold, `H`; the web page wires it to `POST /commands`.

**Tech Stack:** Rust 1.93 (midir virtual output already in `ptah-io`), axum, React 19 + the ds, Vitest, Playwright, Biome.

**Spec:** `docs/superpowers/specs/2026-11-13-v2-reaper-transport-design.md` (V1 repo; approach A, layout B).

## Global Constraints

- Repo `~/projects/ptah-v2`, branch `reaper-transport` from `master` (b41ed2d or later). V1 is never modified.
- No new dependencies (midir already provides virtual outputs). If one becomes necessary: published ≥ 14 days before the day it is added, pinned exactly, date in the commit message.
- The render thread stays allocation- and lock-free: the transport write runs on the owner thread; nothing is added to the frame loop.
- Spec copy exactly: section label `Transport`; buttons `Start`, `Stop`, `Go to start`; keys `P`, `S` (hold 600 ms), `H`; disabled word `no transport`; title `transport port not open (settings.transportPortName)`; palette group `Transport` with `Start Reaper`, `Stop Reaper`, `Go to start`; refusals `transport port unavailable`, `transport send failed`; fault `transport.unavailable`; settings key `transportPortName` (default `"ptah transport"`, `null` disables).
- Bytes (fixed): Play `F0 7F 7F 06 02 F7`; Stop `F0 7F 7F 06 01 F7`; Locate 0 `F0 7F 7F 06 44 06 01 00 00 00 00 00 F7`; fallback notes on channel 16 (status `9F`/`8F`), notes 0 (play), 1 (stop), 2 (home), velocity 127, note-off 10 ms later.
- ds rules: tokens only, motion 80/120/200 ms, no shadows but the focus ring, 44 px targets on a coarse pointer (the ds tap rule), one hairline per composition (the Transport section adds none), nothing shifts at run time; the one-time column change (Emergency up by 76 px) is re-baselined once with the diff named.
- Gates: `cargo test --all` (serial), `cargo clippy --all-targets -- -D warnings`, `cargo fmt --all --check`, the ds gates (`build`, `test`, `typecheck`, `test:storybook`, `test:visual`), `pnpm -F @ptah-app/web test`, the web e2e, `pnpm check && pnpm format`; `pnpm allcheck` once at the end. Tests never touch `~/.ptah`; no V1 services or pm2; an owner `ptah` may be on 8420 (tests pick free ports).
- Conventional Commits with scopes (`feat(engine)`, `feat(io)`, `feat(model)`, `feat(server)`, `feat(ds)`, `feat(web)`, `docs`).

## Review Focus

1. **`S` held while the picker or the palette is open** (a dialog) or while typing: nothing is sent. Test in Task 4 (key rules) and Task 5 (page).
2. **Port fails to open at start** (name taken by another app, or the OS refuses): the engine runs, `/server.transport.open == false`, the fault `transport.unavailable` is raised once, the row is disabled with `no transport`, a palette command answers the refusal toast. Test in Task 1 (fake that fails to open), Task 3 (`/server`), Task 5 (page).
3. **A tap on Stop shorter than 600 ms** on the phone: nothing is sent, the hold line runs back. Test in Task 4 (HoldButton already proves it; the Transport story's play asserts no call).
4. **`transportPortName: null`** (owner disabled it): no port, no fault, `/server.transport == { port: null, open: false }`, row disabled. Test in Task 1 and Task 3.
5. **Two names equal** (`transportPortName` equals a device's `virtualPortName`): `ptah check` reports an error-level issue and `ptah run` refuses to start on that tree, as for any error-level settings issue. Test in Task 2.

---

### Task 1: The transport sink in the engine

**Files:**
- Create: `crates/ptah-engine/src/transport.rs`
- Modify: `crates/ptah-engine/src/lib.rs` (export), `crates/ptah-engine/src/engine.rs` (`EngineConfig.transport`, `Engine::transport`, `Engine::transport_status`), `crates/ptah-engine/src/fakes.rs` (`FakeTransport`), `crates/ptah-engine/src/faults.rs` (`TransportUnavailable` → `transport.unavailable`, state, warning), `crates/ptah-engine/src/telemetry/mod.rs` + `report.rs` (`counters.transport`), `docs/engine.md`
- Test: `crates/ptah-engine/src/transport.rs` (unit), `crates/ptah-engine/tests/transport.rs`

**Interfaces:**
- Produces:
  ```rust
  #[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
  #[serde(rename_all = "lowercase")]
  pub enum TransportAction { Play, Stop, Home }
  pub trait TransportSink: Send {
      /// The port's name as the OS shows it.
      fn name(&self) -> &str;
      /// Write one MIDI message (SysEx or channel voice) now.
      fn write(&mut self, bytes: &[u8]) -> Result<(), String>;
  }
  pub const MMC_PLAY: [u8; 6]; pub const MMC_STOP: [u8; 6]; pub const MMC_LOCATE_ZERO: [u8; 13];
  pub fn fallback_note(action: TransportAction) -> u8;           // 0, 1, 2
  pub fn messages(action: TransportAction) -> [Vec<u8>; 3];       // [mmc, note-on ch16 vel 127, note-off ch16]
  #[derive(Debug, Clone, PartialEq, Eq)]
  pub enum TransportError { Unavailable, Send(String) }           // Display: "transport port unavailable" | "transport send failed"
  #[derive(Debug, Clone, Serialize, PartialEq, Eq)]
  pub struct TransportStatus { pub port: Option<String>, pub open: bool }
  // EngineConfig gains: pub transport: Option<Box<dyn TransportSink>>  (None = disabled)
  // Engine gains:
  pub fn transport(&mut self, action: TransportAction) -> Result<(), TransportError>; // writes the 3 messages in order; the note-off after a 10 ms sleep on the caller's thread
  pub fn transport_status(&self) -> TransportStatus;
  // counters.transport: { play: {sent, failed}, stop: {...}, home: {...} } in the snapshot (TransportCounters)
  // fakes: pub struct FakeTransport { pub fn new() -> Self; pub fn failing(msg: &str) -> Self /* write errs */; pub fn sent(&self) -> Vec<Vec<u8>> } implementing TransportSink with name "fake transport"
  ```
- The fault `transport.unavailable` is raised by whoever fails to open the port (Task 2's `run.rs` wiring calls a new `Engine::transport_unavailable(reason: &str)` that raises it once; `EngineConfig.transport = None` then).

- [ ] **Step 1: Write the failing unit tests** in `transport.rs`:

```rust
#[test] fn the_mmc_bytes_are_the_standard_ones()        // MMC_PLAY == [0xF0,0x7F,0x7F,0x06,0x02,0xF7]; STOP ..0x01..; LOCATE == [0xF0,0x7F,0x7F,0x06,0x44,0x06,0x01,0,0,0,0,0,0xF7]
#[test] fn messages_are_mmc_then_note_on_then_note_off() // messages(Play) == [MMC_PLAY, [0x9F,0,127], [0x8F,0,0]]; Stop note 1; Home note 2
#[test] fn errors_say_the_spec_words()                    // Unavailable.to_string() == "transport port unavailable"; Send(..) == "transport send failed"
```

- [ ] **Step 2: Write the failing engine tests** in `tests/transport.rs` (start an engine with a `FakeTransport` through the test rig / `EngineConfig`, no show needed):

```rust
#[test] fn a_transport_action_writes_the_three_messages_in_order_and_counts()  // transport(Play) ok; fake.sent() == messages(Play); snapshot counters.transport.play == {sent:1, failed:0}; status().open == true, port == Some("fake transport")
#[test] fn without_a_sink_transport_is_refused_and_not_counted()               // transport: None → Err(Unavailable); transport_status() == {port: None, open: false}; no fault
#[test] fn a_failing_write_counts_failed_and_says_send_failed()                 // FakeTransport::failing("boom") → Err(Send("boom")); counters.transport.play.failed == 1
#[test] fn transport_unavailable_raises_the_fault_once()                         // engine.transport_unavailable("no such port") → fault transport.unavailable active, subject "no such port", count 1 after a second call
```

- [ ] **Step 3: Run to verify they fail** — `cargo test -p ptah-engine transport`. Expected: FAIL (module missing).

- [ ] **Step 4: Implement** `transport.rs`, the `EngineConfig` field (default `None`), `Engine::transport` (holds the sink behind the engine's existing non-render mutex/owner state; writes `messages(action)` with a `std::thread::sleep(10 ms)` between the note-on and the note-off; counts; never touches the frame loop), `transport_status`, `transport_unavailable`, the fault code, the counters in the snapshot (`#[serde(default)]`), `FakeTransport`.

- [ ] **Step 5: Run** `cargo test -p ptah-engine && cargo clippy -p ptah-engine --all-targets -- -D warnings`. Expected: PASS, the alloc-guard tests untouched and green.

- [ ] **Step 6: Document** in `docs/engine.md`: a "Transport" subsection (the sink, the three messages, the counters, the fault) and the `EngineConfig.transport` row.

- [ ] **Step 7: Commit** — `git commit -m "feat(engine): a transport sink sends MMC and a fallback note to Reaper"`.

---

### Task 2: The port name in settings, the midir sink, the run wiring

**Files:**
- Modify: `crates/ptah-model/src/types/settings.rs` (`transport_port_name: Option<String>`, serde default `Some("ptah transport")`, explicit `null` → `None`), `schemas/settings.schema.json` (`"transportPortName": { "type": ["string", "null"], "minLength": 1, "default": "ptah transport" }`), `packages/model-tools/src/types.ts` (+ its settings test), `crates/ptah-model/src/lint/settings.rs` (issue when equal to any device's `virtualPortName`), `crates/ptah-io/src/midi/transport.rs` (create: `MidirTransport`), `crates/ptah-io/src/midi/mod.rs`, `crates/ptah/src/cmd/run.rs` (wiring), `docs/engine.md` (`ptah run` and settings), `docs/file-layout.md` if it lists settings keys, `README.md`
- Test: `crates/ptah-model/tests/fixtures_roundtrip.rs`, `crates/ptah-model/src/lint/settings.rs` (unit), `crates/ptah/tests/cli.rs`

**Interfaces:**
- Consumes: Task 1's `TransportSink`, `FakeTransport`, `Engine::transport_unavailable`.
- Produces: `Settings.transport_port_name: Option<String>` (TS `transportPortName?: string | null`); `ptah_io::midi::transport::MidirTransport::open(name: &str) -> Result<MidirTransport, String>` implementing `TransportSink` over `MidirOut::virtual_port`; lint issue code `settings.transportPortName.sameAsInput` (error, message `transportPortName equals a device's virtualPortName: Reaper would see one port for both directions`); run wiring: `--fake-io` → `FakeTransport` when the name is `Some`, else `MidirTransport::open(name)`; on open error → `engine.transport_unavailable(&err)` and `transport = None`; `None` name → nothing.

- [ ] **Step 1: Write the failing tests**

```rust
// ptah-model fixtures_roundtrip.rs
#[test] fn settings_without_transport_port_name_default_to_ptah_transport()   // parse fixture settings → Some("ptah transport"); re-serialize keeps the key absent? No: serialize writes the value; assert round trip equality of the parsed value
#[test] fn settings_with_null_transport_port_name_disable_it()               // {"transportPortName": null} → None
// lint/settings.rs
#[test] fn a_transport_port_named_like_a_device_input_is_an_error()          // device virtualPortName "ptah", transportPortName "ptah" → one issue, code settings.transportPortName.sameAsInput, error level
// cli.rs
#[test] fn run_opens_the_transport_port_and_reports_it()                     // run --fake-io: GET /api/v1/server (after Task 3) — until then assert the log line `ptah run: transport port ptah transport` on stderr and no transport.unavailable fault in GET /status
#[test] fn run_with_a_null_transport_port_opens_none()                       // settings transportPortName null → no log line, no fault
```

- [ ] **Step 2: Run to verify they fail** — `cargo test -p ptah-model transport && cargo test -p ptah --test cli run_opens_the_transport`. Expected: FAIL.

- [ ] **Step 3: Implement** the model field, the schema, the TS mirror, the lint, `MidirTransport` (`write` → `conn.send(bytes)`; SysEx goes through the same `send`), the run wiring (log `ptah run: transport port <name>` once at start), the `pnpm -F @ptah-app/model-tools test` fixtures.

- [ ] **Step 4: Run** `cargo test --all && cargo clippy --all-targets -- -D warnings && cargo fmt --all --check && pnpm -F @ptah-app/model-tools test`. Expected: PASS.

- [ ] **Step 5: Document**: settings key in `docs/engine.md` and the file layout doc; README one line.

- [ ] **Step 6: Commit** — `git commit -m "feat(io): the transport port is a midir virtual output named by settings.transportPortName"` (model + io + run in one commit, or three with scopes).

---

### Task 3: The command and `/server.transport`

**Files:**
- Modify: `crates/ptah-engine/src/command.rs` (`Command::Transport { action: TransportAction }`, JSON `{"type":"transport","action":"play"|"stop"|"home"}`; it is NOT accepted by the frame loop: the loop's match answers it with the refusal `"transport is not a render command"` so a misroute is visible), `crates/ptah-server/src/owner.rs` (`request`: match `Command::Transport { action }` before the engine-send path → `self.engine.transport(action)` → reply `CommandOutcome::Acked { id, ok, message }` at once with `ok` / the error's Display), `crates/ptah-server/src/http/server.rs` (`ServerView.transport: TransportStatus` from `engine.transport_status()` through the owner's `Run` job or a cached copy in `Shared` refreshed at start and after each `transport` call), `docs/api.md` ("Commands" list + `/server` row), `docs/engine.md` ("Commands and acks")
- Test: `crates/ptah-server/tests/http.rs`, `crates/ptah/tests/cli.rs`

**Interfaces:**
- Consumes: Task 1's `TransportAction`, `TransportError`, `TransportStatus`; Task 2's wiring.
- Produces: `POST /api/v1/commands {"type":"transport","action":...}` → `200 { id, ok, message }` with `message` `"ok"` | `"transport port unavailable"` | `"transport send failed"`; `GET /api/v1/server` gains `"transport": { "port": string|null, "open": bool }`.

- [ ] **Step 1: Write the failing tests**

```rust
// http.rs (TestServer with a FakeTransport sink; add TestServer::start_with_transport(root, sink))
#[test] fn a_transport_command_is_acked_at_once_and_written()      // POST play → ok true, message "ok"; the fake's sent() == messages(Play); GET /server.transport == {port:"fake transport", open:true}
#[test] fn a_transport_command_without_a_port_is_refused()         // no sink → ok false, message "transport port unavailable"; /server.transport == {port:null, open:false}
#[test] fn a_bad_action_is_bad_json()                               // {"type":"transport","action":"rewind"} → 400 bad-json
// cli.rs
#[test] fn run_fake_io_answers_transport_and_counts_it()           // POST stop → ok; GET /status counters.transport.stop.sent == 1
```

- [ ] **Step 2: Run to verify they fail** — `cargo test -p ptah-server --test http transport`. Expected: FAIL.

- [ ] **Step 3: Implement** the command variant, the owner routing (no pending entry, no ack ring), the `/server` field, the frame-loop refusal arm.

- [ ] **Step 4: Run** `cargo test --all && cargo clippy --all-targets -- -D warnings && cargo fmt --all --check`. Expected: PASS.

- [ ] **Step 5: Document** `docs/api.md` and `docs/engine.md`.

- [ ] **Step 6: Commit** — `git commit -m "feat(server): POST /commands transport reaches Reaper's port; /server reports it"`.

---

### Task 4: The Transport section in the ds Perform column

**Files:**
- Create: `packages/ds/src/perform/Transport.tsx`, `packages/ds/src/perform/Transport.module.css`
- Modify: `packages/ds/src/perform/Perform.tsx` (props `onTransport?: (action: TransportAction) => Promise<unknown>`, `transportOpen?: boolean`; render `<Transport/>` under `<Emergency/>`; keys `P`/`S`/`H` with the Emergency key rules; palette group `Transport`), `packages/ds/src/perform/index.ts` (export `Transport`, `TransportProps`, `TransportAction` type `"play" | "stop" | "home"`), `packages/ds/src/stories/Perform.stories.tsx` (args + a `Transport` story set), `packages/ds/scripts/test-visual.mjs` (boards `perform-transport` at COLUMN and `perform-transport-phone` at PHONE; the existing Perform boards re-baselined once), `docs/design-system.md` ("Perform, assembled" → "The transport section")
- Test: `packages/ds/src/perform/__tests__/transport.test.tsx`, the stories' play functions

**Interfaces:**
- Consumes: `HoldButton` (`onHold`, `disabled`, `keyshortcuts`), `Button`, `Kbd`, the Emergency CSS module patterns (`.emergency`, `.emergencyHead`, `.label`, `.caption`, `.holdLine`), the ds tap rule, `isTyping`.
- Produces: `Transport(props: { onTransport: (a: TransportAction) => void; open: boolean })` renders `<section aria-label="Transport">` with a 28 px label row (`TRANSPORT`, no keys) and one 40 px row of three buttons: `Start` (`Button`, caption `P`), `Stop` (`HoldButton`, caption `S hold`, hold line), `Go to start` (`Button`, caption `H`); label left, caption right; when `open === false`: all three `disabled`, captions replaced by the dim word `no transport`, `title="transport port not open (settings.transportPortName)"`; no hairline on the section; `data-component="Transport"`; geometry identical in both states (CSS test as 2C does: fixed heights, `min-width` on captions).
- Perform: keys `P` (press → play), `S` (held 600 ms → stop, via the HoldButton ref like `B`), `H` (press → home), only when not typing and no `[role=dialog][aria-modal=true]` is open, no repeat; palette commands `Start Reaper`, `Stop Reaper`, `Go to start` (group `Transport`, no hold); a rejected `onTransport` promise → the existing fault toast path with the engine's message.

- [ ] **Step 1: Write the failing tests** (`transport.test.tsx`, Testing Library, `HoldButton` test clock as in its own tests):

```ts
it("renders the three buttons with their captions and no hairline")      // Start/P, Stop/S + hold, Go to start/H; section has no border-top class
it("a press on Start calls onTransport play; H calls home")
it("Stop fires only after the 600 ms hold")                                 // 300 ms → no call; 600 ms → "stop"
it("when the port is not open the buttons are disabled and say no transport") // disabled, captions "no transport", the title
it("the section's geometry is the same open or not")                        // CSS text: fixed row heights; the rendered boxes' heights equal in both renders
it("keys P, S (held), H drive Perform, not while typing or with a dialog open")  // in Perform with onTransport mocked
```

- [ ] **Step 2: Run to verify they fail** — `pnpm -F @ptah-app/ds test -- transport`. Expected: FAIL.

- [ ] **Step 3: Implement** the composition and its CSS (tokens only; reuse the Emergency module's variables; label row `calc(7 * var(--s1))`, buttons `var(--unit)`, gap `var(--s2)`, side padding `var(--s5)`), the Perform props, keys and palette commands.

- [ ] **Step 4: Stories and boards**: `Transport` stories `Normal`, `Stage`, `Phone`, `NoTransport`; a `Flips` play that toggles `open` and asserts `noShift`; add the two boards; run `pnpm -F @ptah-app/ds update:visual` for the new boards and for the Perform boards whose only change is the added section (name the diff per board in the commit message).

- [ ] **Step 5: Run the ds gates** — `pnpm -F @ptah-app/ds build && pnpm -F @ptah-app/ds test && pnpm -F @ptah-app/ds typecheck && pnpm -F @ptah-app/ds test:storybook && pnpm -F @ptah-app/ds test:visual`. Expected: PASS; every board 0.000 % after the one re-baseline.

- [ ] **Step 6: Document** `docs/design-system.md`.

- [ ] **Step 7: Commit** — `git commit -m "feat(ds): the Transport section — Start, Stop (hold), Go to start under Emergency"`.

---

### Task 5: The page, the e2e, the docs and the owner check

**Files:**
- Modify: `apps/web/src/perform/PerformPage.tsx` (`onTransport = (a) => postCommand({ type: "transport", action: a })`, `transportOpen = server?.transport?.open ?? false`), `apps/web/src/api/types.ts` (`ServerBlock.transport`), `packages/ds/src/perform/checklist/model.ts` (`ServerBlock` type gains `transport?: { port: string | null; open: boolean }`, optional), `apps/web/src/__tests__/performPage.test.tsx`, `apps/web/e2e/perform.spec.ts`, `docs/app.md` ("Transport" section + Reaper setup), `docs/ledgers/step3a-owner-check.md` (criterion 6), `README.md`
- Test: as listed

**Interfaces:**
- Consumes: Task 3's command and `/server.transport`; Task 4's props.
- Produces: the page's Transport section live; the e2e step; the docs.

- [ ] **Step 1: Write the failing tests**

```ts
// performPage.test.tsx
it("the Transport section is enabled when /server says the port is open and sends the command")  // fetch /server → transport {open:true}; click Start → POST /commands {type:"transport",action:"play"}
it("a refused transport command shows the engine's message as a fault toast")                   // POST → {ok:false, message:"transport port unavailable"} → toast text
it("the section is disabled when the port is not open")                                         // transport {open:false} → buttons disabled, "no transport"
// e2e perform.spec.ts (desktop, on the board after step 4)
// step 4b: press P → GET /status counters.transport.play.sent == 1; hold S 700 ms → stop.sent == 1; press H → home.sent == 1; a 200 ms tap on S → stop.sent stays 1
```

- [ ] **Step 2: Run to verify they fail** — `pnpm -F @ptah-app/web test`. Expected: FAIL.

- [ ] **Step 3: Implement** the page wiring and the e2e step (the e2e engine runs `--fake-io`, so the fake sink counts).

- [ ] **Step 4: Run** `pnpm -F @ptah-app/web test && pnpm -F @ptah-app/web typecheck && pnpm -F @ptah-app/web build && cargo build -p ptah && pnpm -F @ptah-app/web test:e2e && pnpm check && pnpm format`. Expected: PASS.

- [ ] **Step 5: Document** `docs/app.md` ("Transport": the three controls, the keys, the hold; Reaper setup: Preferences → MIDI Devices → `ptah transport` → only "Enable input for control messages"; if Start does nothing: Actions → Transport: Play / Stop / Go to start → Add MIDI learn → press the control on the page); owner-check criterion 6 (Start starts Reaper, the hold on Stop stops it, Go to start relocates; record whether MMC acted directly or the notes were learned; verify with an armed track set to all inputs that the notes reach no track); README one line.

- [ ] **Step 6: Run the whole gate** — `pnpm allcheck`. Expected: PASS.

- [ ] **Step 7: Commit** — `git commit -m "feat(web): Reaper transport from the page — Start, Stop, Go to start"` and `docs: …`.

---

## Self-review notes

- Spec coverage: §5.1 → Tasks 1, 2; §5.2 → Task 1; §5.3 → Task 3; §5.4 → Tasks 4, 5; §5.5 → Tasks 1–5 (tests, stories, boards, e2e, owner check); §5.6 → Tasks 2, 3, 4, 5 (docs).
- Names used across tasks: `TransportAction` (1, 3, 4 as the TS union, 5), `TransportSink`/`FakeTransport` (1, 2, 3), `TransportStatus` (1, 3, 5 as `ServerBlock.transport`), `messages(action)` (1, 3), `onTransport`/`transportOpen` (4, 5).
- Review Focus 1–5 pinned in Tasks 4/5, 1/3/5, 4, 1/3, 2.
- The engine's `transport` runs on the owner thread (Task 3 routes before `engine.send`); Task 1's test calls it from the test thread the same way.
