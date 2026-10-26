# PTAH V2 — Step 1: the engine (headless, feature parity, show must go on)

Date: 2026-10-26. Status: builder-checked, awaiting owner approval.
Parent: `2026-10-25-v2-master-plan.md` (Step 1, sections 4.1, 4.5, 7, 9).
Contract it implements: Step 0 (`ptah-v2/docs/vm-instruction-set.md`,
`docs/schemas.md`, `docs/file-layout.md`, `fixtures/**`, README "How Step 1
consumes this").

## 1. Intent

Step 1 delivers the Rust engine that will run the band's shows instead of
V1: one headless binary that takes MIDI from Reaper, evaluates the show,
and drives the Enttec USB Pro and Art-Net nodes, with an HTTP/WebSocket API
for the UI that comes in Step 3.

The owner's requirement for this step, in their words: *"perfectly fail
safe and resilient to any unexpected event or error like the loss of any
part of the chain (USB DMX device etc.). It should reconnect/recover and
continue. The main thing is 'show must go on', recover at any price and
continue playing the show without stopping."*

The failures that motivate it happened with V1 on stage: lights firing
late, programs computing wrong values mid-show, and one blackout that
recovered after twenty seconds. None of them was an unplugged cable. They
came from inside the engine: a shared event loop that stalls, time derived
from tick counts, and an output path that can back up silently. The
owner plays an instrument during the show and cannot touch a button, so
every decision the engine makes under failure must be good enough
unattended.

### Success looks like

- The HILLDALE show, driven by Reaper through the same virtual port as
  today, produces the same DMX frames as V1 within the oracle tolerance,
  with every difference classified and accepted.
- Pulling the Enttec, killing Reaper's MIDI port, or killing the engine
  process in the middle of a song changes nothing visible on stage beyond
  the physical gap, and the engine is back to the correct state without
  anyone acting.
- Every stage latency, dropped value and fault is measured and visible
  while the show runs, and recorded for the day after.
- The 44 Hz render loop never allocates, never does IO, and never waits on
  anything but its timer.

## 2. Goals, non-goals, anti-goals

**Goals**

- Feature parity with V1 as inventoried in the master plan §3, with the V1
  importer, on macOS and Linux ARM64 from one source.
- Everything the Step 0 contract specifies: schemas and lint codes, the VM,
  bindings, scenes, triggers, fallbacks, merge, render, position chase on
  live events, V1 and V2 oracles.
- Inputs: MIDI (virtual port, class-compliant devices, several at once,
  every channel, every parameter source of master plan §4.2), OSC over
  UDP, audio capture reduced to level, band and onset.
- Outputs: Enttec USB Pro, Art-Net, several universes, each at its own
  rate; a debug frame stream over the API.
- The resilience layers of §5: a render loop that cannot stop, workers
  that restart forever, outputs that hold and never back up, free-running
  time on clock loss, persisted voice state and resume after restart,
  program-level fault isolation, a quiet policy and a fallback look.
- Observability of §6: stage timers, fault counters, flight recorder,
  live health check, a terminal readout and a throwaway web page.
- An HTTP + WebSocket API that Step 3's UI, Step 4's debug mode and Step
  5's visualizer consume unchanged.

**Non-goals** (deferred to a later step by owner decision on 2026-10-26)

- Reading the LIGHTS track content from the Reaper project (`.rpp`) or a
  `.mid` file. With it come: the file-based health check, scrub to any
  position, exact state reconstruction after a gap, and rehearsal mode
  playing a file without a DAW. Step 1 keeps the two hooks that make this
  additive (§7). The owner refuses any export step; when this lands it
  reads the Reaper project directly.
- Any real UI. The design system is Step 2; the readout tools of §6.6 are
  disposable.
- Wheel capabilities, fan and pixel effects (master plan §2 roadmap).
- sACN, Ableton Link, MTC, native RTP-MIDI in the engine (Step 7 or later;
  the input abstraction accepts them).
- Packaging, installers, system service units (Step 7). Step 1 ships a
  binary and a built-in supervisor.

**Anti-goals**

- A button in the performance path. Nothing in Step 1 requires a human
  during a song. Recovery is automatic and silent on stage.
- A failure that is invisible. V1's twenty-second blackout was not known
  to V1. Every stage of the chain is measured, and staleness anywhere
  raises a fault before it is seen on stage.
- Allocation, locking on a shared mutex, file or network IO, or logging
  from the render thread.
- Extrapolating fader values. Faders hold their last value; only time is
  extrapolated.
- Correctness by eye. Parity is proven by the oracles and the V1 replay;
  resilience is proven by the fault-injection rig.

## 3. Constraints

- Rust stable, one workspace, one binary `ptah`; macOS (Apple silicon and
  Intel) and Linux ARM64/x86-64 from the same source.
- Performance budget (master plan §7): 512 instances × 20 nodes evaluated
  under 2 ms per frame on a Pi 4; zero heap allocation in the render
  thread; no network or file IO in the render thread.
- Files: `~/.ptah` with the Step 0 layout (`docs/file-layout.md`); JSON,
  versioned, migrated on load. V2 never writes V1's files; V1 files are
  read only by the importer.
- Every dropped, unmapped or clamped value is counted and visible (master
  plan §7).
- Node.js only for the web toolchain, never at runtime.
- Numbers: f64 in the VM, matching the reference evaluator within `1e-9`;
  render bytes exact.
- The band's fixtures and MIDI exports stay in the private repository.

## 4. Architecture

### 4.1 Workspace

Rust workspace in `ptah-v2/` beside the existing pnpm workspace:

| Crate | Responsibility |
| --- | --- |
| `ptah-model` | Types for every Step 0 file, JSON (de)serialization, schema-equivalent validation and lint with the same codes as `model-tools`, file layout and identity, migrations, V1 importer. No IO beyond reading files handed to it. |
| `ptah-vm` | Compiler and evaluator per `vm-instruction-set.md`: ops, slot buffer, voice state, bindings, scenes, fallbacks, merge, render. Pure, `no_std`-style discipline (no allocation after compile), the only crate the render thread calls. |
| `ptah-clock` | Beat counter: PLL and hard-snap on MIDI clock, SPP/Start/Continue/Stop, free-run, internal clock. Pure. |
| `ptah-engine` | The runtime: threads, queues, the render loop, voice manager, fault model, state journal, metrics, flight recorder, supervisor. |
| `ptah-io` | Workers: MIDI in (`midir`), OSC in (`rosc`), audio in (`cpal`) and its reduction, Enttec USB Pro (`serialport`), Art-Net (UDP). Each behind one trait per direction. |
| `ptah-server` | HTTP + WebSocket API (`axum` on `tokio`), static file serving, the throwaway page. |
| `ptah` (bin) | CLI: `run`, `supervise`, `import-v1`, `check`, `tui`, `replay`, `oracles`. |

Crate choices are my call and the builder may swap any of them inside the
constraints: `midir` (virtual ports on CoreMIDI and ALSA, multiple
devices), `serialport`, `rosc`, `cpal`, `tokio` + `axum`, `serde_json`,
`rtrb` (wait-free SPSC ring buffers), `triple_buffer` (latest-frame
publication), `tracing`, `jsonschema` or hand-written validation
reproducing the lint codes (the fixtures decide).

### 4.2 Threads and queues

```
 MIDI worker ──┐                                    ┌── Output worker (USB Pro, universe 1)
 OSC worker  ──┼─ events (SPSC, timestamped) ─► RENDER THREAD ─ frames (triple buffer per universe) ─┼── Output worker (Art-Net, universe 2)
 Audio worker ─┘            ▲                      │  │                                         └── ...
                            │                      │  └─ metrics/faults/voice snapshots (SPSC) ─► Telemetry thread ─► journal, recorder, API
 API/server (tokio) ─ commands (SPSC) ─────────────┘
```

- **Render thread.** One OS thread, real-time priority where the platform
  allows (macOS: time-constraint policy; Linux: `SCHED_FIFO` if permitted,
  else highest nice), pinned timer at the configured rate (44 Hz default,
  per settings). Each frame: drain the event queue, advance the clock to
  the frame's deadline time, update voices, evaluate, merge, render,
  publish frames, push telemetry. It owns every buffer it touches; all
  buffers are sized at show load. If a frame overruns, the next one is
  computed at the next grid point, never catching up with a burst.
- **Input workers.** One thread per device or socket. They parse, stamp
  each event with the monotonic time of arrival, and push to the render
  queue. They never block on the render thread (the queue is wait-free;
  on overflow the oldest events are dropped and counted, except clock,
  transport and note events, which have a reserved lane that is never
  dropped).
- **Output workers.** One thread per universe. Each loops: take the latest
  published frame, send it, sleep to its own rate. A slow or stuck device
  never holds frames; it just sends a newer one when it recovers. Each
  reports the time its last frame left (and, for USB Pro, when the write
  completed) to telemetry.
- **Telemetry thread.** Receives metrics, faults and voice snapshots from
  the render thread, maintains the fault list and histograms, writes the
  state journal, feeds the flight recorder and the API broadcaster. All
  file IO happens here or in the server, never in the render thread.
- **Server.** `tokio` runtime on its own threads. Commands to the render
  thread go through a queue and are acknowledged by a telemetry message.

Show loading happens off the render thread: the new show is compiled and
all buffers allocated in a loader thread, then swapped in by pointer at a
frame boundary. The old show is dropped by the loader.

### 4.3 Clock

`ptah-clock` implements the master plan §4.1 beat counter:

- **PLL mode** (default): each MIDI clock pulse corrects a phase and tempo
  estimate; the render thread reads a fractional beat at any monotonic
  time. Tempo jumps follow within a few pulses.
- **Hard-snap mode** (per show): beat = pulse count / 24 exactly, frames
  rendered on the grid with the last pulse's value.
- **Transport**: Start sets beat 0 and resets voices (V1 behaviour: black
  out and reset); Continue resumes at the SPP position; Stop freezes the
  beat and resets program state as V1 does. SPP while stopped sets the
  position and triggers position chase on live state (§4.6).
- **Free-run**: when no pulse arrives within a tolerance (two expected
  pulse intervals plus 20 ms), the counter keeps advancing at the last
  tempo and a `clock.lost` fault is raised. The first pulse back re-locks
  without a jump larger than one pulse unless SPP says otherwise.
- **Internal clock**: a set tempo, started and stopped by API command.
  Used by the oracles, the builder transport later, and tests.
- **Multiple clock sources**: the device marked `clockMaster` in settings
  drives the counter; clock from other devices is ignored and counted.
- **Time always advances.** Before any external clock has been seen, the
  counter runs internally at the show's default tempo (`show.tempoBpm`,
  default 120, a Step 1 additive field) so API or pad triggers and scene
  fades behave between songs. Once locked, loss of clock means free-run
  at the last tempo. **Stop** is a transport event, not a loss: it kills
  every voice and freezes the beat position as V1 does, so the stage
  shows the fallback look; voices triggered afterwards (API, pad, a
  second controller) advance their own `time` from the internal clock at
  the last tempo. The engine therefore distinguishes "stopped" (Stop
  received) from "clock lost" (pulses missing while playing).

