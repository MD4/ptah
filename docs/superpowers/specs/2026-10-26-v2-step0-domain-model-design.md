# PTAH V2 — Step 0: Domain Model and File Formats

- **Date:** 2026-10-26
- **Status:** Draft for approval
- **Parent:** `2026-10-25-v2-master-plan.md` (approved). This document
  details section 4.2 of the plan. Where the two disagree, this one wins.
- **Output of this step:** this document, JSON Schema files for every
  stored entity, golden fixtures (the band's HILLDALE show as the parity
  import, plus a synthetic full-featured show, see 1.1), and a written
  instruction set for the program VM. No engine code.

## 1. What the model has to express

The reference case, read from the band's real files on 2026-10-26 and
re-checked by the builder review:

HILLDALE declares 21 one-channel `dimmer` fixtures at addresses 1–21.
Three programs (`flash`, `sine`, `distorded`) are each copied seven times
and mapped to notes 0–6, 7–13, 14–20. The copies are **not** wired alike:

- copies for channel triplets 1–3, 7–9, 13–15 wire output 0 → first
  channel, output 1 → second, output 2 → third (in `flash` and `sine`
  outputs 1 and 2 are constants 1 and 0, so while the note is held the
  second channel is pinned at full and the third at zero);
- copies for triplets 4–6, 10–12, 16–18, 19–21 wire output 0 to all three
  channels.

Note 21 fires `red`, a flickering program (`time → distortion → output`),
on channels 4, 10, 16 and 19. Programs read CC0–CC3 as faders. In V1 that is
22 programs, 21 fixtures, 67 patch wires.

Physically (owner, 2026-10-26): triplets 4–6, 10–12, 16–18 and 19–21 are
**four LED pars in 3-channel RGB mode, used only in white**, which is why
one output feeds all three channels; triplets 1–3, 7–9 and 13–15 are
**three strobes in a 3-channel mode** (effect on the first channel, the
second held at full, the third at zero). `red` really is red: it drives the
red channel of the four pars. Two deliverables follow, and they are
different things:

1. **The literal import** (the Step 1 oracle fixture): byte-equivalent to
   V1. One venue with 21 one-channel fixtures; per V1 note, one instance
   on a group holding the fixtures that note touches, with an **output
   routing** (3.7) reproducing the wiring; `red` stays a program; merge
   `legacy`. The importer's collapse pass (section 5) then offers to fold
   notes whose graph **and** routing shape are identical, giving HILLDALE
   seven rows instead of twenty-two: two `flash`, two `sine`, two
   `distorded` per-member instances (one per wiring shape), plus `red`.
2. **The re-authored example** (a UI and documentation fixture, not an
   oracle input): the same show written as the owner thinks of it. Venue:
   four `rgb` pars and three strobes (a custom 3-channel type with roles
   `intensity`, `generic`, `generic`). Show: group **pars** (4, requires
   intensity and color), group **strobes** (3, requires intensity); three
   per-member instances on pars (`flash`, `sine`, `distorded`, output
   `intensity` rendered through virtual intensity as white) on notes
   1,3,5,6 / 8,10,12,13 / 15,17,19,20; three per-member instances on
   strobes with routes `slot 0 → channel(0)` plus a scene holding
   `channel(1) = 1, channel(2) = 0` while triggered, on notes 0,2,4 /
   7,9,11 / 14,16,18; `red` as a program on pars writing `color` red with
   flicker (or a scene if the flicker is dropped), on note 21. Same MIDI
   file, same look, eight rows (three per-member instances per group, the
   strobe-arm scene, `red`), and the show now repatches onto any venue
   with four color fixtures and three strobes.

### 1.1 HILLDALE is a parity case, not the design target

HILLDALE happens to be black and white with one red moment. It proves V1
parity and the importer, nothing more (owner, 2026-10-26). The model is
validated against a second, **synthetic** show written in Step 0 that uses
everything the master plan asks for, so no construct is designed around
one show's habits:

- a venue with two universes (USB Pro and Art-Net), eight RGBW pars, four
  moving heads (16-bit pan/tilt, RGB mixing, zoom, strobe; a color-wheel
  role is deferred with `ranges`-based capabilities), two
  single-channel dimmers, one fixture whose mode has an inverted channel;
- color programs (hsv sweeps, palettes from parameters, a `spread` chase
  across the pars with per-member phase), position programs on the movers,
  a strobe program, a scene with fades that sets only color on half a
  group, a subgraph reused by two programs;
- bindings on CC, 14-bit CC, poly aftertouch and OSC, on two MIDI channels;
- a per-member instance with routing, a `legacy` instance, priorities that
  make one instance win over another, and every override;
- a second venue with fewer pars and no movers, with the patch folding and
  fallbacks the show needs there.

Everything below exists to make these, and the cases the master plan lists
(multiple universes, moving heads, venue changes, overrides), expressible
without copying anything.

## 2. Principles

1. **Shows reference groups, never addresses.** Only a venue knows
   addresses. Only a patch connects the two.
2. **One concept per noun.** A program computes; a scene holds values; an
   instance binds either to a group; a mapping binds triggers to instances;
   a binding feeds a parameter. No noun does two of these.
3. **Normalized values inside, DMX bytes only at the edge.** Every value in
   programs, scenes, merge and debug is a float 0..1 (or an angle, or a
   color). Channel bytes, fine channels, inverted ranges exist only in the
   final render step.
4. **Nothing is dropped silently.** Every unresolved reference is kept in
   the file, marked, counted, and shown.
5. **Files are plain JSON, human-diffable, stable ids, migrated on load.**
6. **Identity is a UUID; names are labels.** Renaming never breaks a link.

## 3. Entities

Field notation: `name: type` ; `?` optional ; `[]` list. All ids are
UUID v4 strings unless noted. All entities carry `schema: "<entity>@<n>"`
(integer schema version) at the root of their file.

### 3.1 FixtureType (library)

Comes from the Open Fixture Library (OFL) or is user-defined. Stored in
`~/.ptah/library/types/<id>.json`; OFL entries are cached on import and
keep their OFL key for refresh.

```
FixtureType {
  id, name, manufacturer
  source: { kind: "ofl", key: string, fetchedAt } | { kind: "custom" }
  modes: Mode[]
  physical?: { bulbType?, lumens?, beamAngleDeg?, weightKg?, dimensionsMm? }
}
Mode {
  id (slug within type), name, channelCount
  channels: Channel[]            // ordered, index = DMX offset
}
Channel {
  name
  role: Role
  fineOf?: index                 // this channel is the fine byte of channel at index
  default: 0..255
  ranges?: Range[]               // OFL capabilities: {from,to, meaning, value?}
  invert?: bool
}
Role = intensity | red | green | blue | white | amber | uv | cyan | magenta
     | yellow | lime | indigo | colorTemp | strobe | shutter | pan | tilt
     | zoom | focus | iris | gobo | gobo2 | prism | speed | macro | effect
     | generic
```

**Capabilities** are derived from a mode's roles, never stored:

| Capability | Present when | Attributes (all 0..1 unless noted) |
| --- | --- | --- |
| intensity | a channel with role intensity, **or** any color channel (virtual intensity, see 6.4) | `level` |
| color | red+green+blue, or cyan+magenta+yellow, or white-only | `r g b` (plus `w a uv` written when channels exist) |
| strobe | strobe or shutter | `rate` (0 = open) |
| position | pan and tilt | `pan tilt` 0..1 of the fixture's travel (degrees only for display, derived from the type's physical range) |
| beam | zoom / focus / iris | `zoom focus iris` |
| channel(i) | always, one per channel | `value` (raw) |

The V1 profiles (dimmer, rgb, rgbw, rgb+dimmer, rgbw+dimmer) ship as
built-in custom types so imports never depend on the network.

### 3.2 Venue

`~/.ptah/venues/<id>.json`

