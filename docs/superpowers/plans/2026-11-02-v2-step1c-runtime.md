# V2 Step 1C — Runtime (`ptah-engine`, `ptah-io`, resilience) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The headless engine that runs a show for real: a real-time render thread around `ptah-vm` and `ptah-clock`, input workers for MIDI, OSC and audio, output workers for the Enttec USB Pro and Art-Net, the fault model, stage timers, state journal with resume, flight recorder, quiet policy, supervisor with degradation, live health check, and a fault-injection rig that proves every "show must go on" row of the design in CI. `ptah run` plays a show from `~/.ptah` with no UI.

**Architecture:** Two new crates. `ptah-engine` owns threads and policy but keeps the frame loop a pure function (`Loop::tick`) over injected time and queues so it is testable without threads; the render thread is a thin wrapper that adds the timer, real-time priority and the watchdog. Everything that touches a file, a socket or a log lives on the telemetry thread, the loader thread or a worker, never on the render thread. `ptah-io` implements the device workers behind two traits (`InputWorker`, `OutputSink`) so the fault-injection rig can substitute fakes for every device. The API server, the terminal readout, the replay tool and the V1 replay oracle are plan 1D; this plan exposes in-process channels they subscribe to.

**Tech Stack:** Rust 1.93.0 pinned; `rtrb` (wait-free SPSC), `triple_buffer`, `midir` (CoreMIDI/ALSA/WinMM, virtual ports), `serialport`, `rosc`, `cpal`, `tracing` + `tracing-subscriber` (+ `tracing-appender`), `serde_json`, `thiserror`, `clap`; dev: `tempfile`. Platform threads via `std::thread`; real-time priority via `thread-priority` (or direct `libc`/`mach` calls behind one function, `unsafe` allowed only in that function under a file-level allow with the reason).

**Spec:** `docs/superpowers/specs/2026-10-26-v2-step1-engine-design.md` (copy `ptah-v2/docs/specs/step1-engine.md`) §3, §4.2, §4.3 (transport), §4.5, §4.6, §4.7, §5 (table and 5.1–5.4), §6 (6.1–6.5), §8, §9 (API rules only as they constrain channel shapes), §10. Binding contract for the VM and clock: `ptah-v2/docs/vm-rust.md` (every obligation under "Open items plan 1C owns" is a task below). Previous ledgers: `ptah-v2/docs/ledgers/step1b-*`.

## Global Constraints

- Repository `~/projects/ptah-v2`, branch `step1c-runtime` off `master` (c0624a9 or later). Private.
- Gates on every commit: `cargo fmt --all --check`, `cargo clippy --all-targets -- -D warnings` (pedantic on), `cargo test --all`, `pnpm allcheck`. Conventional Commits with a crate scope.
- "No heap allocation, no file or network IO, no logging, no locking on a shared mutex in the render thread" (spec §3, §4.2). The render-thread code path (`Loop::tick` and everything it calls) is guarded by the counting allocator the same way `ptah-vm` is (Task 4).
- "Every dropped, unmapped or clamped value is counted and visible" (spec §3): each drop path in this plan increments a named counter that reaches the fault list or the counters snapshot.
- Fault codes are exactly the spec §6.2 list plus `merge.overflow` (added by 1B) and `engine.degraded` (§5.2): `clock.lost`, `clock.relocked`, `input.lost`, `input.dropped`, `output.lost`, `output.late`, `render.late`, `render.overrun`, `program.faulted`, `voice.stolen`, `mapping.unmapped`, `value.clamped`, `engine.resumed`, `journal.failed`, `recorder.failed`, `quiet.active`, `merge.overflow`, `engine.degraded`.
- Files: `~/.ptah` layout (`ptah_model::store::Layout`); the engine writes only under `runtime/` (`state.json`, `recorder/`, `logs/`, `live-health.json`) plus `settings.json` for "last used"; it never writes V1 paths.
- Timestamps are monotonic nanoseconds (`u64`) end to end; MIDI events carry the driver packet timestamp when the backend provides one (CoreMIDI `MIDITimeStamp` converted to the monotonic base, ALSA sequencer time), else arrival time (`vm-rust.md` "Events").
- The frame loop snapshots the clock at drain time, never ahead of undrained events (`vm-rust.md`).
- Defaults from settings (Task 4 of 1B): `renderRateHz` 44, `quietAfterSeconds` 120, `resumeWithinSeconds` 60, `recorderMinutes` 10, `debugRateHz` 20, `polyphonyPerInstance` 16, `heldVoiceCapBeats` 16, `realtimePriority` true, `osc.port`, `audio.device`, `audio.levelRangeDb`.
- Universe output rates: default 40 Hz (`rateHz` on the universe output when present).
- Crash-only outside the render thread (spec §5.3): invariant violations abort; inside the render thread guards return defaults and count.
- No new TypeScript except the two additive schema fields of Task 1 (`show.clockMode`, Art-Net `port`), mirrored in `model-tools` with regenerated oracles byte-identical elsewhere.
- Every test is hermetic: `PTAH_HOME` per test, fake devices, injected time; no real MIDI port, serial port or socket is opened by tests except the loopback tests marked `#[ignore]` for manual runs.

## Review Focus

Spec-implied inputs no task's tests would otherwise exercise, most likely to bite first; each has its pinning test added to the owning task:

1. Two MIDI devices send clock at once (a controller with "send clock" left on): only the `clockMaster` device's pulses reach the clock, the other's are counted, the beat does not double-time. → Task 7.
2. The USB Pro is unplugged while the write is in flight and replugged with a different `/dev/cu.*` name: the worker re-opens by serial number, the first frame after reopen is the current one, `output.lost` clears. → Task 9.
3. The journal file is truncated mid-write by a power loss (half a JSON): resume detects the invalid file, starts clean with the fallback look, raises `journal.failed`, and does not crash-loop. → Task 6.
4. A Program Change arrives for a song index the show does not have: no voice is stopped, `mapping.unmapped` is raised for the PC, the current song stays. → Task 5.
5. The render rate setting is changed while running (API command): the timer re-arms at the new period on the next frame; `dt_seconds` reflects it; no double frame. → Task 4.

