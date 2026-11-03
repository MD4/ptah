# PTAH V2 — Master Plan

- **Date:** 2026-10-25
- **Status:** Draft for approval (brainstorming output)
  - Step 0 done; Step 1 plans 1A–1C merged (`step1c-complete`), 1D on
    branch `step1d-surface` awaiting the owner's V1 replay run and
    rehearsal (2026-11-04)
- **Scope:** the whole V2 rewrite. Each numbered step below gets its own
  design document and plan before it is built; this document fixes the
  intent, the decisions already made, the order, and the boundaries.
- **Where V2 lives:** a fresh repository. V1 (this repo) keeps running shows
  and receives no refactoring on V2's behalf. This document is committed here
  because it is where the decision was made; it moves to the V2 repo once
  that exists.

## 1. Intent

PTAH turns a pre-sequenced MIDI track into DMX light output, in lockstep with
the DAW that plays the band's set. Today the owner's band runs every show from
Reaper: one project per set, regions per song, a LIGHTS MIDI track with notes
and CC lanes, sent to PTAH's virtual MIDI port. PTAH is a **show renderer**,
not a lighting console and not an instrument. Reaper is, and remains, the only
timeline.

V1 works but is built as five Node processes around a few hundred lines of
real engine, with a UI where patching 21 lights means drawing 60 wires by
hand, and with timing at the mercy of MIDI clock jitter crossing two IPC hops.

V2 keeps every V1 capability, fixes the data model that causes the wiring
pain, moves the engine to a single small compiled binary that can run on a
laptop next to the DAW **or** on a dedicated box in the lighting case, and
adds the features a modern DMX tool is expected to have. Then it adds AI
assistance for the chores that happen before a gig, and a visualizer.

### Who it is for

1. **The owner's band, now.** One Mac running Reaper, one Enttec USB DMX Pro,
   a rig that changes every venue.
2. **The box, the dream.** A Raspberry Pi class device in the lighting case,
   fed MIDI from the show machine, driving DMX nodes directly, UI opened
   from any phone or laptop on the network.
3. **Other bands and small venues**, installing the same thing on whatever
   laptop they own next to their DAW.

### Success looks like

- Arriving at a new venue, typing or pasting the fixture list, reviewing one
  proposed mapping screen, and the existing show runs. The show file does not
  change between venues.
- A show authored once runs byte-for-byte identically every night, regardless
  of clock jitter.
- Any screen of the app can be understood by a band mate who has never seen
  it, in a dark room, in under a minute.
- The engine idles at a few percent of one Pi core and well under 20 MB RAM.

## 2. Goals, non-goals, anti-goals

**Goals**

- Full feature parity with V1 (section 3), with a V1 file importer.
- A domain model where the same effect applied to N fixtures is one row, not
  N programs and N×M wires.
- Multiple universes, Art-Net, Enttec USB Pro at day one; sACN as a cheap
  follow-up.
- An abstract rig / concrete venue split so repatching is matching, not
  rewiring.
- A UI rebuilt on a design system extracted from the V1 builder's look.
- A debug mode that shows the whole signal path visually.
- A realtime 3D visualizer fed by the same frame stream.
- AI assistants for repatching, program generation, and MIDI show generation
  from audio, none of which sit in the performance path.

**Non-goals**

- A cue list, fades between cues, a go button, or any timeline inside PTAH.
  Reaper owns time. A pad page for firing things by hand is not a timeline.
- Media servers, video, or anything that is not DMX lighting.
- Keeping any V1 code or process topology. V1 is a reference and a test
  oracle, not a base.

**Scope: a general DMX lighting tool** (owner decision, 2026-10-26)

V2 is a full-feature DMX lighting application, not a runner for the kind of
show HILLDALE is (white pars plus one red scene). HILLDALE is the parity
oracle, never the ceiling. The Step 0 model already carries the generic
parts: fixture roles for intensity, RGB, CMY, white, amber, UV, lime, indigo,
colour temperature, strobe, shutter, pan, tilt, zoom, focus, iris, gobo,
prism, speed, macro and effect; 16-bit fine channels; inverted ranges;
modes; capabilities intensity, colour, strobe, position, beam and raw
channel; HTP/LTP merge; multiple universes. Three items were deliberately
deferred out of Step 0 and are roadmap, not non-goals:

- **Colour parameters**: a show parameter of kind `color` (a colour picker
  on an instance) alongside `number` and `bool`. Planned for Step 1 or
  Step 2, before the UI, because a late parameter kind is the one deferral
  that would ripple.
- **Wheel capabilities**: driving colour wheels, gobo wheels and other
  indexed ranges from programs (nearest-slot selection, wheel spin), so
  wheel-based movers get more than intensity and position. Additive; the
  fixture-type ranges already exist.
- **Fan and pixel effects**: phase/fan across a group beyond the `spread`
  distribution, and pixel-mapped bars and matrices. Additive; gets its own
  design when a rig needs it.

**Anti-goals** (would make V2 a failure even if it "works")

- Anything in the performance path that can stall: garbage-collected
  runtimes in the tick loop, network calls to AI services, blocking file IO.
- A UI that needs a mouse and good eyesight at front of house.
- A model that silently drops output (V1 skips unknown patch entries without
  telling anyone). V2 reports every dropped or unmapped thing.
- Vendor lock on a cloud AI: every AI feature produces plain files the user
  can edit and the app can run without the AI.

## 3. V1 feature inventory (must be preserved)

Verified against the V1 source on 2026-10-25.

| Area | V1 behaviour |
| --- | --- |
| MIDI input | One virtual input port with a configurable name; one listening channel 1–16. |
| Triggers | Note on starts the program mapped to that note number with velocity as a parameter; note off stops it. CC 0–127 are live controls readable by programs. |
| Clock | Engine ticks once per MIDI clock pulse (24 per beat); time advances 1/24 per tick. Start/Continue reset program state and black out; Stop resets program state. Tempo derived from clock deltas. |
| Programs | Node graph. Inputs: time, constant, control (CC id + default), velocity. Effects: ADSR (attack, decay, sustain, release), math (19 operations, two operands), distortion (value, drive, tone, level). Outputs: scalar result (id 0–127), color (rgb or hsv, three inputs). Edges connect node outputs to node inputs; cycles are tolerated by the compiler. |
| Fixtures | Five built-in profiles (dimmer, rgb, rgbw, rgb+dimmer, rgbw+dimmer); per-show instances with a name and start address 1–512; overlap allowed with a warning; overflow past 512 rejected. |
| Patch | Program output → fixture capability (dimmer, color, raw channel index). Scalar outputs only to dimmer/channel, color outputs only to color. Fan-in and fan-out allowed. Last write wins on a channel. |
| Mapping | Note number → program id (one program per note). |
| Output | Enttec USB DMX Pro, first `/dev/cu.usbserial*` found, 40 Hz refresh, auto-reconnect on unplug. Values clamped 0–255, NaN → 0, ±∞ → 0/255. When a program stops, its channels are reset to 0. |
| Debug | A debug universe broadcasting the 512-byte frame to UIs when enabled; TUI shows a colored number grid. |
| Overrides | Blackout command. |
| Web UI | Home, shows (list, create, mapping canvas, patch canvas, read-only dashboard canvas), programs (list, create, node editor with live sparkline preview and a preview toggle), settings. |
| TUI | Status bar (UI/DMX/MIDI), load/unload show, debug grid. |
| Storage | JSON files in `~/.ptah` (settings, shows, programs), version-stamped, migrated on load with backups. |
| Ops | Single `ptah` command starts everything and opens the browser; published to npm. |

Known V1 behaviours **not** to preserve: program evaluation only while MIDI
clock is running; clock jitter reaching the output; silent skipping of invalid
patch entries; the 999.999.999 version sentinel; five processes.

## 4. Decisions already made

These were discussed and settled during brainstorming. Items marked *(my
call)* were delegated to the author and can be overturned by the owner.

### 4.1 Architecture

- **One engine, one binary, headless.** Rust. Owns MIDI input, clock, program
  evaluation, merging, every DMX output, and serves the web UI and a
  WebSocket/HTTP API from the same process. Identical binary on macOS,
  Linux x86-64, and Linux ARM64 (Pi). *(my call: Rust over Go/C++ for a
  GC-free fixed-rate loop, mature `midir`/serial/UDP crates, clean ARM
  cross-compilation.)*
- **Programs compile to a flat instruction list** over a preallocated value
  buffer. Zero allocation per tick. Every intermediate value is addressable,
  which is what the debug mode and the builder's sparklines read.