Time inside the VM: `beat` from the counter, `time` = beat − voice start
beat, `dtSeconds` from the monotonic clock. Nothing is derived from a tick
count.

### 4.4 Voices, evaluation, merge, render

Exactly the Step 0 contract. Summary of what the engine adds around it:

- The **voice manager** turns triggers into voices per the contract §12
  (distribution `all`, `per-member`, `spread`; `memberOffset`; note ranges;
  velocity; `onStop`), keeps one `VoiceState` per voice per member, and
  assigns `voiceSeed` from a per-show counter so a replay is reproducible.
- **Bindings** follow §10, with slew evaluated per frame and "last changed
  wins" across sources. Each parameter source is keyed by device, channel
  and number so two MIDI devices never collide.
- **Merge** follows §6 of the instruction set and the spec: HTP intensity,
  LTP for the rest where "latest" means the **voice start time** (the
  trigger's arrival), never the write time, since every voice writes
  every frame; `legacy` per attribute for imported instances; fall back to
  the previous contributor on release.
- **Render** follows §7, bytes exact against `fixtures/oracles/v2-render`.
- **Overrides** (`blackout`, `houseLights`, `master`, `freeze`) are
  applied after merge, before render, from API commands and from
  mappings.

Buffers: voices, member states, slot buffers, merge layers and universe
frames are preallocated at show load for the maximum the show can need
(instances × members × polyphony cap, the cap per instance from the show
or a settings default of 16 voices). Exceeding the cap steals the oldest
voice and counts a `voice.stolen` fault.

### 4.5 Inputs

- **MIDI**: every enabled device from settings plus the host virtual port
  (`virtualPortName`, created on CoreMIDI and ALSA). All 16 channels
  parsed; notes, CC, CC14 pairs, NRPN, pitch bend, channel and poly
  aftertouch, Program Change (song select against the show's song list),
  clock, Start/Continue/Stop, SPP. Hot-plug: a device that disappears is
  re-opened by name whenever it reappears, polling every second. Events
  carry (device id, channel) so mappings and sources address them as Step
  0 models.
- **OSC**: one UDP listener on a settings port; each `osc` source is an
  address pattern with optional `min`/`max` per the contract; unmatched
  messages are counted.
- **Audio**: capture from a settings-selected input device; a worker
  computes per block (10 ms) level (RMS, dBFS mapped to 0..1 over a
  configured range), bands (low, mid, high via biquad filters) and onset
  (spectral flux threshold), and pushes them as `audio` source values.
  Capture failure is a fault, sources hold their last value, the device
  is re-opened on reappearance.

### 4.6 Position chase in Step 1

Without a loaded timeline (the deferred feature), position chase is V1
behaviour on live state: an SPP or Continue sets the beat; voices that are
running continue from the new beat (their `time` is recomputed from their
start beat relative to the new position, which may stop voices whose
release has elapsed). Nothing is reconstructed. The engine exposes the
entry point `jump_to(beat)` that the later timeline feature extends.

### 4.7 Outputs

- **Enttec USB Pro**: opened by serial number from the venue's universe
  output (or the first USB Pro found when unspecified, as V1); DMX frames
  at the universe's rate (default 40 Hz, as V1); writes with a timeout;
  any error closes the port, raises `output.lost`, and the worker polls
  for the device every 500 ms, re-opening and immediately sending the
  current frame. The last frame is never queued: a stuck write delays only
  itself.
- **Art-Net**: one UDP socket; ArtDMX per universe at the universe's rate
  to the configured node address or broadcast; sequence numbers; no
  acknowledgement exists, so health comes from the socket send result.
  Optional ArtPoll discovery in the API for the UI later.
- **Debug stream**: the published frames are also sent to the API
  broadcaster, throttled to the configured debug rate (default 20 Hz) and
  only while a client subscribes.
- Universes with no reachable output still render; their frames are
  visible in the debug stream.

## 5. Resilience layers

The ordering principle, agreed with the owner: under any failure the
engine chooses the behaviour that would be least visible if the failure
lasted half a second, because most do, and it never requires a human.

| Failure | Engine behaviour | Visible on stage |
| --- | --- | --- |
| MIDI clock stops (port gone, Reaper hung) | Free-run at last tempo; running programs continue; re-lock on the first pulse back; fault `clock.lost` | Nothing, unless the tempo changed meanwhile |
| MIDI device unplugged | Re-open on reappearance; notes that fired meanwhile are lost (counted) | Programs that should have started during the gap are missing until their next trigger |
| Enttec unplugged, serial error, stuck write | Render continues; worker re-opens on reappearance and sends the current frame; fault `output.lost` | Fixtures hold their last DMX value (fixture behaviour), then snap to the current look |
| Art-Net node unreachable | Keep sending; socket errors counted; fault after N consecutive | Depends on the node's hold behaviour |
| A program produces NaN or ±Infinity | Passed through the graph and scrubbed only at render (`toChannelValue`: NaN → 0, +∞ → 255), exactly as V1 and the reference evaluator; counted as `value.clamped`. No numeric guards on the hot path: every op is a total function on f64 and cannot panic | Whatever V1 showed for that program |
| A program fails to compile at show load (bad edge, cycle, missing subgraph) | The instance is disabled with `program.faulted`; the rest of the show loads | That instance never lights |
| One instance eats the frame budget | Measured per instance; `render.overrun` names the worst instance; nothing is aborted | A late frame |
| Render frame overruns its deadline | Skip to the next grid point; count `render.late`; if the overrun exceeds two frames, raise a fault | A frame held 23 ms longer |
| Render thread stalls (bug, deadlock) | Internal watchdog aborts the process after 1 s of no frame; the supervisor restarts it; state resumes from the journal (below) | Fixtures hold for about the restart time (target under 1 s on a Mac, under 2 s on a Pi 4) |
| Engine crashes | Same as above | Same |
| Input queue overflows | Oldest non-critical events dropped and counted; clock, transport and notes have a reserved lane | Fader steps |
| Disk full or unwritable | Journal and recorder stop with a fault; the show continues | Nothing |
| No MIDI at all for a long time (quiet policy) | After `quietAfterSeconds` (settings, default 120) free-running voices fade out over 2 s; held looks stay; a new event cancels the policy | Lights stop moving in silence instead of strobing to nothing |
| Nothing running at all (start-up, after Stop, after quiet) | The show's **fallback look**: a scene referenced by the show (`fallbackSceneId`, optional). Without one, the frame is black as V1 | Dim stage light between songs instead of black, if the show defines it |

### 5.1 State journal and resume

The telemetry thread writes a snapshot of the live state every 250 ms and
on every transport event to `~/.ptah/runtime/state.json` (atomic rename):
show id, venue id, patch id, beat position and tempo, clock mode and lock
state, the monotonic and wall time of the snapshot, every running voice
(instance, member, note, velocity, start beat, gate, stop beat), every
parameter's current and target value, the active overrides and song.

On start, if a journal exists whose wall time is less than
`resumeWithinSeconds` (settings, default 60) old, the engine loads the same
show, venue and patch, advances the beat by the elapsed time at the
journaled tempo, recreates every voice at its position with a fresh
`VoiceState` (stateful ops restart, as position chase does), restores
parameters and overrides, and raises `engine.resumed` with the gap length.
Otherwise it starts clean with the last-used show and the fallback look.

**Lost note-offs** (owner decision, 2026-10-26). A note-off can be lost
three ways: the device was unplugged, the engine restarted and Reaper's
note-off fell in the gap, or an event was dropped. Any voice that was
resumed from the journal, or whose input device went away while it was
held, is marked *orphan-risk* and is released automatically after
`heldVoiceCapBeats` (settings, default 16) counted from the moment of the
incident, unless its note-off arrives first. The instance may override the
cap (`instance.heldVoiceCapBeats`, a number or `"unlimited"`). Voices
whose note-off path was never broken are not capped. Retrigger of the same
note, Stop, Start and Program Change still end such a voice as usual. The
deferred timeline feature replaces the cap with the note's real end when a
timeline is loaded. Fault-injection scenario 8: a note ending inside a
restart gap is off within the cap; a note still held across the gap ends
on its real note-off when that arrives before the cap.

Voice `VoiceState` contents (z1, smooth, random, adsr internals) are not
journaled; a resumed `adsr` restarts its attack at the current `time`,
which is the accepted imperfection of the contract's chase rule.

### 5.2 Supervisor

`ptah supervise` runs the engine as a child process and restarts it on any
exit with a 200 ms delay, backing off to 5 s after five crashes in a
minute, never giving up. It is what the owner runs, and what Step 7 wraps
in launchd and systemd units. `ptah run` is the bare engine for tests.
The child's stderr is kept by the parent for the recorder.

**Escalation against a deterministic crash.** The supervisor counts
crashes in a 60 s window and passes a degradation level to the child:
level 0 resumes from the journal; after three crashes, level 1 ignores
the journal and starts the last show clean on the fallback look; after
three more, level 2 starts with no show loaded, API up, outputs black,
fault `engine.degraded`. A child alive for 60 s resets the counter. Each
level raises its own fault so the readout shows what was given up.
Fault-injection scenario 7 covers a journal that crashes the loader.

### 5.3 Crash-only design

Any invariant violation outside the render thread aborts the process;
nothing attempts to limp on in an unknown state, because the journal and
supervisor make a restart cheaper and safer than a guess. Inside the
render thread, guards return defaults and raise faults instead, because an
abort there costs a visible gap.

### 5.4 Fault-injection rig

A test harness in `ptah-engine` that runs the engine in-process with fake
devices and asserts recovery bounds. Scenarios shipped with Step 1:

1. Clock stops mid-trace for 3 s, returns: output continues with beat
   error under one pulse at re-lock, no frame missed.
2. Output device closed mid-trace, reopened after 2 s: the first frame sent
   after reopen equals the current render output, no stale frame.
3. Engine killed mid-trace and resumed from journal: within 1 s of restart
   the output equals the un-killed run within the oracle tolerance for the
   programs that were running.
4. A program whose node divides by a parameter driven to 0: its bytes equal
   the reference evaluator's (255 for +∞, 0 for NaN), every other instance
   matches the reference run, and `value.clamped` counts it.
5. Input flood (10 000 CC per second): render deadlines hold; notes are
   never dropped; dropped CC count is reported.
6. Frame overrun injected (a test op that sleeps): `render.late` counted,
   next frame on the grid, no catch-up burst.

These run in CI on every push, in addition to the oracles.

## 6. Observability

### 6.1 Stage timers

Per event and per frame, measured on the monotonic clock and aggregated
as histograms (p50, p99, max over the last 10 s and the whole run):

- `input.arrival → render.start` (queue wait)
- `render.start → render.end` (frame work)
- `render.end → output.sent` per universe (publication to wire)
- `output.sent → output.written` for USB Pro (serial write complete)
- end to end: MIDI note arrival → first frame carrying its change on the
  wire. This is level 2 of the master plan's DAW offset advisor and is
  exposed as such in the API.

### 6.2 Faults

A fault has a code, a severity, a first/last time, a count, and a current
state (active or cleared). The list is bounded (one entry per code and
subject). Codes in Step 1: `clock.lost`, `clock.relocked`, `input.lost`,
`input.dropped`, `output.lost`, `output.late`, `render.late`,
`render.overrun`, `program.faulted`, `voice.stolen`, `mapping.unmapped`
(a note, CC, Program Change or OSC address that maps to nothing),
`value.clamped`, `engine.resumed`, `journal.failed`, `recorder.failed`,
`quiet.active`.

### 6.3 Flight recorder

A ring buffer of the last `recorderMinutes` (settings, default 10) of
input events, frames (at the debug rate), faults and metrics, written by
the telemetry thread to `~/.ptah/runtime/recorder/` as timestamped chunk
files, oldest deleted. `ptah replay <dir>` plays a recording through the
engine with the internal clock for post-mortem, and the API exposes the
chunk list so Step 4's debug mode can scrub it.

### 6.4 Live health check

While the show runs, the engine keeps the set of notes, CCs, Program
Changes and OSC addresses seen and whether each mapped to something, per
device and channel. `ptah check --live` and the API return the unmapped
set, so a rehearsal run-through finds every hole without any file. The
Step 0 static health (`health.ts`) is ported too and runs on show load.

### 6.5 Logging

`tracing` with a JSON file sink in `~/.ptah/runtime/logs/`, daily rotation,
and a human console sink. Never from the render thread: it pushes
telemetry; the telemetry thread logs.

### 6.6 Readout tools (disposable)

- `ptah tui`: a terminal client of the API showing per universe the DMX
  grid, running voices with beat position, the last input events, stage
  timers and active faults. It doubles as the box's diagnostic screen
  over SSH.
- The server serves `/debug` with one static HTML file: coloured squares
  per fixture from the frame stream, the fault list, the timers. No
  framework, no design. It exists so the WebSocket stream carries a live
  show before Step 3 builds on it, and it is deleted when Step 4 ships.

## 7. The deferred timeline feature: hooks kept in Step 1

1. **State is a function of history.** The engine's state at any beat is
   reproducible from the event sequence and the show; the journal and the
   recorder already depend on it. `jump_to(beat)` is a single entry point
   that the timeline feature will extend to "derive held notes and CC
   values at `beat` from the track content and reconcile voices".
2. **The show's timeline reference.** Step 0's `show.timeline`
   (`{file, importedAt, tempoMapIncluded}`, a `.mid` beside the show) is
   kept unchanged, and Step 1 ports the Step 0 SMF reader so the static
   health check (`unmapped-note`, `unused-note`, channel issues) stays
   equal to the Step 0 fixtures. That is the only thing Step 1 reads a
   `.mid` for: no chase, no scrub, no rehearsal playback. The deferred
   feature adds an optional sibling `show.timelineSource:
   { source: "reaper", path, track }` and the reconciler; Step 1 does not
   add the field.

With these, the later step adds a reader and a reconciler and touches no
other part of the engine.

## 8. Model changes made in Step 1

All are additive and applied to the Step 0 schemas, `model-tools` and the
Rust model together, with the fixtures regenerated by the Step 0 scripts:

- `show.fallbackSceneId?` (a scene id).
- `settings.quietAfterSeconds` (default 120), `settings.resumeWithinSeconds`
  (default 60), `settings.recorderMinutes` (default 10),
  `settings.heldVoiceCapBeats` (default 16) and
  `instance.heldVoiceCapBeats?` (number or `"unlimited"`, see §5.1),
  `settings.debugRateHz` (default 20), `settings.osc.port`,
  `settings.audio.{device, levelRangeDb}`, `settings.polyphonyPerInstance`
  (default 16), `settings.realtimePriority` (default true).
- Venue universe output gains `serialNumber?` for USB Pro and
  `{host, port, net, subnet, universe}` for Art-Net, if Step 0 did not
  already carry them in `output`.
- `show.tempoBpm?` (default 120) for the internal clock (§4.3).
- **Not in Step 1**: the `color` parameter kind. Its representation (slot
  layout, default shape, split node ports, OSC binding of three values)
  changes the shared contract and deserves its own short design. It is
  the first task of Step 2, written against the Step 0 reference
  evaluator first, so the engine ports a settled contract.

## 9. API

Shape is the builder's within these rules (master plan §8):

- One versioned prefix (`/api/v1`), JSON everywhere except the frame stream.
- **HTTP** for files and commands: list/read/write shows, venues, patches,
  fixture types and settings (validated and linted, errors in the lint
  format with codes); load show, select venue and patch, set override,
  set song, start/stop internal clock, trigger (note on/off by hand, for
  the pad page later), import V1, run health check, list recorder chunks.
- **WebSocket** topics a client subscribes to individually: `frames`
  (binary: universe id, sequence, 512 bytes, at the debug rate), `voices`,
  `params`, `events` (input events as seen), `faults`, `metrics`
  (timers), `clock` (beat, tempo, lock state), `state` (show, venue,
  patch, song, overrides). Every topic sends a full snapshot on subscribe
  then deltas.
- Static files from a directory in settings (the Step 3 app) and `/debug`.
- Authentication: none in Step 1; the server binds to localhost by
  default and to all interfaces with `--listen`, which Step 7 revisits
  with the hotspot design.

## 10. Files and the V1 importer

- `~/.ptah` layout per `docs/file-layout.md`; a `runtime/` directory for
  the journal, recorder and logs, excluded from any sync.
- Settings and the last-used show, venue and patch are remembered so
  `ptah supervise` with no arguments brings the stage up unattended.
- `ptah import-v1 [--from ~/.ptah]` ports `import/v1.ts` and
  `collapse.ts`; its output on the band's files must equal
  `fixtures/shows/hilldale-literal` and `hilldale-collapsed` byte for byte
  after canonical JSON formatting, which is how the port is verified.
- Migrations: schema version strings as Step 0 defines; Step 1's additive
  fields need none, but the mechanism exists from day one.

## 11. Proof

1. **Contract oracles**: `fixtures/**` validate with the same lint codes;
   `v1-traces` match within `1e-9`; `v2-traces` match within `1e-9`;
   `v2-render` bytes equal; `hilldale.v1-channel-map` reproduced;
   `health` outputs equal. `all-fixtures.test.ts` is ported as the single
   gate test, plus one test per oracle family.
2. **V1 replay** (master plan Step 1, my call there): a frame capture
   driver added to V1 as a new test-only file (the master plan's "no V1
   refactoring" rule allows a new file that changes no behaviour); the
   band's LIGHTS track, rendered **once by the owner for this test only**
   through the track FX so the ReaControlMIDI fader envelopes become CC
   events (committed as `fixtures/v1/replay/HILLDALE-LIGHTS-rendered.mid`,
   9151 notes, 128 064 CC events on CC0–CC3, tempo map embedded), played by `ptah
   play-midi` (a player in the CLI that also emits MIDI clock, Start and
   SPP following the file's tempo map, because V1 evaluates only while
   clock runs and common players send none) into both V1 and V2; frames
   resampled to 20 ms, compared per channel ±2 with one frame of time
   tolerance; every mismatch classified in a committed report as accepted
   (jitter, silent drop, legacy per-channel merge) or a bug. The step is
   not done while an unclassified mismatch exists.
3. **Fault injection** (§5.4), in CI.
4. **Performance**: a benchmark of 512 instances × 20 nodes per frame on
   the builder's Mac and on a Pi 4 (or `qemu` ARM64 with a documented
   scaling factor if no Pi is available), asserting the 2 ms budget and
   zero allocations in the render thread (`dhat` or an allocator guard
   that panics in that thread).
5. **A gig rehearsal**: the owner runs the HILLDALE show from Reaper
   through V2 with the real Enttec, pulls the USB cable and kills the
   engine during a song, and watches the readout. Step 1 exits on the
   owner's word after that session, not before.

## 12. Decisions in this document

Owner decisions (2026-10-26): show must go on as the design driver;
orphan-risk voices are released after a per-instance cap (default 16
beats) rather than held or dropped; the LIGHTS track is exported once as
a test fixture for the V1 replay; no
button in the performance path; recovery by free-running time, then
persisted voices, then the fallback look; faders hold, never extrapolate;
the timeline content feature is deferred and must never require an export
step; the engine reads the Reaper project directly when it lands; MIDI
reaches a future box by a cable (Ethernet with network MIDI first, DIN as
backup, USB gadget mode as a candidate); Step 1 ships a terminal readout
and a throwaway web page, no real UI.

My calls (overturnable): crate list; thread and queue design; the fault
table defaults (quiet 120 s, resume 60 s, recorder 10 min, polyphony 16,
watchdog 1 s, supervisor backoff); crash-only outside the render thread;
journal every 250 ms; `fallbackSceneId` as a scene reference; the `color`
parameter kind in Step 1; API topics; localhost-only binding by default;
the importer verified byte for byte against the Step 0 fixtures.

## 13. Left to the builder

- Internal module layout, exact crate versions, CI matrix.
- The exact API paths and message schemas, documented in the repo as the
  single source for Steps 3 to 5.
- How real-time priority is requested per platform and what happens when
  it is denied (a fault, never a refusal to run).
- Benchmark and fault-injection harness design.
- The HTML of the throwaway page and the TUI layout.