```
Venue {
  id, name, notes?
  universes: Universe[]
  fixtures: VenueFixture[]
  patches: Patch[]                 // one per show patched here (3.9)
  dawOffsetMs?: number             // from the offset advisor
}
Universe {
  id, name, number (1..n, user-facing)
  output: { kind: "usbpro", serial?: string }
        | { kind: "artnet", host: string, net: 0..127, subnet: 0..15, universe: 0..15 }
        | { kind: "sacn", universe: 1..63999 }
        | { kind: "none" }         // exists for the visualizer only
  rateHz?: number                  // default from settings
}
VenueFixture {
  id, name
  typeId, modeId
  universeId, address: 1..512
  position?: { x, y, z }           // meters, stage origin front-center
  rotation?: { pan0Deg, tilt0Deg } // home orientation for visualizer
  tags?: string[]                  // "L", "back", "truss1"...
  responseMs?: number              // overrides the type's typical response
  park?: { [attribute]: value }    // values held by attributes nothing writes (e.g. pan/tilt aimed for this room); falls back to the mode's channel defaults
  colorModel?: "subtractive-white" | "rgb-only"   // how w/a/uv derive from rgb (6.4); default subtractive-white
}
```

Validation: `address + channelCount - 1 <= 512` is an error; overlaps are a
warning carried in the file's computed health, not an error.

### 3.3 Show

`~/.ptah/shows/<id>/show.json` plus `programs/<id>.json` next to it. A show
directory is self-contained and copyable between machines.

```
Show {
  id, name
  defaultMidiChannel: 1..16
  songs: Song[]                    // optional song awareness
  groups: Group[]                  // the abstract rig
  scenes: Scene[]
  instances: Instance[]
  mappings: Mapping[]
  overrides: OverrideBinding[]
  programs: ProgramRef[]           // {id, file} ; files live in the show dir
  timeline?: { file: string, importedAt, tempoMapIncluded: bool }   // the DAW's LIGHTS track export (SMF), for chase, rehearsal and health
}
Song { id, name, programChange?: 0..127, sectionCC?: {channel, cc} }
```

### 3.4 Group (abstract rig)

```
Group {
  id, name
  size: number | "any"             // members the show was authored for
  requires: Capability[]           // what instances on this group use (computed on save, stored for the patcher)
  order: "left-to-right" | "custom"
  memberNames?: string[]           // optional labels, length = size
}
```

A group has no fixtures. Members are positions 0..size-1. The patch fills
them (3.9).

### 3.5 Program

```
Program {
  id, name, description?
  parameters: Parameter[]
  nodes: Node[]
  edges: Edge[]
  outputs: OutputDecl[]            // derived from output nodes, stored for tooling
}
Parameter {
  id, name
  kind: "number" | "color" | "bool"
  min, max, default               // numbers; colors default {r,g,b}
  unit?: "level" | "beats" | "seconds" | "degrees" | "hz" | "ratio"
  smoothingMs?: number             // slew applied to whatever feeds it, default 20
}
```

**Nodes** keep V1's families with changes:

- Inputs: `time` (beats since instance start), `beat` (absolute beat
  position from the clock, for tempo-synced effects that do not restart
  per note), `constant`, `parameter` (reads a Parameter by id; replaces
  V1's `input-control`), `velocity` (0..1; V1 delivered 0..127, the
  importer inserts a `×127` so imported graphs keep their meaning),
  `member` (this member's index 0..n-1
  and normalized 0..1 and count n; constant when distribution is not
  per-member or spread), `random` (seeded per instance+member).
- Effects: `adsr` (gate-aware: release starts at note off, see 6.2),
  `envelope` (V1's `fx-adsr` exactly: a pure function of `time` over one
  beat, rates as fractions of the beat, zero after `time > 1`; kept so
  imports do not change look, hidden from the node library by default),
  `math` as **one node type per operation** in the file (`add`, `sin`, …)
  with the same semantics as V1's 19 operations, `distortion`,
  `clamp`, `map` (range remap), `smooth` (one-pole), `lfo` (shape, rate in
  beats or hz, phase; replaces most time+sin+math chains), `step`
  (quantize), `select` (switch between inputs), `subgraph` (another
  program by id with its parameters wired as inputs; no recursion).