---

## File structure

```
ptah-v2/
  Cargo.toml                                  members += crates/ptah-engine, crates/ptah-io
  schemas/show.schema.json, venue.schema.json Task 1 additive fields; model-tools + Rust types mirrored
  crates/ptah-model/src/store/load.rs         Task 1: load_tree_partial, migrations on the load path, needs-migration
  crates/ptah-vm/src/show/{mod,frame,load}.rs Task 2: restore passthrough + rebase, osc_addresses, NoteMap, quiet fade hook, per-instance cost hook, scene journal/chase; Task 3: per-voice parameters
  crates/ptah-engine/
    Cargo.toml
    src/lib.rs
    src/time.rs            Nanos, MonotonicClock trait (real + fake), Timer trait
    src/event.rs           InEvent (timestamped envelope around ptah_vm Event / clock message / transport / command), lanes
    src/queue.rs           EventQueue: two rtrb SPSC rings (critical lane never dropped; bulk lane drops oldest + counts)
    src/command.rs         Command enum (load show/venue/patch, override, song, internal clock, trigger, set param, set render rate, shutdown) + Ack
    src/frame_loop.rs      Loop: drain → clock → snapshot → render_frame → publish → stats; pure over injected time/queues
    src/render_thread.rs   RenderThread: timer, RT priority (one unsafe fn), watchdog heartbeat, show swap
    src/loader.rs          Loader thread: load_tree_partial + CompiledShow::new + health; swap protocol
    src/publish.rs         UniversePublisher: triple buffer per universe + debug-rate subscriber channel
    src/faults.rs          Fault, FaultCode, FaultList (bounded), Severity, transitions
    src/timers.rs          StageTimers: histograms p50/p99/max over 10 s and run
    src/telemetry.rs       Telemetry thread: consumes stats/faults/voice snapshots, owns FaultList, timers, journal, recorder, live health, broadcaster
    src/journal.rs         StateJournal: write every 250 ms + transport; resume (validate, age, rebase run beats, orphan marking)
    src/recorder.rs        FlightRecorder: ring of chunk files under runtime/recorder/
    src/quiet.rs           QuietPolicy
    src/live_health.rs     LiveHealth: seen vs mapped sets, writes runtime/live-health.json
    src/supervisor.rs      supervise(): child restart, backoff, degradation levels
    src/engine.rs          Engine: wires everything; EngineHandle (commands, subscriptions, counters snapshot)
    src/devices.rs         InputWorker / OutputSink traits + DeviceRegistry (names, indices, hot-plug)
    src/fakes.rs           FakeMidi, FakeOutput, FakeClockTime for tests and the rig (pub for the rig and 1D's replay)
    tests/frame_loop.rs    Task 4
    tests/faults.rs        Task 5
    tests/journal.rs       Task 6
    tests/rig.rs           Task 11: the eight fault-injection scenarios
    tests/perf.rs          Task 12
  crates/ptah-io/
    Cargo.toml
    src/lib.rs
    src/midi/{mod,parse,backend}.rs   Task 7: midir backend, virtual port, hot-plug, parser (incl. CC14/NRPN pairing), timestamps
    src/osc.rs                        Task 8
    src/audio/{mod,analysis}.rs       Task 8: cpal capture + reduction (level, bands, onset)
    src/usbpro.rs                     Task 9: Enttec framing, serial-number open, reconnect
    src/artnet.rs                     Task 9: ArtDMX
    tests/{parse,analysis,usbpro_frame,artnet_frame}.rs
  crates/ptah/src/cmd/{run,supervise}.rs, main.rs   Task 10; `check --live` Task 13
  docs/engine.md                               Task 14 (contract for 1D)
```

---

### Task 1: Model and store additions the runtime needs

**Files:**
- Modify: `schemas/show.schema.json` (`clockMode?: "pll" | "hard-snap"`), `schemas/venue.schema.json` (Art-Net `port?: integer 1..65535`), `packages/model-tools/src/types.ts`, `docs/schemas.md`, `crates/ptah-model/src/types/{show,venue}.rs`, `crates/ptah-model/src/store/load.rs`, `crates/ptah-model/src/tree.rs`, `docs/rust-workspace.md`; regenerate `fixtures/oracles/model/*` (byte-identical except where a new case is added)
- Test: `crates/ptah-model/tests/store.rs`, `tests/fixtures_roundtrip.rs`

**Interfaces:**
- `Show.clock_mode: Option<ClockModeSetting { Pll, HardSnap }>`; `UniverseOutput::Artnet { host, port: Option<u16>, net, subnet, universe }`.
- `pub fn load_tree_partial(layout: &Layout) -> PartialLoad { loaded: Loaded, failed: Vec<TreeResult> /*files with error-level issues*/, warnings: Vec<TreeResult>, migrated: Vec<PathBuf> }`: loads every file that validates, skips the rest, never fails as a whole; a show whose `show.json` fails is absent; a show with one broken program loads without that program (its instances get `program.faulted` later at `CompiledShow::new`).
- Migrations on the load path: `load_tree_partial` runs `load_entity` (the migration chain, backup, validate-then-write) per file; a file whose tag is a known entity with an older `@n` that has no migration is reported with the new tree code `needs-migration`; a newer `@n` with `future-version`. `validate_tree` reports the same two codes instead of `unknown-schema` for known entities.