- **Reaper is the clock.** Position and tempo always come from the DAW:
  Start, Continue, Stop and Song Position Pointer set the beat position,
  every MIDI clock pulse advances and corrects it. What the engine adds is a
  filtered beat counter (a phase-locked loop on the pulses) and a fixed
  render grid (44 frames per second by default, configurable): frames are
  computed on that grid from the interpolated beat position, so a late or
  early pulse no longer moves the lights and a fade stays smooth between
  pulses. The counter cannot drift from Reaper because every pulse corrects
  it. Tempo jumps are followed within a few pulses; tempo maps and
  ritardandos are followed without visible lag.
- **Hard-snap mode** (owner decision): a per-show option where the beat
  position is set exactly to the pulse count, as V1 does, with no
  filtering. Frames are still rendered on the fixed grid. Use it if a show
  ever needs instant reaction to abrupt tempo changes over smoothness.
- **Programs can also run without a DAW** (rehearsal mode, builder
  transport, pad page) on the engine's own clock at a set tempo. Later sync
  sources (Ableton Link, MTC) plug into the same beat counter.
- **Position chase** (owner decision, Step 1). When the LIGHTS track's MIDI
  export is loaded next to the show, any position change rebuilds the
  state as if the song had played from the start: notes held at that
  beat restart their voices at the right offset, CC lanes take the value
  they have at that beat. Position comes from Song Position Pointer plus
  clock during playback and from Reaper's OSC cursor messages while
  stopped, so clicking around the timeline lights the stage accordingly.
  Without a loaded file the engine falls back to V1 behaviour (only
  events received after the jump). The health check warns when the loaded
  file looks older than the project (notes received live that the file
  does not contain).
- **Program time stays musical.** *(my call)* A program's `time` input is
  in beats, exactly as in V1 (one beat = 1.0), read from a fractional beat
  counter that the phase-locked clock advances continuously. V1 programs
  therefore keep their meaning on import (an ADSR still spans one beat).
  Evaluation happens at the output rate on the current beat position, not
  once per clock pulse. Determinism means: same MIDI input, same output
  within the tolerance defined by the oracle (below); byte-for-byte equality
  is only guaranteed for the rehearsal mode playing a MIDI file on the
  internal clock.
- **Merge mode is a per-instance property.** *(my call)* HTP/LTP/priority
  is the default; a `legacy` mode reproduces V1 (last write in patch order
  wins, channels reset to 0 when the writer stops). The V1 importer sets
  `legacy` on every imported instance so existing shows do not change. When
  the latest writer stops in LTP, the value falls back to the previous
  contributor, or to 0 when none remains.
- **Output rate is decoupled from evaluation.** Each universe is sent at its
  own rate; the last computed frame is repeated if evaluation is late.
- **UI is a web app served by the engine**, usable from the host, a phone, or
  another laptop. A Tauri shell may wrap it later for a desktop icon; it adds
  nothing functional. *(my call)*
- **V2 is a fresh repository** with a Rust workspace (engine, protocol crates,
  CLI) and a pnpm workspace (design system, app, visualizer). V1 is untouched
  apart from, at most, an exporter if the importer ever needs one.

### 4.2 Domain model (nouns)

The detailed model is Step 0's design document. The nouns are fixed:

- **Fixture type** — from the Open Fixture Library (OFL) with a local cache,
  plus user-defined types. A type has modes; a mode is an ordered channel
  list with roles (intensity, red, green, blue, white, amber, uv, strobe,
  pan, tilt, zoom, generic...).
- **Venue** — the concrete rig: universes (with their output: USB Pro,
  Art-Net node, sACN), fixtures with type, mode, universe, address, and
  optional stage position for the visualizer.
- **Rig (abstract)** — what a show is authored against: named **groups**
  (e.g. "back pars", "front wash", "movers") with the capabilities the show
  needs from them and an ordered member count. A show references groups,
  never addresses.
- **Program** — the node graph. Unchanged in spirit from V1; gains typed
  ports with units, sub-graphs (macros), presets, and parameters exposed
  on the instance.
- **Scene** — a static look: fixture or group values. First-class, not a
  program made of constants.
- **Program instance** — a program or scene bound to a group with parameter
  values and a distribution rule (same output to all members, one trigger
  per member, spread across members, etc.) and an optional priority.
- **Trigger** — abstract: MIDI note or note range, program change; later
  keyboard, pad page, OSC messages. A **mapping** binds triggers to
  instances.
