# PTAH V2 — Debug mode, piece 4b: live probes in the Builder (design)

Status: approved by the owner, 2026-11-19.
Code: `~/projects/ptah-v2`, branch `debug-probes`.
Step 4 of the master plan, last piece (1 Monitor, 2 Look back, 3 Why is
this light doing that, 4a the measured Reaper offset: all merged; **4b
live probes**).

Words: "the owner" is the band's drummer who runs PTAH. "A row" is an
instance of the show that plays a program. "A node's value" is the number
at a node's output, as the Builder draws it today. "The watched row" is
the one row the engine probes. "The dock" is the Builder's bottom panel.

## 1. Intent

The Builder draws a value and a curve on every node, from a test note
played in the browser. "On the rig" plays the draft on the real lights,
still with test notes. Nothing shows what a program's nodes do when Reaper
plays the song: the real notes, velocities and CCs. `From the show` shows
the same values and curves, taken from the engine while the show plays.

The owner's answer (2026-11-19): the proposal as sketched, in the
Builder, from the engine (not a re-enactment in the browser).

## 2. Goals, non-goals, anti-goals

Goals

1. On a program's Builder page, a switch `From the show` makes every node
   show its value and curve as the engine computes them in the playing
   show, for one row that plays this program.
2. The dock says which row, which light and which note the values are
   from, and how many notes the row plays.
3. The owner picks the row when several play the program, and can pin a
   light of the row's group; by default the values follow the newest
   note.
4. Settings driven by CCs show their live value on their node, with or
   without a note sounding.
5. With nothing sounding on the row the other nodes show `—` and the dock
   says so.
6. The values are the engine's own (the slots of the voice it renders,
   and the row's own setting values), never a second evaluation.
7. With the switch off the engine does no extra work the performance
   guards can see; with it on, the render thread allocates nothing and
   stays inside the same guards.

Non-goals

- Probing a draft with unsaved changes against the show (the engine plays
  the saved program), or probing while `On the rig` is on.
- Probes in Look back (not recorded) or on the Debug pages.
- A pause, a scrub, an export of the curves.
- The preview lights strip in this mode (the lights are the rig's: the
  Monitor and the room show them).
- Values of a node inside a subgraph program (only this program's own
  nodes, as the canvas shows them).

Anti-goals

- A value on the canvas that is not what the engine computed for that
  node (a stale draft, a browser re-enactment, an idle guess).
- Any cost at a gig when the switch is off.

## 3. Approaches

**A. The engine probes one watched row (chosen by the owner).** The
engine already has the read the browser preview uses on its own copy
(`CompiledShow::probe(instance, member)`: the newest voice's node slots,
no allocation). The render loop copies it each frame for the watched row;
it travels like the explanation of piece 3. Exact; free when off.

**B. Feed the show's notes and CCs into the browser preview.** No engine
change, but a re-enactment: timing, voice stealing and several notes at
once drift from what the lights did. Rejected.

**C. Probes on the Debug page (a list of node values per row).** Rejected:
without the canvas the numbers have no meaning.

## 4. The screen

The Builder page of a program (`/builder/<show>/<program>`). The dock
gains one switch beside `On the rig`.

```
TEST                         LIGHTS                 RIG
[note] [velocity] [sliders]  ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢        [On the rig]  [From the show]
(dimmed: the show drives)    lights: on the rig     row  sine (pars) ▾   light  newest note ▾
                                                    C3 · light 3 of 8 · 2 notes playing
                                                    sampled 20 times a second
```

### 4.1 The switch

- `From the show` is a toggle in the dock's rig section. Off by default;
  it is not kept across pages.