- [ ] **Step 1: Write the failing tests**: round-trip of a show with `clockMode: "hard-snap"` and a venue with Art-Net `port: 6455`; `load_tree_partial` on a tempdir copy of `fixtures/` with one program file broken and one venue file invalid → `loaded` has 4 shows (one missing a program), 3 venues, `failed` names the two files; a `settings@0` file with a fake migration registered → migrated and listed; a `settings@0` file with no migration → `needs-migration` in `failed`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** both sides; regenerate oracles (`git diff --stat fixtures/` shows only the lint-cases file if a case was added, else nothing). **Step 4: Run** `pnpm allcheck` → green. **Step 5: Commit**: `feat(model): clockMode and Art-Net port; partial load_tree with migrations on the load path`

---

### Task 2: VM runtime hooks

**Files:**
- Modify: `crates/ptah-vm/src/show/{mod,frame,load,scenes}.rs`, `src/voices.rs`, `docs/vm-rust.md`
- Test: `crates/ptah-vm/tests/frame.rs` (extend; the allocation window covers every new per-frame path)

**Interfaces:**
- `CompiledShow::restore_voices(&mut self, snaps: &[VoiceSnapshot], now_run: f64)` (passthrough to `VoiceManager::restore`) and `rebase_run_beats(snaps, journal_run_now, now_run)` as a free helper: `start_run' = now_run − (journal_run_now − start_run)`.
- Scene voices journaled and chased: `VoiceSnapshot` gains scene voices (`kind: Program | Scene`), `jump_to` moves scene fade starts like program voices.
- `osc_addresses(&self) -> &[String]` (index = `SourceKey::Osc` number).
- `NoteMap::new(show, compiled) -> NoteMap` built from `channel_map::note_starts`: `lookup(device, channel, note) -> impl Iterator<Item = (instance, member: Option<u32>)>` over mappings, honouring `channel: "any"` and device filters; `is_mapped_cc/pc/osc(...)`. Allocation-free lookups (dense `[device][channel][note]` tables of ranges into one `Vec`).
- Quiet hook: `CompiledShow::set_quiet_fade(factor: f64)` (1.0 normal, 0.0 silent) applied in the live pass to free-running program voices only (not held, not scenes); `FrameStats.quiet_faded: bool`.
- Per-instance cost hook: `FrameInput.measure_instances: bool`; when set, `render_frame` records per instance the monotonic nanoseconds spent in its voice evaluation and writes into a preallocated `Vec<u64>` readable via `instance_costs()`; the clock read comes from a `&dyn Fn() -> u64` set at `new` (the engine passes the monotonic clock; tests a fake). Off by default: no clock read.
- `CompiledShow::song_count()`, `set_song(index) -> bool` (false when out of range; nothing changes).

- [ ] **Step 1: Write the failing tests**: journal round-trip incl. a scene voice and a run-beat rebase (`now_run` advanced by 3 beats → voice `time` continues correctly); `jump_to` moves a scene fade; `osc_addresses` equals the show's bound addresses in `SourceKey` order; `NoteMap` on the synthetic show finds the per-member range notes with the right member offsets and reports an unmapped note as empty; quiet fade 0.5 halves a free-running voice's level, leaves a held voice and a scene untouched; cost hook off → the clock closure is never called (counting fake), on → per-instance sums equal the frame total within 1%; `set_song(99)` returns false; allocation window still 0.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS (`cargo test -p ptah-vm --test frame -- --nocapture` shows 0 allocations). **Step 5: Commit**: `feat(ptah-vm): runtime hooks (restore, scene journal/chase, NoteMap, osc addresses, quiet fade, instance cost, songs)`

---

### Task 3: Per-voice parameters (`velocityTo`, per-note poly aftertouch)

**Files:**
- Modify: `crates/ptah-vm/src/{voices.rs, bindings.rs, show/{load,frame,sources}.rs}`, `docs/vm-rust.md`, `docs/vm-instruction-set.md` §10 (one sentence: per-voice sources resolved per voice)
- Test: `crates/ptah-vm/tests/frame.rs`, `tests/voices.rs`

**Interfaces:**
- A parameter bound to `midi.polyAftertouch` or targeted by `velocityTo` is a **per-voice parameter**: each voice (per member) owns its `ParamSlew` for those parameters, initialised from the instance-level value at voice start; a `Source { MidiPolyAftertouch { device, channel, note } }` event updates the target of every live voice whose `key.note == note` (and device/channel match); `velocityTo` sets the voice's parameter target to `velocity × (max − min) + min` at start (and on retrigger). Instance-level parameters stay shared. The two load warnings are removed.
- Memory: per voice slot, one `ParamSlew` per per-voice parameter (sized at `new`); no allocation per frame.

- [ ] **Step 1: Write the failing tests**: two voices on the same instance with notes 60 and 62, poly aftertouch on 60 drives only voice 60's parameter (bytes differ on their fixtures); `velocityTo` on a `per-member` instance gives each member its own value; retrigger re-applies velocity; load emits no `instance.velocity-to-unsupported` / `binding.poly-aftertouch-per-instance`; allocation window still 0 with per-voice parameters in play.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit**: `feat(ptah-vm): per-voice parameters (velocityTo, per-note poly aftertouch)`

---

### Task 4: `ptah-engine` core: time, events, queues, the pure frame loop, publisher

**Files:**
- Create: `crates/ptah-engine/{Cargo.toml, src/lib.rs, src/time.rs, src/event.rs, src/queue.rs, src/command.rs, src/frame_loop.rs, src/publish.rs, src/fakes.rs (FakeClockTime only for now), tests/frame_loop.rs, tests/support/alloc.rs}`
- Modify: root `Cargo.toml` members and `[workspace.dependencies]` (`rtrb`, `triple_buffer`, `thread-priority` or none yet)