- **Parameter source** — abstract, continuous: what feeds an instance
  parameter. Day-one sources: MIDI CC (7-bit, with engine-side slew),
  14-bit CC pairs, NRPN, pitch bend, channel aftertouch, poly aftertouch
  (a per-note value, used as a per-fixture fader inside a group), OSC
  addresses (32-bit floats, e.g. Reaper sending plugin slider automation),
  and **audio** (a host input channel reduced to a value: level, peak, a
  frequency band, or onsets, with attack and release), so a microphone can
  drive a dimmer live. Live sources are instantaneous, so chase ignores
  them; they are excluded from the parity oracle.
  The engine listens on all 16 MIDI channels, so a source is identified by
  device, channel and number. A program exposes named parameters; the
  **binding** of a parameter to a source lives on the instance, never in
  the program, so the same program can be fed by CC3 on one group and by
  an OSC address on another.
- **Show** — rig + programs + scenes + instances + mappings. Portable
  between venues.
- **Patch** — the match between a show's rig groups and a venue's fixtures.
  Computed, reviewable, stored with the venue.
- **Overrides** — blackout, house lights, master dimmer, freeze. Above all
  merging, on buttons and bindable to triggers.

Merge policy *(my call)*: highest takes precedence for intensity, latest
takes precedence for color and position, instance priority above both,
overrides above everything. Every merge decision is observable in debug mode.

### 4.2.1 MIDI channels (owner decision)

Channels are an address dimension, not a structure. Nothing in the model
assumes a channel means a group, a song, or a role; the owner simply wants
to write automation on one channel or another and pick either as an input.
Every MIDI-addressed thing therefore carries device + channel + number:

- **Triggers**: device + channel + note (or range). Note 60 on channel 1
  and note 60 on channel 2 are different triggers. "Any channel" is an
  explicit choice, not a default.
- **Parameter sources**: CC, 14-bit CC, NRPN, pitch bend, channel
  aftertouch are device + channel + number; poly aftertouch is device +
  channel + note.
- **Program Change** for song selection: a configured channel, default
  "any".
- **Clock**: channel-less; with several devices one is the clock master in
  settings and the others' clock is ignored.
- **Overrides and the pad page**: bound like any trigger, so a pad
  controller on another channel or device can hold blackout while the DAW
  runs the show.
- **MIDI file model** (rehearsal, health check, AI generator): every event
  keeps its channel; the generator emits the channels the mapping expects.
- **V1 import**: V1's single configured channel is stamped on every
  imported trigger and binding.
- **Debug**: the MIDI monitor shows device, channel and message; the health
  check lists events on channels no mapping listens to.
- **UI**: the global "MIDI channel" setting of V1 disappears. A show has a
  default channel so new rows need no channel choice; the channel is
  shown and editable on each mapping row and each binding.

### 4.3 Repatching

- Both directions: PTAH adapts to whatever addresses a venue already has, or
  prints a patch sheet ("par 3 → address 25, mode 4ch") when the band brings
  its own lights. Default is "accept what exists, ask the fewest questions".
- Address allocation and capability matching are deterministic code. The AI
  only handles fuzzy parts: parsing a pasted fixture list, recognising
  fixture names against OFL, guessing positions and grouping from names like
  "L1"/"R3". The result is always a proposal reviewed on one screen.
- Count mismatch is folded or spread preserving left-to-right order; missing
  capabilities are reported per affected instance with an offered fallback.

### 4.4 UI direction *(delegated to the author)*

- Design system first, in code: tokens (dark primary theme, a dimmed stage
  mode), domain primitives (DMX value bar, fixture tile with live color,
  sparkline, universe grid, note chip, group badge, timeline ruler), generic
  components on a headless base (Radix or Base UI), Storybook as the living
  catalog. Figma sync only if the owner wants it for sharing. No Ant Design.
- Rules: performance screens show state and never forms; editing screens
  are tables by default; a canvas only where the thing edited is a graph.
  Keyboard-first with a command palette.
- Screens: **Builder** (kept visually, React Flow, plus live DMX toggle with
  the affected fixtures listed, transport with play/loop/scrub, velocity and
  CC test panel, presets, macros, undo, copy/paste, typed ports, one node
  per math operation); **Show** (a rig table: one row per instance with
  trigger range, program, parameters, group, live level; wires only on
  hover); **Venue** (fixture list plus a universe map of 512 cells per
  universe, drag to re-address, overlaps in red, patch review); **Perform**
  (fixture tiles lit with real color, current region and bar, active
  triggers, output health, overrides); **Debug**; **Settings**.