- It can be turned on when a show plays, it is this program's show, a
  row uses the program, and no `On the rig` holds the engine. Otherwise
  it is disabled with its reason under it; the first that applies, exact
  words (the first two are `On the rig`'s own):
  1. `load <show> first` (no show, or another show plays);
  2. `no row uses this program`;
  3. `turn off On the rig first` (this page's);
  4. `On the rig is on, on another screen`.
- A draft with errors does not disable it: the show plays what it loaded.
- While it is on, `On the rig` is disabled with `turn off From the show
  first`.
- **Unsaved changes do not turn it off; they pause it.** From the first
  edit the nodes show `—` (settings too) and the status line reads
  `unsaved changes: save to see the show again`. After the save and the
  show's reload the values come back by themselves. This is the normal
  edit, save, look loop.
- **The show must play this version.** The engine says which revision of
  the program it loaded; when it is not the page's (a save that was not
  applied, a save from another screen), the nodes show `—` and the status
  line reads `the show plays an older version: reload the show`.
- It turns itself off, with the reason shown, only when the owner cannot
  mend it from this page: another show loads, the row is removed, `On the
  rig` starts on another screen, another screen probes a row of another
  program.

### 4.2 What changes while it is on

- Every node shows the engine's value and its curve fills from the
  engine's samples (20 a second; the curve covers the last 12 s). A node
  the engine has no value for (not playing, no slot) shows `—` and a flat
  curve.
- A setting node shows the row's live setting value (a CC moves it),
  also when no note sounds.
- An output node shows the value of its input, as a number, on its usual
  single curve; a colour output shows `—`, no swatch and no curve (its
  colour is on the rig).
- The test panel (note, velocity, sliders, tempo, Hold) is dimmed and
  inert, with one line: `the show drives`.
- The preview lights strip keeps its box and says `lights: on the rig`.
- Under the switch:
  - `row` chooser when several rows play the program (the same chooser
    `On the rig` uses), else the row's name.
  - `light` chooser: `newest note` (default), then `light 1` … `light N`
    of the row's group.
  - a status line, calm: `<note> · light <m> of <N> · <k> notes
    sounding` (`1 note sounding`; a note still fading counts); for a row
    that plays all its lights together, `all lights` in place of `light
    <m> of <N>`; `test note` in place of the note's name for a voice with
    no note (a hold-to-play); `held` after the name when the voice is
    held; `not playing` when the row has no voice (`not playing on light
    <m>` for a pinned light).
  - `sampled 20 times a second: a very short hit may not show`.

### 4.3 States

| State | The dock and the canvas |
|---|---|
| off, could be on | the switch, calm |
| off, cannot be on | the switch disabled, its reason |
| on, row playing | values and curves from the engine; the status line |
| on, row not playing | setting nodes show their value; every other node `—`; `not playing`; curves keep their last 12 s and run flat |
| on, pinned light without a voice | as not playing, with `not playing on light <m>` |
| on, the newest note changes | the values follow it; the curves continue; the status line names the new note |
| on, unsaved changes | every node `—`; `unsaved changes: save to see the show again`; resumes after the save is applied |
| on, the show plays another revision | every node `—`; `the show plays an older version: reload the show` |
| on, the same show reloads (a save, Perform's Reload) | the switch stays on; values keep what they showed, dimmed, until the first new sample |
| on, a row that is switched off or faulted | `this row is switched off or faulted: it plays nothing` |
| another screen changes the row or the light, same program | this page follows: its choosers change |
| another screen probes a row of another program | switch off; `another screen is probing <row>` |
| another show loads, the row is removed, On the rig starts elsewhere | switch off with the reason that now applies |
| connection lost | values and curves keep what they showed, dimmed; on return the page subscribes again and takes what the engine probes, or asks for its own row when nothing is probed |

Rules that apply: tokens only; nothing shifts when values change or when
the mode changes (the dock's sections keep their boxes); calm (no loud
word in this mode); every action reachable by keyboard; the palette gains
`From the show` / `Back to the test note`.

## 5. Engine and server

### 5.1 The watched row

- One watched row for the whole engine, or none; independent of the
  watched light of piece 3.
- A command `probe { instanceId: string | null, member: number | null }`
  (`member` null: the newest voice wherever it plays). The server resolves
  the instance id against the playing show; the render thread keeps the
  instance index and the member.
- The last command wins; every subscriber is told by the topic. A page
  that turns its switch off only unsubscribes (it never clears another
  page's probe).
- Refusals: no show; unknown instance; an instance that plays no program
  (a scene, or a row switched off or faulted: its own code); a member
  outside the row's group; a preview holds the engine.
- A show load clears it; the server sets it again when a page still asks
  and the instance exists and plays the same program, else forgets it and
  tells the subscribers.
- The server clears it when the last subscriber of the `probe` topic
  leaves.
- A preview load (`On the rig`) clears it and refuses a new one while the
  preview holds (the instance then runs a draft).

### 5.2 What the render thread does

After each frame, for the watched row only: read `CompiledShow::probe
(instance, member)` and copy the slots into storage allocated at load
(sized to the largest program of the show, at most 1024 slots; a larger
program is probed up to that many and flagged), with: the voice's note,
whether it is held, how many voices the row has, the frame's index and
time; and the row's current setting values (the instance's parameters,
as the voices read them), which exist with or without a voice. No voice:
no slots, the count 0, the settings still. Nothing is formatted or
allocated; nothing is published while no row is watched.

The count is of the row's voices that are not free: sounding, fading or
held.

The voice is the newest of the row (greatest start order), re-picked each
frame: a new note or a stolen voice changes the source; the note in the
message says which it is.

### 5.3 From the render thread to the page

- The probe travels like the explanation of piece 3: published each
  frame while watched, read by telemetry at the debug rate (20 a second)
  only while the `probe` topic has subscribers.
- Telemetry turns slots into node values by the watched program's own
  table of node ids and slots (built with the show, off the render
  thread).
- A new WebSocket topic `probe`. A subscriber gets a snapshot at once
  (the current probe, or `{ "instanceId": null }`). One message per
  sampled frame:

```json
{ "frameIndex": 1234, "at": 1795011771000,
  "instanceId": "<instance id>", "programId": "<program id>",
  "programRevision": "<revision of the program as the engine loaded it>",
  "member": 2, "members": 8, "pinned": false, "together": false,
  "note": 60, "held": false, "voices": 2, "sounding": true, "more": false,
  "nodes": { "<node id>": 0.62, "<node id>": null } }
```

  `member`: the light the probed voice plays on (0-based; the page shows
  `light 3`); `pinned`: whether the watch asked for a light; `note`: null
  for a voice with no note (a trigger of the rig) and when nothing plays;
  `sounding`: a voice sounds on the probed light (false for a pinned light
  with no voice while the row plays on others: the page says `not playing
  on light <m>`; added at the final review); `together`: the row plays all its lights together (`member` is then
  0); `voices` 0 when nothing plays, and `nodes` then holds only the
  setting nodes' values; a node the engine has no value for is null or
  absent; a colour output is always null; `more`: the program has more
  slots than probed. `programRevision` is comparable with the revision
  the program's `GET` gives the page (how: left to the builder, section
  8). A cleared watch sends `{ "instanceId": null
  }` to everyone.

### 5.4 Limits said plainly

- 20 samples a second: a node that moves for one frame between two
  samples is not seen.
- The newest note only: with a chord, the other notes' values are not
  shown; the count says they exist.
- A held voice is not evaluated again: its values stand still.
- Nothing playing means no value, except settings: the engine does not
  evaluate a program at rest (the test preview does; that is why `—` here
  and a resting value there).
- A setting's value at rest is the row's parameter; while a note sounds
  it is the voice's own slot (the same number unless the program reads it
  through a smoothing).