**Interfaces:**
- `time.rs`: `type Nanos = u64; trait MonotonicClock { fn now(&self) -> Nanos; }` with `RealClock` (`Instant` since process start) and `FakeClockTime { set(now), advance(d) }`.
- `event.rs`: `InEvent { at: Nanos, seq: u64, device: u16, kind: InKind }` with `InKind::{ Vm(ptah_vm::Event), ClockPulse, Start, Continue, Stop, Spp(u16), ProgramChange(u8), Panic /*all notes off*/ }`; `lane(&self) -> Lane::{Critical, Bulk}` (clock, transport, notes, PC critical; CC/aftertouch/pitch bend/OSC/audio bulk).
- `queue.rs`: `EventQueue::new(critical_cap, bulk_cap) -> (EventProducer, EventConsumer)`; producers are `Clone`-able per worker through one multiplexing thread? No: rtrb is SPSC, so **one ring pair per worker**; `EventConsumer::drain_into(&mut Vec<InEvent>, now) -> DrainStats { dropped_bulk }` merges all worker rings in timestamp order using a fixed-size k-way merge (no allocation), assigns `seq` in that order, and never drops critical events (a full critical ring makes the producer spin for up to 1 ms then count `input.dropped` with the critical flag, which the fault list treats as its own severity).
- `command.rs`: `Command::{ LoadShow{show_id, venue_id, patch_index}, SetOverride{kind, value}, SetSong(u8), InternalClock{tempo, running}, Trigger{instance, member, velocity, on: bool}, SetParam{instance, param, value}, SetRenderRate(f64), SetFallbackLook(bool), Shutdown }` and `Ack { id, ok, message }`; commands travel on their own SPSC ring and are applied at the next drain.
- `frame_loop.rs`: `Loop::new(settings, clock_config, queues, command_rx, publisher, telemetry_tx, time: Arc<dyn MonotonicClock>)`, `Loop::swap_show(Box<CompiledShow>) -> Box<CompiledShow>`, `Loop::tick(&mut self, now: Nanos) -> TickReport { frame_index, deadline, late_by, stats }`: drain → feed clock in timestamp order (clockMaster filter by device index; non-master clock counted) → snapshot at drain time → build `FrameInput` (dt from previous drain) → apply transport (`stop_all`, `jump_to`, song switch) → `render_frame` → publish universes → push `FrameStats`, clock state, timers and the `TickReport` to telemetry. `next_deadline(&self) -> Nanos` from the render rate (re-armed on `SetRenderRate`); an overrun skips to the next grid point.
- `publish.rs`: `UniversePublisher::new(universe_numbers, debug_rate_hz)`; `publish(frame_index, &[[u8;512]], at)` writes each universe's triple buffer (no allocation) and, at the debug rate, pushes a `DebugFrame { frame_index, at, universes: Arc<[[u8;512]]> }`? — Arc allocation is on the render thread: instead the debug stream is a second triple buffer per universe read by the telemetry thread at the debug rate. `OutputReader` per universe for workers (`read_latest() -> (&[u8;512], frame_index, at)`).

- [ ] **Step 1: Write the failing tests** (`tests/frame_loop.rs`, fake time, HILLDALE or synthetic show): a note-on then note-off across frames renders the expected bytes on the published buffer; clock pulses from the master advance the beat, pulses from another device are counted and ignored (Review Focus 1); Stop → `stop_all` → fallback look; Continue+SPP → `jump_to`; PC in range switches song, out of range counts `mapping.unmapped` (Review Focus 4); bulk-lane overflow drops oldest CC and counts, critical lane keeps notes under a 10 000 CC/s flood (spec rig scenario 5, loop-level); `SetRenderRate(22)` re-arms the deadline with no double frame (Review Focus 5); `tick` allocates nothing after the first frame (counting allocator around `tick` with events in the queue); an overrun (fake time jumps 3 frames) skips to the next grid point and reports `late_by`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit**: `feat(ptah-engine): time, events, lanes, queues, commands, pure frame loop and publisher`

---

### Task 5: Faults, timers, telemetry thread, quiet policy

**Files:**
- Create: `src/faults.rs`, `src/timers.rs`, `src/telemetry.rs`, `src/quiet.rs`, `tests/faults.rs`