- V1's TUI is not rebuilt. The CLI gains status and headless commands
  instead. *(my call)*

### 4.5 Protocols and hardware

- Day one: Enttec USB DMX Pro (and its clones speaking the same protocol),
  Art-Net output with several universes, device discovery for both.
- Cheap follow-up: sACN (E1.31). Later: more USB chips, Art-Net input.

### 4.6 AI

- Cloud model through an API key stored locally; the Claude API by default.
  Nothing AI-related runs in the engine process or during performance. Every
  AI feature produces ordinary files (venue, patch, program, scene, MIDI)
  that the user reviews and can edit by hand.
- **Where it runs** *(my call)*: a separate Rust binary (`ptah-assist`, or
  an engine subcommand that spawns a separate process) on the engine host.
  The UI calls it through the same HTTP API the engine serves, so a phone
  talking to the box works and the key never leaves the host. Audio
  analysis runs in that process. The engine binary has no dependency on it.
- Three features, in order of value and certainty:
  1. **Repatch assistant** (section 4.3).
  2. **Program and scene generation from a prompt**, producing the same JSON
     the builder saves, opened in the builder for review.
  3. **MIDI show generation from audio**: deterministic analysis (beat grid
     from the tempo map or drum stem, onsets, sections from Reaper regions
     or novelty, energy per stem) → AI-written lighting plan in plain text
     (per section, which group runs which program on which events, new
     programs or scenes if needed) → deterministic rendering to a MIDI file
     (notes on the mapped numbers quantized to real onsets, CC lanes from
     energy curves, bank changes per song). Explicitly a follow-up; must not
     block anything.

### 4.7 Visualizer

- Same web app, opened as a second window or on a second screen, fed by the
  same frame stream the Perform screen uses. 3D stage, fixture positions
  from the venue model, beams for fixtures with pan/tilt, color and
  intensity for everything. Rehearsal mode lets it play a MIDI export on the
  internal clock with no DAW.

## 5. The steps, in order

Rule: every step ends with something usable at a gig. Nothing downstream
waits on AI or visuals. Each step opens with its own brainstorm and design
document; this plan is the contract between them.

### Step 0 — Domain model and file formats

Design the nouns of 4.2 precisely: schemas, identity rules, the show/venue/
patch split, the program instruction set, the V1 import mapping (a V1 show
becomes a show with one group per fixture plus a one-venue patch; V1
programs import unchanged). Output: a design document plus JSON Schema
files and golden fixtures, no code.

Decisions still open for this step: exact distribution rules for instances;
how parameters are exposed from a program; whether scenes can be partial
(only some channels); identity of fixtures across venue edits.

### Step 1 — Engine, headless, feature parity

Rust workspace: core (model, compiler, VM, merge, clock, MIDI file model
and position chase), io (MIDI in on all channels with every parameter
source of 4.2, OSC in over UDP, audio input capture and reduction, USB Pro,
Art-Net), server (HTTP + WebSocket API, static UI serving), CLI. V1 importer.
Overrides. Debug frame stream. Proven by **replaying the band's actual
Reaper LIGHTS export through V1 and V2 and diffing the DMX frames**, with
documented and accepted differences only where V1 was wrong (jitter,
silent drops).

**Oracle definition** *(my call)*: V1 gets one test-only addition, a frame
capture driver that writes every DMX frame with a monotonic timestamp
(the plan's "no V1 refactoring" rule allows this because it is a new file
that touches no existing behaviour). V2 records the same from its output
stage. Both runs are driven by the same MIDI file played through a MIDI
player on the host (not by Reaper, to remove human timing). Frames are
resampled to a common 20 ms grid, compared per channel with a tolerance of
±2 and a time tolerance of one output frame, and every mismatch is
classified as accepted (jitter, silent drop in V1) or a V2 bug. The golden
material (MIDI export, tempo map, V1 show and program files, V1 captures)
is committed to the V2 repo as fixtures.

**MIDI input** *(my call)*: Step 1 supports a virtual input port on the
host (macOS and ALSA) and any class-compliant MIDI device, several at once,
through one input abstraction. Getting MIDI to a remote box is section 10;
Step 1 only needs the abstraction to accept a network source later.