- Outputs: `out.intensity`, `out.color` (rgb or hsv mode, as V1),
  `out.strobe`, `out.position`, `out.beam`, `out.channel(i)`. Each has a
  `slot` number (V1's outputId) so several of the same kind can exist.

**Port types**: `number`, `color`, `bool`. Edges are only valid between
equal types; `number → bool` uses an implicit `> 0.5`. Cycles are rejected
on save in V2 unless they pass through a `z1` (one-tick delay) node; the
importer drops a V1 back edge and flags it (V1 semantics were "read the
default every tick", which dropping reproduces exactly).

**Lifetime**: an instance evaluation starts at `time = 0` on trigger start
and runs until its trigger stops and every `adsr` has released, or
immediately if the instance's `onStop` says so (3.7).

### 3.6 Scene

```
Scene {
  id, name
  entries: SceneEntry[]
  fadeInBeats?: number, fadeOutBeats?: number     // 0 = snap
}
SceneEntry {
  groupId
  members: "all" | number[]
  capability: Capability
  value: { level } | { r,g,b,w?,a?,uv? } | { rate } | { pan,tilt } | { zoom?,focus?,iris? } | { value }
}
```

Scenes are **partial**: only the capabilities listed are written; everything
else is untouched. A scene on a group that lacks the capability at patch
time is reported, not an error.

### 3.7 Instance

```
Instance {
  id, name
  source: { kind: "program", programId } | { kind: "scene", sceneId }
  groupId
  members: "all" | number[]                  // which group positions it may touch
  distribution: "all" | "per-member" | "spread"
  routing?: Route[]                          // output slot → members; default: every slot → `members`
  bindings: Binding[]                        // parameterId → source
  velocityTo?: parameterId                   // default: the program's "velocity" input
  trigger: { mode: "gate" | "toggle" | "oneshot" }
  onStop: "release" | "reset" | "hold"       // release: ADSRs finish then values are released
  merge: { mode: "default" | "legacy", priority: number }
  enabled: bool
}
```

```
Route { slot: number, members: "all" | (number | { position, tupleIndex })[], capability?: Capability }
```

`capability` overrides the target capability for that route; absent, it is
the output kind's natural capability (`out.intensity → intensity`,
`out.color → color`, …). An intensity-kind slot may target `intensity` or
`channel(i)` (a raw white or generic channel, as V1's `channel` patch
capability did); a color slot only `color`; other kinds only their own.
Mismatches are lint errors. *(Added 2026-10-26 during Step 0 execution:
without it V1 `channel(i)` patch entries could not import losslessly.)*

Routing is what lets one program drive several members **differently**
without `member` logic: V1's "output 1 → channel 2" fan-out imports as a
route. With `per-member` distribution, routes are relative to the member
started by the trigger (`members` indexes count from it), so a group of
size 7 whose positions are channel triplets can route slots 0/1/2 to the
three fixtures folded into one position. To make that possible a group
position may hold an ordered **tuple** of fixtures (3.9), and a route may
address a tuple index: `members: [{ position, tupleIndex }]`. Programs
that do not care see the tuple as one fixture.

Distribution semantics:

| distribution | evaluations per tick | `member` node | typical trigger |
| --- | --- | --- | --- |
| all | 1, written to every selected member | constant (0, 0, n) | one note |
| per-member | 1 per *active* member | that member | a note **range** (note `from`+k starts member `memberOffset`+k) or several single notes each with its own `memberOffset` (a `midi.note` on a per-member instance starts member `memberOffset ?? 0`) |
| spread | 1 per selected member, all started together | that member | one note; programs use `member` to offset phase, delay, color |

A program instance may be mapped by several triggers (see 3.8); each
trigger start is a separate **voice** with its own `time` and velocity.
Voices on the same member from the same instance replace each other
(latest wins), which is V1's behaviour.

### 3.8 Trigger, Mapping, Binding

```
Trigger =
  | { kind: "midi.note", device: "any"|deviceId, channel: 1..16|"any", note: 0..127 }
  | { kind: "midi.noteRange", device, channel, from: 0..127, to: 0..127 }   // per-member
  | { kind: "midi.programChange", device, channel, program: 0..127 }
  | { kind: "osc", address: string }                                       // value > 0 starts, 0 stops
  | { kind: "pad", id }                                                     // UI pad page
  | { kind: "key", key: string }                                            // keyboard in the UI

Mapping {
  id
  trigger: Trigger
  instanceId
  memberOffset?: number           // noteRange: note `from` starts member `memberOffset`
}

Source =
  | { kind: "const", value }
  | { kind: "midi.cc", device, channel, cc: 0..127 }
  | { kind: "midi.cc14", device, channel, msb: 0..31 }                    // msb+32 is lsb
  | { kind: "midi.nrpn", device, channel, param: 0..16383 }
  | { kind: "midi.pitchBend", device, channel }
  | { kind: "midi.aftertouch", device, channel }
  | { kind: "midi.polyAftertouch", device, channel }                       // per voice, keyed by its note
  | { kind: "osc", address, min?, max? }
  | { kind: "audio", device: "default"|deviceId, channel: number,
      measure: "rms" | "peak" | { band: { lowHz, highHz } } | "onset",
      attackMs, releaseMs, gainDb? }                                       // live, never chased

Binding { parameterId, source, curve?: "linear"|"log"|"exp", invert?: bool }
```

Rules: `midi.noteRange` is only valid for `distribution: per-member`. On a
per-member instance a `midi.note` mapping starts member `memberOffset ?? 0`;
`memberOffset >= size` is a lint error.
`device: "any"` and `channel: "any"` are explicit. An unbound parameter
reads its default. Several bindings on one parameter: the last changed
source wins (so a knob and an automation lane can share a parameter).

### 3.9 Patch

Stored inside the venue, one per show:

```
Patch {
  showId
  assignments: Assignment[]
  fallbacks: Fallback[]
  computedAt, health: Issue[]        // recomputed on every load; stored for display only
}
Assignment {
  groupId
  members: (fixtureId | fixtureId[] | null)[]   // index = group position; list = an ordered tuple (folded fixtures, or sub-fixtures addressed by routes); null = unfilled
}
Fallback { groupId, capability, strategy: "ignore" | "intensity-flash" | "nearest-color" | "map-channel"(i) }
```

Folding and spreading rules (deterministic):

- `venue count == size`: one fixture per position, ordered by the venue
  fixtures' `position.x` when present, else by address.
- `venue count > size`: fixtures are split into `size` contiguous runs in
  that order; each position gets a run (all fixtures in a run receive the
  same values).
- `venue count < size`: positions are distributed over the fixtures in
  order, several positions sharing one fixture; the merge then decides
  (HTP on intensity means the brightest position wins).
- `size == "any"`: positions = venue count.

The AI assistant only proposes `assignments` and `fallbacks`; this
structure is what it fills.

### 3.10 Overrides

```
OverrideBinding { override: "blackout" | "houseLights" | "master" | "freeze", trigger?: Trigger, source?: Source }
```

Master is a 0..1 multiplier on every intensity after merge. Blackout
forces intensity 0 and strobe 0. House lights is a scene chosen in
settings, applied above merge. Freeze holds the last frame.

### 3.11 Settings

`~/.ptah/settings.json`: device list with roles (clock master, enabled),
default render rate, UI port, current show and venue, house-lights scene,
library refresh policy, AI key reference (OS keychain name, never the key).

## 4. Files and identity

```
~/.ptah/
  settings.json
  library/types/<typeId>.json
  venues/<venueId>.json
  shows/<showId>/show.json
  shows/<showId>/programs/<programId>.json
  .backups/<entity>/<id>.<schema>.json
  v1/            // V1's original files, untouched, read by the importer
```

- V1 keeps writing to `~/.ptah/.ptah-settings.json`, `~/.ptah/shows/*.json`
  and `~/.ptah/programs/*.json`. V2 moves nothing and never writes those
  paths; it reads them as **import sources** and writes only to the
  directories above (`settings.json` without the dot prefix does not
  collide). *(Builder may choose a different, equally safe scheme.)*
- Every file has `schema: "<entity>@<n>"`. Migrations are per entity, keyed
  by `n`, idempotent, with a backup, as V1 does. There is no app-version
  stamping.
- Deleting a program that instances reference marks those instances
  `source.missing = true` in memory and in the UI; the file keeps the id.
- A show directory can be zipped and sent; ids are globally unique so two
  shows never collide on import.

## 5. V1 import

Deterministic, one shot, repeatable:

| V1 | V2 |
| --- | --- |
| settings `midiChannel` | `defaultMidiChannel` and the channel of every imported trigger and binding |
| settings `midiVirtualPortName` | the virtual port device in settings |
| fixture profile | built-in custom FixtureType with one mode |
| show fixtures | a Venue named after the show, one universe `usbpro`, fixtures at their addresses |
| each V1 fixture | one Group of size 1 **and** one venue fixture; then a merge pass (below) |
| program | Program with `input-control` → `parameter` named `cc<N>` (0..127 range preserved) plus a Binding `midi.cc` on the instance; `input-velocity` → `velocity` followed by `×127`; `fx-adsr` → `envelope`; math nodes split per operation; cycles: the back edge is **dropped** and reported (V1 cut it and read the port's node default every tick; `z1` is for new V2 programs only); node types V2 does not know (the unreleased `input-audio`) are kept as `unknown` nodes with their JSON, flagged, and evaluate to their default |
| mapping note → program | an Instance (`all`, `legacy` merge, `onStop: reset`) on a group made of the fixtures that program's patch entries touch, and a Mapping `midi.note` |
| patch entry | a Route on that instance: output slot → the group position holding that fixture; capability dimmer/channel/color → intensity/channel(i)/color |

**Collapse pass** (makes the result usable, not just correct): after the
literal import, instances whose programs have identical graphs (ignoring
ids and positions) **and identical routing shape** (same slots to the
same relative positions), identical bindings and identical merge/stop
settings on the same device and channel are collapsed, across all notes
of the show, into one group whose positions are the per-note fixture
tuples (ordered by note) and one `per-member` instance, mapped by a
`midi.noteRange` when the notes are contiguous, else by one `midi.note`
per member with `memberOffset`. (Contiguity was dropped on 2026-10-26:
HILLDALE's shapes alternate across notes.) Instances that
differ in routing shape form separate groups. HILLDALE collapses to seven
rows as in section 1. The pass is a proposal: the importer reports what it
would collapse, and the literal result is kept if the user declines. The
oracle always runs on the literal result.

Imported instances run in `legacy` merge: last write in patch order wins,
`onStop: reset` writes 0 to the channels the voice wrote. This reproduces
V1 output under the Step 1 oracle.

## 6. Evaluation model (what the VM must honour)

### 6.1 Pipeline per render frame

1. Read clock → beat position `B`, tempo. Read input queues → trigger
   events, source values. If `B` jumped (SPP, OSC cursor, Continue) and a
   timeline file is loaded, **chase**: derive from the file the notes held
   at `B` and the CC values at `B`, stop voices that should not exist,
   start missing voices with `time = B - noteStart`, set chased sources;
   live sources (audio, hardware knobs) are left as they are.
2. Apply trigger events: start voices (`time = 0`, velocity), stop voices
   (`gate = 0`), toggle, oneshot.
3. For every live voice, for every member it covers: run the compiled
   program with inputs (`time`, `B`, parameters after slew, velocity,
   member) → attribute writes `(fixture, capability, attribute, value,
   instance, priority, timestamp)`.
4. Scenes write their entries the same way (fade applied).
5. **Merge** per (fixture, attribute): `legacy` writers first, resolved
   in **voice start order** (a voice that starts later wins; a retrigger
   of a held note keeps its place; within one voice, route order), which
   is V1's running-program map order; then default writers: highest
   priority wins; among equal priority, intensity and strobe HTP,
   color/position/beam LTP by timestamp; a released writer's value is
   removed. V1's one-frame dip to zero when a stopping program resets
   channels another program still drives is **not** reproduced and is an
   accepted oracle difference.
6. Overrides: master multiplies intensity, house lights overrides,
   blackout forces, freeze returns last frame.
7. **Render** to channels per universe: attribute → bytes via the mode
   (8/16-bit, inverted ranges, virtual intensity in 6.4); attributes
   nothing wrote take the venue fixture's `park` value, else the mode's
   channel default.
8. Emit frame to outputs and to the debug stream with the per-channel
   provenance from step 5.

### 6.2 ADSR and gates

`adsr` reads the voice gate: attack/decay/sustain while held, release from
note off, in beats. `onStop: release` keeps the voice alive until all
`adsr` nodes finished; `reset` stops immediately and writes 0 (legacy);
`hold` keeps the last values until another writer takes the attribute.

### 6.3 Compiled form

A program compiles once per (program, parameter layout) into a flat list of
ops over a value buffer: `op(kind, in[], out)` with slot indexes (variable
input count per op, up to five today); constants and parameter slots preallocated; one buffer per voice
per member, reused. Target: no allocation after start; evaluation of a
voice of 20 nodes well under 2 µs on a Pi 4 (budget in the master plan).
Debug probes read any slot by id.

### 6.4 Color and intensity

Programs write color as rgb 0..1 (hsv converted in the node). Fixtures
with white/amber/uv channels get those from a color model chosen per venue
fixture (`colorModel`, default `subtractive-white`: `w = min(r,g,b)` and
`r,g,b` are each reduced by `w`; `a = 0`, `uv = 0`; `rgb-only`: `w` keeps its park or
mode default, which is what V1 did — the importer sets `rgb-only` on
imported fixtures that have a white channel), overridable per entry in a
scene. Fixtures with color channels but no intensity channel
have a **virtual intensity**: rendered rgb = rgb × level. This is what lets
a dimmer-only program (`flash`) drive an RGB par as white.

## 7. Health (computed, shown everywhere)

Per show+venue: unfilled group positions, missing capabilities and the
fallback used, address overlaps, instances with missing programs,
parameters bound to sources that never arrived in the last session,
mapped notes never seen in the last MIDI file loaded, MIDI events on
unmapped channels, venue changed since the DAW offset was set.

## 8. Decisions made in this document (owner can overturn)

- Member positions are ordered left-to-right by venue `position.x`, else
  by address.
- Scenes are partial; fades are in beats.
- Voices on the same member from the same instance replace each other.
- `legacy` merge order is V1's voice start order; V1's one-frame zero dip
  on stop is not reproduced.
- V1 `fx-adsr` becomes a dedicated `envelope` node rather than being mapped
  to the gate-aware `adsr`; velocity becomes 0..1 with the importer
  compensating; unknown V1 node types are kept and flagged.
- The oracle fixture is the literal import; the "seven RGB pars" reading is
  a separate hand-authored example.
- Instances have output routing, and a group position may hold an ordered
  tuple of fixtures.
- A show may carry its DAW timeline export for position chase; chase
  rebuilds voices and CC values from it on every jump.
- Audio is a parameter source like any other, reduced to a 0..1 value in
  the engine.
- Unwritten attributes hold a per-venue-fixture `park` value, else the
  mode default. Capability matching lets any fixture offering the required
  capabilities fill a position (a moving head can stand in for a par).
- Several bindings on one parameter: last changed wins.
- Virtual intensity on color-only fixtures; `w = min(r,g,b)` default.
- Math becomes one node type per operation; `lfo`, `smooth`, `map`,
  `select`, `step`, `random`, `beat`, `member`, `subgraph`, `z1` added.
- V2 files live beside V1's in `~/.ptah`, V1 is never written by V2.
- Imported shows are collapsed into groups when graphs are identical, with
  the literal result kept as an option.

## 9. Left to the builder

Exact JSON Schema wording, id formats inside files, the op list of the VM
beyond "one op per node type", slew implementation, how the debug stream
encodes provenance, OFL cache refresh policy, the merge-pass similarity
algorithm's tolerance.

## 10. Open for the owner

See the questions delivered with this document.