- In a row that plays `all together`, every light has the same inputs;
  pinning a light changes little.

## 6. Where the code goes

- `crates/ptah-vm`: nothing new but the storage size and the note of the
  probed voice if `probe` does not give it (an additive read).
- `crates/ptah-engine`: the `probe` command, the copy after the frame,
  its publication, telemetry's conversion (`ProbeFrame`), the node table
  in the show's info.
- `crates/ptah-server`: the command by instance id, the `probe` topic,
  the watch's lifetime.
- `packages/ds/src/builder`: the switch and its reasons, the choosers and
  the status line in the dock, the dimmed test panel, the lights line;
  the mode in the screen's props; stories and boards.
- `apps/web/src/builder`: a `useShowProbe` beside `usePreview` giving the
  same `NodeValues` to the canvas; availability; the page's state rules.
- Docs: `docs/engine.md`, `docs/api.md`, `docs/app.md`,
  `docs/design-system.md`.

## 7. Testing and exit

- Engine: a watched row with one note, a chord (the newest wins, the
  count is right), a pinned light, a held voice, no voice, a stolen
  voice, a program larger than the storage; a load clears; a preview
  load clears and refuses; refusals.
- Allocation and time: the existing guards unchanged with no row watched,
  and the same guards with a row watched.
- Server: the snapshot, the lifetime (two subscribers, the last leaves, a
  load with and without the instance), the message's shape.
- ds: the dock's states of 4.3 as stories with boards; nothing shifts
  between the test preview and `From the show`, nor between values.
- web: the availability reasons, the self turn-off, the choosers, the
  mapping by node id, a draft node the engine does not know (`—`).
- e2e (real MIDI): play a note on a row, open its program, turn on `From
  the show`: a node shows a value and the status line names the note;
  stop playing: `not playing`; edit the draft: the switch turns off with
  its reason.

Exit: the owner opens a program while the rendered HILLDALE set plays,
turns on `From the show`, and reads the CC-driven setting move on its
node.

## 8. Left to the builder

- The Rust types, where the storage lives, how the probe is published (a
  buffer sized at load, swapped like the others).
- The command's wire name beside `watch`; how the server remembers the
  wanted row across loads.
- How the program's revision is made comparable between the engine's
  load and the page (the show file's revision, a hash of the program as
  loaded: whichever the existing revisions make simplest).
- The dock's layout inside its section, within section 4's content and
  rules.

## 9. Calls made by the author (not the owner's decisions)

- One watched row for the whole engine; a second screen turns the first
  one's switch off.
- The values follow the newest note by default; a light can be pinned.
- Unsaved changes pause the values (`—`) and a save brings them back;
  the switch stays on.
- The engine names the program's revision, so an older version in the
  show is said, never shown as if current.
- Settings show their live value at rest, from the row's parameters;
  every other node shows `—` at rest.
- A colour output shows `—` in this mode.
- Two screens on the same program follow each other's row and light.
- `notes sounding` counts fading and held notes.
- The curve covers 12 s (the same 240 samples, at 20 a second).
- The test panel dimmed and the lights strip replaced by one line.
- The exact words of section 4.