**Song and section awareness** *(my call)*: bar position comes from MIDI
clock plus Song Position Pointer on Start/Continue. Song and section
identity come from a MIDI convention on the LIGHTS track: Program Change
selects the song (the show file carries a song list with names), and an
optional, user-chosen CC selects the section (off by default). All 128 CCs
stay available as program controls, as in V1, because the band's existing
shows use CC0–CC3 as automated faders feeding program parameters (verified
in the HILLDALE show: flash reads CC3, sine CC2, distorded CC0 and CC1).
Program Change is unused by V1 and does not collide. Reaper OSC is an
optional later source.

**Faders from the DAW**: CC bound to an instance parameter is the V2
formalisation of what the band already does by hand and stays the default,
because it lives in the same clip as the notes. The engine smooths 7-bit
input with a short configurable slew so slow fades on dimmers do not step
visibly. The full list of parameter sources is in 4.2; OSC input is in
Step 1 (owner decision) so a Reaper user can automate named plugin sliders
with real envelopes and bind them to parameters without changing the
program. The V1 importer turns each `input-control` node into an exposed
parameter with a CC binding on the imported instance.
Rehearsal mode and the health check therefore need a MIDI file model that
reads notes, CCs, program changes, tempo, and marker meta events.

Exit: the band can run a show on V2 from the CLI with the V1 files, on the
Mac, with the USB Pro.

### Step 2 — Design system

Tokens, primitives, components, Storybook, accessibility pass for dark
rooms (contrast, focus, target sizes for a phone). Can start as soon as
Step 1's API shape is stable.

### Step 3 — The app

Screens in this order: Perform (smallest, proves the live stream), Venue,
Show, Builder, Settings. Each screen ships behind the previous one being
usable. V1 is retired at the end of this step.

Exit: the band runs shows from V2 with no V1 installed.

### Step 4 — Debug mode

Signal probes on any wire or port in the builder, per-universe frame
inspector with per-channel provenance (which instance wrote it and what the
merge decided), MIDI monitor, an event timeline with a ring buffer you can
scrub back through after a glitch, latency and frame-rate meters, output
recording and replay with diff. Mostly UI, since the VM already exposes it.

### Step 5 — Visualizer

As in 4.7. Includes the stage position editor on the Venue screen and
rehearsal mode.

### Step 6 — AI

In the order of 4.6. Each feature is its own design document.

### Step 7 — Packaging and the box

Single-binary releases for macOS and Linux (x86-64, ARM64), a Pi image with
the engine as a service and an optional Wi-Fi hotspot for the UI, Tauri
desktop wrapper, auto-update, documentation and the public "other bands"
onboarding.

### Parallelism

Steps 0 → 1 are strictly sequential. Step 2 overlaps the second half of
Step 1. Step 3 follows 2. Steps 4 and 5 are independent of each other and of
6. Step 7 can start packaging the headless engine right after Step 1 and
grows with each step.

## 6. Extras to include along the way (accepted, none vetoed)

- Open Fixture Library as the fixture database with a local cache and a
  custom-type editor.
- Show and venue files that are git-friendly, with a diff view in the app.
- Rehearsal mode (engine plays a MIDI export on its own clock).
- Show health check before a gig: unmapped notes in a MIDI file, instances
  without fixtures, overlaps, missing capabilities, in one list.
- Remote at front of house: same UI on a phone over venue Wi-Fi or the box's
  hotspot, with overrides and the Perform screen.
- Multi-controller MIDI: several inputs with per-device channel.
- Audio-reactive input as a parameter source (level, band, onset) is in
  Step 1 via the binding model; a richer analysis node (tempo, spectrum)
  can come later.
- Output recording, replay, and diff.
- Plugin surface later for node types and output protocols.

## 7. Constraints

- Node.js >= 20 only for the web toolchain, never at runtime.
- Must run on macOS (the band) and Linux ARM64 (the box) from the same
  source; Windows is a packaging target, not a design constraint.
- Performance path budget: evaluation of 512 instances × 20 nodes under 2 ms
  per tick on a Pi 4; no heap allocation in the tick; no network or file IO
  in the tick.
- Files stay human-readable JSON (or JSON-adjacent) in `~/.ptah` (name
  retained), versioned and migrated on load as V1 does.
- Every dropped, unmapped, or clamped value is counted and visible.
- V1 keeps running the band's shows until Step 3 exits. V1's repo is not
  refactored for V2.

## 8. What is left to the builder

- Exact crate and library choices inside the constraints above.
- API shape (HTTP + WebSocket message design), as long as the UI, the
  visualizer and third parties use the same one.