**Interfaces:**
- `FaultCode` enum (the exact list in Global Constraints) with `Severity::{Info, Warning, Error}` per code (`clock.lost`, `output.lost`, `input.lost`, `render.overrun`, `engine.degraded`, `journal.failed`, `recorder.failed`, `program.faulted` are errors; `clock.relocked`, `engine.resumed`, `quiet.active`, `voice.stolen`, `merge.overflow`, `mapping.unmapped`, `value.clamped`, `input.dropped`, `output.late`, `render.late` warnings/info as the design table implies — document the mapping). `Fault { code, subject: SmallString /*device, universe, instance id*/, first_at, last_at, count, active }`; `FaultList::new(cap)` bounded (one entry per (code, subject)); `raise(code, subject, at)`, `clear(code, subject, at)`, `snapshot() -> Vec<Fault>` (allocates; telemetry thread only).
- `StageTimers`: fixed-bucket log histograms for `queue_wait`, `frame_work`, `publish_to_sent[universe]`, `sent_to_written[universe]`, `end_to_end` (note arrival → first frame whose published bytes differ on a channel that note maps to: computed on the telemetry thread from `DebugFrame`s and the `NoteMap`), each with 10 s rolling and run-wide `p50/p99/max`.
- `Telemetry` thread: receives `TelemetryMsg::{ Tick(TickReport, FrameStats, ClockState), Fault(code, subject, at), OutputSent{universe, frame_index, at}, OutputWritten{..}, VoiceSnapshot(Vec<VoiceSnapshot>) /*at journal cadence*/, Params(Vec<ParamSnapshot>), Ack(Ack) }` over an SPSC ring (render side never blocks: full ring drops the Tick's timers, counts `telemetry.dropped` internally, never drops faults); derives faults from deltas (`stolen`, `merge_overflow`, `clamped`), clock transitions (`Locked→FreeRun` raises `clock.lost`, back clears it and raises `clock.relocked`), `render.late` (deadline missed) and `render.overrun` (> 2 frames, subject = worst instance from `instance_costs` when measurement was on; the engine turns measurement on for 1 s after any overrun); exposes `TelemetrySnapshot { faults, timers, counters, clock, frame_index }` through an `ArcSwap`/`RwLock` read by 1D's API and the live health; feeds the journal (Task 6), recorder (Task 6) and the quiet policy.
- `QuietPolicy::new(quiet_after_seconds)`: `observe_input(at)`, `evaluate(now) -> QuietState::{Normal, FadingOut{factor}, Quiet}` producing a `Command::SetQuietFade(factor)` ramp 1→0 over 2 s after the threshold; any MIDI/OSC input cancels (factor back to 1 at once); raises/clears `quiet.active`.

- [ ] **Step 1: Write the failing tests**: fault list bounded and keyed per (code, subject); clock `Locked→FreeRun→Locked` yields `clock.lost` active then cleared plus `clock.relocked`; `stolen` delta raises `voice.stolen` once per frame with the instance subject; `render.late` on a missed deadline and `render.overrun` naming the worst instance after a 3-frame overrun; timers: 1000 fake samples → p50/p99 within one bucket of the exact quantiles; end-to-end timer: a note at `t` whose first differing published frame is at `t+30 ms` records 30 ms; quiet policy: 120 s silence → fade over 2 s → `quiet.active`; one CC cancels it immediately.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit**: `feat(ptah-engine): fault model, stage timers, telemetry thread and quiet policy`

---

### Task 6: State journal with resume, flight recorder, logging

**Files:**
- Create: `src/journal.rs`, `src/recorder.rs`, `src/logging.rs`, `tests/journal.rs`

**Interfaces:**
- `StateJournal::write(path, &JournalState)` atomic via `write_atomic`; `JournalState { schema: "journal@1", show_id, venue_id, patch_index, song, beat, run_beat, tempo_bpm, clock_mode, clock_state, mono_ns, wall_unix_ms, voices: Vec<VoiceSnapshot>, params: Vec<ParamSnapshot>, overrides, fallback_look }`; the telemetry thread writes it every 250 ms and on every transport event (debounced to one write per 50 ms).
- `StateJournal::read(path) -> Result<JournalState, JournalError>` (invalid JSON or schema → `Err`, never panic); `resume_plan(state, now_wall, now_mono, resume_within_seconds) -> ResumePlan::{ Clean{reason}, Resume{ beat_advance, run_beat_now, voices_rebased, mark_orphan: true } }`: resume only when the journal's age is under the limit; `beat` advanced by `age × tempo` (if the journal said the clock was running), run beats rebased (`vm-rust.md`), every resumed voice marked orphan-risk with the cap; raises `engine.resumed{age}`; a journal that fails to read raises `journal.failed` and resolves to `Clean`.
- `FlightRecorder::new(dir, minutes, debug_rate)`: appends `RecordEvent::{ Input(InEvent), Frame{frame_index, at, universes}, Fault(..), Tick(TickReport) }` to the current chunk file (`<mono_ns>.jsonl` plus a binary `.frames` file for frame bytes), rotates every 30 s, deletes chunks older than `minutes`; `list_chunks() -> Vec<ChunkInfo>`; a write error raises `recorder.failed` once and stops recording until the next successful rotation.
- `logging.rs`: `init(layout, console: bool)` installs `tracing` with a JSON file layer in `runtime/logs/` (daily rotation via `tracing-appender`) and a human console layer; the render thread never logs (no `tracing` macro in `frame_loop.rs`, `publish.rs`, `queue.rs`; a test greps for it).

- [ ] **Step 1: Write the failing tests**: journal round-trip; truncated journal file → `Err`, `Clean`, `journal.failed` (Review Focus 3); age 30 s under limit 60 → `Resume` with `beat_advance = 30 × tempo/60` and rebased run beats; age 90 s → `Clean`; recorder writes chunks, rotates at 30 s of fake time, prunes beyond `minutes`, lists chunks; a recorder dir made read-only (unix) → `recorder.failed` once, engine state unaffected; the no-logging-on-render-path grep test.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit**: `feat(ptah-engine): state journal with resume, flight recorder, logging sinks`

---

### Task 7: `ptah-io` MIDI worker

**Files:**
- Create: `crates/ptah-io/{Cargo.toml, src/lib.rs, src/midi/mod.rs, src/midi/parse.rs, src/midi/backend.rs, tests/parse.rs}`
- Modify: `crates/ptah-engine/src/devices.rs` (create: traits + registry), `src/fakes.rs` (`FakeMidi`)

**Interfaces:**
- `ptah_engine::devices`: `trait InputWorker { fn start(self: Box<Self>, producer: EventProducer, registry: Arc<DeviceRegistry>) -> WorkerHandle; }`, `DeviceRegistry` maps settings device ids → dense indices and names, tracks `present: bool` per device, raises/clears `input.lost{device}`; `WorkerHandle { stop(), join() }`.
- `ptah_io::midi::parse`: a pure, allocation-free state machine `MidiParser::new(device_index)`, `feed(bytes: &[u8], at: Nanos, out: &mut impl FnMut(InEvent))` handling running status, realtime bytes interleaved in any position, note on/off (velocity 0 = off), CC with **CC14 pairing** (MSB 0–31 followed by LSB 32–63 within 20 ms → one `Source{MidiCc14}` plus the plain CC events? — ruling: emit the 7-bit CC event immediately *and* a CC14 event when the LSB completes; bindings pick what they bind to), NRPN (98/99 then 6/38 → `MidiNrpn`), pitch bend, channel and poly aftertouch, Program Change, clock/Start/Continue/Stop/SPP, Active Sensing ignored, SysEx skipped; every event stamped `at` (the backend passes the driver timestamp).
- `ptah_io::midi::backend` (midir): opens every enabled device by name and the virtual input `virtualPortName` (CoreMIDI/ALSA; on backends without virtual ports it logs and continues), converts driver timestamps to the engine's monotonic base once at open (offset measured against `RealClock`), polls for missing devices every 1 s (hot-plug by name), marks `present`; only forwards clock/transport from the `clockMaster` device index (others still parsed; their clock bytes counted as `clock.ignored` in a counter visible in telemetry).
- `FakeMidi` (engine `fakes.rs`): a scripted input worker fed from a `Vec<(Nanos, Vec<u8>)>` or from a `Timeline` (`ptah_model::smf`) played at a tempo with clock pulses, Start/Stop and SPP, so the rig and 1D's player share it.

- [ ] **Step 1: Write the failing tests** (`tests/parse.rs`): running status across a realtime byte in the middle of a note message; velocity-0 note-off; CC14 pairing within the window and not across it; NRPN assembly; pitch bend centre; poly aftertouch carries the note; SPP 14-bit assembly; SysEx skipped incl. a realtime byte inside it; clock bytes from a non-master device are tagged and the loop test of Task 4 (Review Focus 1) passes through `FakeMidi`; `FakeMidi` plays `fixtures/shows/synthetic/timeline.mid` and emits the expected number of notes and 24 pulses per beat.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS (the midir backend is compiled but exercised only by an `#[ignore]` loopback test that opens the virtual port and sends to itself). **Step 5: Commit**: `feat(ptah-io): MIDI parser, midir backend with virtual port, hot-plug and driver timestamps`

---

### Task 8: OSC and audio workers

**Files:**
- Create: `crates/ptah-io/src/osc.rs`, `src/audio/{mod,analysis}.rs`, `tests/analysis.rs`
- Modify: `crates/ptah-engine/src/fakes.rs` (`FakeOsc`, `FakeAudio`)

**Interfaces:**
- `OscWorker::new(port, addresses: Vec<String> /*from CompiledShow::osc_addresses()*/)`: UDP socket, `rosc` decode, exact-address match → `Source{Osc{index}, raw: first float/int arg}`; `> 0`/`0` on an address bound as a trigger → `TriggerStart/Stop` (the engine resolves which); unmatched addresses counted (`osc.unmatched`) and recorded for the live health; bundle timetags ignored (arrival time); socket error → `input.lost{osc}` and re-bind every 1 s.
- `audio::analysis::Analyzer::new(sample_rate, level_range_db)` pure: `feed(block: &[f32]) -> Option<AudioFrame { level, low, mid, high, onset: bool }>` every 10 ms: RMS → dBFS → 0..1 over `[−level_range_db, 0]`; three biquad band-passes (centres 100 Hz, 1 kHz, 8 kHz, Q 1) → RMS each → same mapping; onset = spectral flux over a 256-bin magnitude spectrum exceeding a running median × 1.5 (document constants). Allocation-free after `new`.
- `AudioWorker` (cpal): opens `settings.audio.device` (or default), pushes `Source{Audio{measure}}` per frame; device loss → `input.lost{audio}`, sources hold, re-open every 1 s.

- [ ] **Step 1: Write the failing tests**: analyzer on synthetic signals: silence → level 0; full-scale sine → level 1; a 100 Hz sine → `low` dominant, 8 kHz → `high` dominant; a click train → onsets at the clicks, none between; OSC decode of a float message to the right index and an unmatched address counted (using `rosc` encode in the test, no socket); `FakeOsc`/`FakeAudio` deliver scripted values through the Task 4 loop and move a bound parameter.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit**: `feat(ptah-io): OSC listener and audio capture with level/band/onset reduction`

---

### Task 9: Output workers: Enttec USB Pro, Art-Net, debug publisher

**Files:**
- Create: `crates/ptah-io/src/usbpro.rs`, `src/artnet.rs`, `tests/usbpro_frame.rs`, `tests/artnet_frame.rs`
- Modify: `crates/ptah-engine/src/devices.rs` (`OutputSink` trait), `src/fakes.rs` (`FakeOutput`)

**Interfaces:**
- `trait OutputSink { fn open(&mut self) -> Result<(), SinkError>; fn send(&mut self, frame: &[u8; 512], channels: u16) -> Result<SentAt, SinkError>; fn close(&mut self); fn identity(&self) -> String; }` plus `OutputWorker::spawn(sink, reader: OutputReader, rate_hz, telemetry)`: loop { read latest; if new or 1 s since last send, `send`; sleep to rate; on `Err` → close, raise `output.lost{universe}`, poll `open` every 500 ms, on success send the current frame at once and clear }; reports `OutputSent{universe, frame_index, at}` and, for USB Pro, `OutputWritten` after the blocking write returns; `output.late` when a send takes longer than two periods.
- `usbpro.rs`: Enttec DMX USB Pro framing (`0x7E`, label 6, length LE, start code 0, data, `0xE7`), `serialport` open by **serial number** (enumerate `UsbPort` info; fall back to the first Enttec VID/PID when `serial` is absent, as V1 took the first `/dev/cu.usbserial*`), 1 s write timeout, break handling left to the device; `frame_bytes(&[u8;512], channels) -> [u8; 518]` pure.
- `artnet.rs`: ArtDMX packet (`"Art-Net\0"`, OpCode `0x5000`, ProtVer 14, Sequence 1..255 wrapping, Physical 0, SubUni/Net from `net/subnet/universe`, Length = channels rounded to even), UDP to `host:port` (default 6454), socket send errors counted and `output.lost` after 5 consecutive; `packet(seq, net, subnet, universe, &[u8;512], channels) -> Vec<u8>` built once into a reusable buffer.
- Debug publisher (engine `publish.rs`, extend): the telemetry thread reads the debug triple buffers at `debugRateHz` and broadcasts `DebugFrame`s on a `tokio::sync::broadcast`-free, std `Vec<Sender>` subscription list (1D wraps it in WebSocket); only while at least one subscriber exists.

- [ ] **Step 1: Write the failing tests**: `usbpro::frame_bytes` exact bytes for a 3-channel frame and a 512-channel frame; `artnet::packet` exact header for net 0 / subnet 1 / universe 2, sequence wrap 255 → 1, odd length rounding; `OutputWorker` with `FakeOutput`: a send error → `output.lost` raised, reopen succeeds after 2 fake polls, the first frame after reopen equals the latest published frame (Review Focus 2, rig scenario 2); a 1 s idle resend; `output.late` when the fake send blocks 3 periods; serial-number selection picks the matching port among two fake enumerations.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS (real serial/UDP paths behind `#[ignore]` manual tests). **Step 5: Commit**: `feat(ptah-io): Enttec USB Pro and Art-Net output workers with reconnect`

---

### Task 10: `Engine`, render thread, loader, `ptah run`, `ptah supervise`

**Files:**
- Create: `crates/ptah-engine/src/{render_thread.rs, loader.rs, engine.rs, supervisor.rs}`, `crates/ptah/src/cmd/{run,supervise}.rs`
- Modify: `crates/ptah/src/main.rs`, `crates/ptah/tests/cli.rs`

**Interfaces:**
- `Engine::start(config: EngineConfig { layout, settings, inputs: Vec<Box<dyn InputWorker>>, sinks: Vec<(universe_number, Box<dyn OutputSink>)>, time: Arc<dyn MonotonicClock>, degradation: u8 }) -> EngineHandle`; `EngineHandle { commands: CommandSender, telemetry: TelemetryReader, debug_frames: fn subscribe(), live_health: fn snapshot(), shutdown() }`. Start-up: `load_tree_partial` → resume plan from the journal (Task 6) per the degradation level (0 resume, 1 clean last show, 2 nothing loaded) → `CompiledShow::new` on the loader thread → swap → workers up.
- `RenderThread::spawn(loop_: Loop, time, realtime_priority: bool) -> RenderHandle`: a timer loop at the render rate on `RealClock` (`sleep_until` with a 1 ms spin margin), real-time priority via one function `set_realtime_priority()` (macOS time-constraint policy; Linux `SCHED_FIFO` with fallback to nice −20; failure → a fault `render.priority` once, keep running), a heartbeat `AtomicU64` the watchdog thread checks every 250 ms: no frame for 1 s → `abort()` (crash-only); the `Loader` thread handles `Command::LoadShow` end to end and swaps at a frame boundary via a one-slot mailbox; the old show is dropped on the loader thread.
- `ptah run [--root] [--show id] [--venue id] [--degradation N] [--no-rt]`: builds the real workers from settings and the venue outputs, starts the engine, blocks until SIGINT/SIGTERM or `Shutdown`, exits 0; prints one JSON line per second with counters when `--status`.
- `ptah supervise [args passed through]`: spawns `ptah run` as a child, restarts on exit after 200 ms, backs off to 5 s after five crashes in 60 s, computes the degradation level (0 → 1 after three crashes in 60 s → 2 after three more; a child alive 60 s resets), passes it with `--degradation`, keeps the child's stderr tail for the recorder directory (`runtime/supervisor.log`), raises nothing itself (the child raises `engine.degraded`).

- [ ] **Step 1: Write the failing tests**: an in-process `Engine` with `FakeMidi`, `FakeOutput` and `FakeClockTime` plays the synthetic timeline for 4 beats and the fake output received frames whose bytes equal a direct `CompiledShow` run with the same events (loop-level parity); `LoadShow` while running swaps at a frame boundary with no dark frame (the frame after the swap renders the new show's fallback look); watchdog: a loop whose `tick` is made to hang (test hook) triggers the abort path (test the decision function, not the abort); `supervisor` decision function: crash timestamps → restart delay and degradation level per the table; CLI: `ptah run --root <tmp> --show <id> --venue <id> --no-rt --frames 10` (a hidden flag that exits after N frames with fake sinks) exits 0 and writes `runtime/state.json`; `ptah supervise` with a child that exits immediately backs off as specified (fake child via a test binary flag).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS; `pnpm allcheck` green. **Step 5: Commit**: `feat(ptah-engine): Engine, render thread with RT priority and watchdog, loader, run and supervise`

---

### Task 11: Fault-injection rig (the eight scenarios in CI)

**Files:**
- Create: `crates/ptah-engine/tests/rig.rs` (+ `tests/support/rig.rs` helpers)

**Interfaces:** `Rig::new(show, venue, patch, settings)` builds an in-process `Engine` with `FakeMidi`, `FakeOutput` per universe, `FakeClockTime`, and a reference `CompiledShow` run in lock-step to compare bytes; helpers `advance(ms)`, `unplug_output(u)`, `replug_output(u)`, `stop_clock(ms)`, `kill_and_resume()` (drops the engine, reads the journal, starts a new engine with the same fakes, compares), `flood_cc(rate, ms)`, `inject_overrun(frames)`.

- [ ] **Step 1: Write the eight scenarios** of spec §5.4 with the bounds stated there: (1) clock stops 3 s → output continues, beat error < 1/24 at relock, no frame missed; (2) output closed 2 s → first frame after reopen equals the current render, no stale frame; (3) kill mid-trace + resume → within 1 s the output equals the un-killed reference within ±2 per channel for running programs, `engine.resumed` raised, resumed voices orphan-marked; (4) divide-by-zero program → bytes equal the reference (255/0), `value.clamped` counted, others unaffected; (5) 10 000 CC/s flood for 2 s → no missed deadline, no note dropped, `input.dropped` reports the CC count; (6) injected overrun → `render.late` counted, next frame on the grid, no catch-up burst; (7) a journal that makes the loader panic → supervisor-style degradation to level 1 starts clean on the fallback look (test the engine's handling of a poisoned journal + the decision function); (8) a note ending inside a restart gap is released within the cap; a note still held across the gap ends on its real note-off.
- [ ] **Step 2: Run** → the scenarios that depend on unfinished behaviour FAIL; **Step 3: Fix the engine** until all pass (the rig is the arbiter; do not weaken bounds). **Step 4: Run** `cargo test -p ptah-engine --test rig` → 8 pass; CI runs it. **Step 5: Commit**: `test(ptah-engine): fault-injection rig with the eight Step 1 scenarios`

---

### Task 12: Performance and allocation guard on the real loop

**Files:**
- Create: `crates/ptah-engine/tests/perf.rs`
- Modify: `docs/rust-workspace.md`

- [ ] **Step 1: Write the tests**: the counting allocator around `Loop::tick` over 100 frames of the generated 512 × 20 rig from `ptah-vm` with CC floods and note churn → 0 allocations (incl. drain, clock feed, publish, telemetry push); per-frame time printed and asserted < 20 ms debug on the builder's machine; a release-mode `cargo bench`-free measurement printed (`cargo test --release -p ptah-engine --test perf -- --nocapture`) recorded in the report; the per-instance cost hook on for 1 s costs < 5% extra.
- [ ] **Step 2: Run** → fix any allocation found (replace the structure, never the test). **Step 3: Commit**: `test(ptah-engine): allocation and timing guard on the frame loop`

---

### Task 13: Live health check

**Files:**
- Create: `crates/ptah-engine/src/live_health.rs`
- Modify: `crates/ptah/src/cmd/check.rs` (`--live`), `crates/ptah/tests/cli.rs`

**Interfaces:** `LiveHealth` on the telemetry thread records, per (device, channel), every note, CC, PC and OSC address seen and whether the `NoteMap`/binding tables mapped it; `mapping.unmapped` raised once per subject; written to `runtime/live-health.json` every 5 s (`{ since, seen: [...], unmapped: [...] }`); `ptah check --live [ROOT]` reads that file and prints the unmapped set in the same formats as `check` (JSON with `--json`), exit 1 if any unmapped.

- [ ] **Step 1: Write the failing tests**: play the synthetic timeline plus an unmapped note 99 and an unbound CC 77 through the in-process engine → `live-health.json` lists both as unmapped and the mapped ones as seen; `ptah check --live` prints them and exits 1; after a show swap the sets restart.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit**: `feat(ptah-engine): live health check and check --live`

---

### Task 14: Documentation and the 1D contract

**Files:**
- Create: `ptah-v2/docs/engine.md`
- Modify: `docs/rust-workspace.md`, `README.md`, `docs/vm-rust.md` (open items now closed are moved to a "done in 1C" note)

`docs/engine.md` documents for 1D: the `EngineHandle` surface (commands and acks, telemetry snapshot shape, debug-frame subscription, live health), fault codes and severities, counters, the journal and recorder file formats (`journal@1`, chunk naming), `FakeMidi`/`FakeOutput` for the replay tool and the V1 replay oracle, the `ptah run`/`supervise` flags, the RT-priority behaviour per platform, and the remaining open items for 1D (API, TUI, `play-midi`, `replay`, the V1 capture driver, the Pi benchmark, the clock tuning list, evaluate-`all`-once, per-fixture merge capacity, OSC patterns, ReaControlMIDI channel note).

- [ ] **Step 1: Write** the docs; verify every command runs; `pnpm allcheck` green. **Step 2: Commit**: `docs: Step 1C engine contract for the surface plan`

---

## Self-review notes

- Spec coverage for 1C: §4.2 threads/queues → Tasks 4, 10; §4.3 transport wiring → Task 4; §4.5 inputs → Tasks 7, 8; §4.7 outputs and debug stream → Task 9; §5 table rows → Tasks 4 (overrun/late, queue lanes), 5 (quiet, faults), 6 (journal, disk full), 9 (outputs), 10 (watchdog, supervisor, crash-only), 11 (the proofs); §5.1 journal/resume/orphans → Tasks 6, 11; §5.2 supervisor → Task 10; §5.4 rig → Task 11; §6.1 timers → Task 5; §6.2 faults → Task 5; §6.3 recorder → Task 6; §6.4 live health → Task 13; §6.5 logging → Task 6; §10 files/runtime dir → Tasks 1, 6, 10; `vm-rust.md` open items → Tasks 1 (partial load, migrations, clockMode, Art-Net port), 2 (restore passthrough and rebase, scene journal/chase, osc addresses, NoteMap, quiet hook, cost hook, songs), 3 (per-voice parameters), 4 (timestamps and drain, transport calls), 5 (faults from stats and clock), 10 (lifecycle). Out of 1C by design: HTTP/WebSocket server, TUI, `/debug` page, `play-midi`, `replay`, the V1 capture driver and replay oracle, the Pi benchmark (1D).
- Type consistency: `InEvent`/`Lane`/`EventQueue` (Task 4) used by 7–9, 11; `FaultCode` (5) by 6, 9, 10, 13; `OutputSink`/`InputWorker` (7, 9) by 10, 11; `JournalState` (6) by 10, 11; `NoteMap` (2) by 5, 13; `FakeMidi` (7) by 10, 11, 12 and 1D.
- Proportion: fourteen tasks, interfaces and tests only, no bodies; constants that are design choices (band centres, onset threshold, timer buckets, spin margin) are named in the task that owns them and must be documented in code.
- Known risks for the executor: `midir` virtual ports exist on CoreMIDI/ALSA only (WinMM lacks them: log and continue); CoreMIDI timestamps are `mach_absolute_time` units and need the timebase conversion; `SCHED_FIFO` needs capabilities on Linux (fall back, raise once); the rig's "kill and resume" is in-process (drop + rebuild), the real process kill is covered by the supervisor test and 1D's rehearsal.