- The design system's visual details beyond the direction in 4.4.
- Test strategy per step, beyond the V1 replay oracle required in Step 1.
- Repository layout, CI, release tooling for the new repo.
- The order of screens inside Step 3 if a dependency forces a change.

## 9. Reaper setup notes

### Sending MIDI slightly ahead of the audio

Lights always lag the MIDI event that triggers them. Estimated chain on V2
with the USB Pro:

| Stage | Estimate |
| --- | --- |
| Virtual port to engine, evaluation | under 1 ms |
| Wait for the next render frame (44 Hz) | 0–23 ms, 11 ms average |
| USB Pro frame transmission (one DMX frame on the wire) | about 23 ms |
| LED fixture response | 5–20 ms depending on the fixture |
| **Total** | **roughly 30–60 ms, so start at 40 ms ahead and tune by eye** |

Art-Net nodes remove the USB serial hop but add their own frame
transmission, so the total is similar.

In Reaper, the setting is per track: open the track's **Routing** window
(the ROUTE button) and set **Track playback offset** to a negative value in
milliseconds, for example `-40`, on the LIGHTS track. Notes and CCs on that
track then play early; MIDI clock is not shifted, which is what you want,
because PTAH's beat position must stay aligned with the audio while the
triggers arrive early. Alternative when the whole track cannot be offset:
nudge the items left by the same amount.

**In-app feature (owner decision): "DAW offset advisor".** PTAH computes
the number to type into Reaper instead of leaving it to the eye. It lives
on the Settings screen with a one-line result ("set Track playback offset
to -42 ms") and a breakdown, and in Step 4's debug mode with live values.
Three levels, each more exact than the previous:

1. **Estimated**, available from Step 3: the sum of the render-grid wait
   (half a frame at the configured rate), the output's frame time (USB Pro
   serial time, Art-Net node timing), and the fixture's typical response
   from its OFL entry or a default per technology (LED, tungsten,
   discharge), per universe. Shown as soon as a venue is patched.
2. **Measured in the engine**, available from Step 4: the actual time from
   a MIDI event arriving to the frame carrying its first change leaving
   the output, averaged over the last show. Replaces the first two terms
   of the estimate with real numbers.
3. **Calibrated end to end**, Step 4 candidate: PTAH flashes a fixture on
   its own click while the host microphone or camera records, measures
   the gap between click and light, and reports the full offset including
   fixture response. Run once per venue.

Whichever level is available, the screen states which it used and how
confident it is. The number is also stored with the venue so the health
check can warn when the venue changes but the Reaper offset did not.

### Connecting Reaper to a remote box

A virtual MIDI port only exists on the machine that creates it. When the
engine runs on the box, Reaper on the Mac needs one of these:

1. **USB MIDI interface** (zero software): a class-compliant USB MIDI
   interface on the Mac, a MIDI cable, a second interface on the box. Latency
   about 1 ms, no network, works with any DAW. Recommended as the fallback
   that always works.
2. **Network MIDI over Ethernet (RTP-MIDI / AppleMIDI)**: macOS has it built
   in (Audio MIDI Setup → Network). The box runs an RTP-MIDI session
   (`rtpmidid` on Linux today; the engine can implement the protocol natively
   in Step 7 so no extra daemon is needed). Latency 1–3 ms on a wired link.
   Not recommended over Wi-Fi for clock. Recommended as the main path for the
   box, since one Ethernet cable then carries MIDI in and Art-Net out.
3. **Box as a USB MIDI device**: a Pi 4 or Zero in USB gadget mode appears
   to the Mac as a plain USB MIDI interface over one USB-C cable. Elegant,
   no network configuration, but ties the box to a cable to the Mac and is
   Pi-specific. Worth prototyping in Step 7.

In every case Reaper simply selects that device as the LIGHTS track's
hardware output, exactly as it selects the virtual port today.

## 10. Owner answers from the builder check

1. CC lanes on the LIGHTS track are automated faders read by programs, never
   bank or program selection. Folded into Step 1's MIDI conventions above.
2. The band's Reaper export, tempo map, and `~/.ptah` files may be committed
   as golden fixtures **as long as the V2 repository is private**. The V2
   repository is therefore private until the fixtures are replaced by
   synthetic ones or the owner decides otherwise.

The questions listed under Step 0 are answered in Step 0's own brainstorm.
