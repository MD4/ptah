# PTAH V2 — Debug mode, piece 3: Why is this light doing that (design)

Status: approved by the owner, 2026-11-18.
Code: `~/projects/ptah-v2`, branch `debug-why`.
Step 4 of the master plan, third of the four pieces agreed on 2026-11-18
(1 Monitor, merged; 2 Look back, merged; **3 Why is this light doing
that**; 4 live probes and the measured Reaper offset).

Words: "the owner" is the band's drummer who runs PTAH. "A light" is one
venue fixture. "A writer" is anything that writes a value on a light in a
frame: a voice of a row of the show (three notes held on one row are three
writers), a scene, the house lights, the fallback look. Identify is not a
writer: it rewrites the result after the merge. "The watched light" is the one
light the engine explains. "The panel" is the new block that shows the
explanation.

## 1. Intent

The Monitor shows what came in, what plays and what went out. It does not
show the middle: when a light is red, or dark, or stuck, nothing says which
row won on it and why. The owner clicks the light in `Going out`, and a
panel says, for that light, at each frame: who wrote, who won and why, what
the overrides did, and where each channel value comes from.

The owner's answers (2026-11-18): they do not know yet whether they will
ask the question live or after the fact, and accepted the author's
proposal: live, on the Monitor (approach A), built so that a replay can
reuse it later.

## 2. Goals, non-goals, anti-goals

Goals

1. Clicking a cell of `Going out` on the live Monitor selects its light.
2. The panel lists, per attribute, every writer of this frame with its
   value, the winner, and the reason in plain words.
3. One line says what the overrides did, loud only when one changed the
   result.
4. Each channel of the light shows its value and where it comes from.
5. A dark light and an empty cell get a plain answer too.
6. The explanation comes from the real merge and the real fixture step,
   never from a copy of their rules.
7. With no light watched the engine does no extra work that the existing
   performance guards can see; with one watched, the render thread still
   allocates nothing and stays inside the same guards.
8. `Pause` freezes the panel with the rest of the page.

Non-goals

- The panel in Look back, or recording explanations (approach B, later).
- Explaining more than one light at a time.
- Which voice was cut when voices run out (the engine only counts cuts
  today; the panel shows the count, see 5.4).
- Why a row did or did not start on an event (the Monitor's `listens`
  column stays as it is); node values inside a program (piece 4).
- Editing anything from the panel.

Anti-goals

- A second merge or a second fixture step, in TypeScript or in Rust: an
  explanation that can disagree with the lights.
- A panel that jumps while the owner reads it.
- Any cost at a gig when nobody looks.

## 3. Approaches

**A. Live: the engine explains one watched light while it renders (chosen
by the owner).** Exact, bounded, free when unused. Limit: live only; to
explain a glitch the owner makes it happen again (plays the song from
Reaper).

**B. In Look back, by replaying the recording through the engine.** The
replay exists, but it cannot be exact today: the recorder does not keep
commands sent from the app (master, blackout), notes held before the
session's start are missing, and a replay uses today's files. Rejected for
now: an explanation that is sometimes wrong is worse than none. A's engine
part is written so a replay engine can call it once the recording is
complete enough.

**C. Record the explanation of every light, always.** Rejected: disk and
render time at every gig for a rare question.

## 4. The screen

Route: `/debug` (the live Monitor), with `?light=<fixtureId>` when a light
is selected. Nothing changes on `/debug/back`: its cells are not
selectable.

```
GOING OUT
Main                              20 frames/s
[ grid of 512 cells, the light's cells outlined ]
channel 17 · Par 3 · red · 212               (hover line, as today)

PAR 3 · channels 17–20                          Esc clears
level    83 %   ■ sine (pars)       wins: highest level
                  distorded (pars)  31 %
colour   red    ■ flash (pars)      wins: started last
                  sine (pars)       blue
strobe    —     nothing writes it
overrides  none
ch 17  red     212  from the colour
ch 18  green     0  from the colour
ch 19  blue      0  from the colour
ch 20  white     0  fixture default
```

### 4.1 Selecting

- A click (or Enter/Space on a focused cell) on a cell that belongs to a
  light selects the light: all its cells are outlined, the panel fills,
  the URL gets `?light=`.
- A click on a cell of the selected light, or `Esc`, clears it.
- A click on a cell with no light shows, in the panel's place: `no light
  patched on channel N`. Nothing is watched.
- The hover line stays as it is.
- Opening `/debug?light=<id>` selects that light. An unknown id is
  dropped from the URL, calmly.

### 4.2 The panel

Placed under the grid of the universe that holds the light. When nothing
is selected the same place holds one calm line: `click a light to see why
it does what it does`.

Head: the light's name, its channel range, `Esc clears`.

Attribute rows, in a fixed order, only those the light's mode can show:
`level`, `colour`, `strobe`, `position`, `beam`. The rows are always
there for the selected light; only the writers under them come and go. A
raw channel gets a row the first time something writes it, and the row
then stays while the light is selected.

- `colour` groups r, g, b, w, a, uv when one writer wins all the colour
  components written (the usual case) and shows a swatch and the values;
  otherwise each component gets its own row. `position` groups pan and
  tilt, `beam` zoom, focus and iris, the same way.
- Per row: the merged value, then one line per writer: the winner first
  with a mark, then the others in start order. A line holds the writer's
  name as `Playing now` words it, followed by its note when it has one
  (`sine (pars) · C3`), or the scene's name, `house lights`, `fallback
  look`; its value; for the winner the reason.
- Reasons, exact words: `only one`, `higher priority`, `highest level`
  (level and strobe among equal priority; on a tie the mark goes to the
  earliest started), `started last` (colour, position, beam among equal
  priority, and legacy rows). House lights and the fallback look are real
  writers of the merge: they win with `house lights are on` (loud) and
  `fallback look: no show drives the rig` (loud), not through the
  overrides line.
- A writer that reaches the light through a patch fallback says `via
  fallback: <kind>`. A write of a held voice says `held`; a write that
  resets to zero says `resetting to 0`. A held or resetting write that a
  live writer keeps out says `waiting: a live row has it`.
- A write dimmed by the quiet fade says `quiet fade` beside its value.
- At most 6 writers are listed per row, then `and n more`.
- A row nobody writes: `nothing writes it`.

Overrides line: `overrides none` when calm. Otherwise one loud line per
override that changed this light: `blackout forces 0`, `master 60 %: 83 →
50 %`, `identify`, `frozen: this is the last frame`.

Channel lines, one per channel of the mode (up to 64): offset as channel
number, the mode's channel name, the value, and the source, exact words:
`from the <attribute>`, `white taken out of the colour`, `colour reduced
by its white`, `colour × level (no dimmer channel)`, `0: the colour model
sets it` (amber, UV), `colour made up for a level-only write`, `raw
channel write`, `park` (a parked attribute or a parked channel alike),
`fixture default`, `fine part of <channel>`.

Last line, only when it applies: `n voices were cut to make room in this
frame, on the whole rig` (see 5.4).

### 4.3 States

| State | The panel |
|---|---|
| nothing selected | the calm hint |
| a cell with no light | `no light patched on channel N` |
| selected, explanation arriving | head, rows empty, no jump |
| selected, lit | as drawn |
| selected, dark, no writer | rows say `nothing writes it`; channels say their source |
| an override decides | the loud overrides line |
| frozen | `frozen: this is the last frame`, the last explanation stays |
| the light cannot be explained (its type is missing or unusable) | `this light has no usable type: PTAH does not drive it` |
| no show loaded | `no show is loaded: nothing drives the lights`; no rows, no channel lines (the engine has no fixture step without a show); nothing is watched |
| paused | frozen with the page; a click on another light does nothing; `Esc` clears; at Resume the page takes the engine's current selection |
| another screen selects or clears | this page follows: selection and URL change (not while paused) |
| connection lost | the panel keeps what it showed, dimmed, as the columns do |

Rules that apply: tokens only, nothing shifts when values change, calm
when well and loud only when an override or a cut applies. At 390 px the
panel stacks under the grid like the rest of the column.

## 5. Engine and server

### 5.1 The watched light

- One watched light for the whole engine, or none.
- A new command `watch { fixtureId: string | null }` on the existing
  command path. The server turns the id into the venue index of the
  running venue; the render thread keeps the engine's own fixture index
  (as Identify does). Unlike Identify it is accepted while the clock
  runs.
- Refusals: no show loaded; unknown fixture id; a fixture the engine did
  not resolve (answer the page words as `no usable type`).
- The server has no fixture command by id today (Identify takes a venue
  index and the show epoch, computed by the Venue page): this command
  resolves the id on the server.
- A show or venue load clears the watch; the server sets it again when a
  page still asks for it and the fixture still exists.
- The server clears the watch when the last subscriber of the `why` topic
  leaves, so a closed laptop costs nothing.

### 5.2 What the render thread records

Only for the watched light, into storage allocated at load, all `Copy`,
nothing formatted:

1. **At write time**: for each write aimed at the watched light, the
   writer's identity that the merge does not keep (which instance or
   scene or system writer, the voice's phase, the fallback kind if any),
   whether the quiet fade scaled it, the voice's note), keyed by the
   merge's writer id; and the held or reset-zero writes kept out because
   a live writer took the attribute (the phase gate), which never reach
   the merge.
2. **At merge time**: the merge itself says, per attribute, which layer
   won and why, and why each other layer lost. This is one function in
   `ptah-vm`'s merge, beside `resolve_ranked`, reading the same layers;
   `resolve_ranked` and it must not be two implementations of the rule
   (one calls the other, or both share the ranking).
3. **At the overrides step**: per attribute, the value before and after,
   and which override changed it (master, blackout, identify, park taken
   for an unwritten level).
4. **At the fixture step**: `render` gains an optional per-channel
   source output; the same code path fills the bytes and the sources.
5. The number of voices cut and of merge writes that did not fit, in
   this frame: differences of the engine's running totals, for the whole
   rig, not for this light. A write that did not fit is not listed as a
   writer.

Bounds: 64 recorded writes per frame and 64 channels; beyond them a
count (`more`). Under freeze the last explanation stays and is flagged.

### 5.3 From the render thread to the page

- The explanation of a frame travels like a debug frame: published every
  frame while a light is watched, read by telemetry at the debug rate,
  with the same frame index as the frame the grid shows.
- Telemetry (off the render thread) turns indices into ids: instance id,
  scene id, fixture id.
- A new WebSocket topic `why`. One message per explained frame:

```json
{ "frameIndex": 1234, "at": 1795011771000, "fixtureId": "par-3",
  "frozen": false, "cut": 0, "more": 0,
  "attributes": [
    { "attribute": "level", "merged": 0.83, "final": 0.83,
      "override": null,
      "writers": [
        { "kind": "row", "id": "<instance id>", "phase": "live",
          "value": 0.83, "priority": 0, "mode": "default",
          "fallback": null, "won": true, "reason": "highest" },
        { "kind": "row", "id": "<instance id>", "phase": "live",
          "value": 0.31, "priority": 0, "mode": "default",
          "fallback": null, "won": false, "reason": "lower" } ] } ],
  "channels": [
    { "offset": 0, "value": 212, "source": "attribute",
      "attribute": "r" } ] }
```

  `kind`: `row | scene | houseLights | fallbackLook`.
  `reason` for a winner: `only | priority | highest | last | houseLights
  | fallbackLook`; for a
  loser: `priority | lower | earlier | legacy` (a legacy row under a
  default writer) `| dropped` (slot already taken). `override`: `null |
  master | blackout | identify | park`. `source`:
  `attribute | derivedWhite | reducedByWhite | virtualIntensity |
  modelZero | madeUpColour | raw | park | default | fine`.
  Identify is never a writer `kind`; house lights are never an
  `override`. A writer also carries `note` (number or null) and `quiet`
  (true when the quiet fade scaled it). `phase`: `live | held | reset`.
  The loser reason `dropped` is the phase gate of 5.2.
- A subscriber gets a snapshot at once: the current explanation, or
  `{ "fixtureId": null }`. A clear (another screen, a load that removes
  the fixture, a refusal) sends `{ "fixtureId": null }` to everyone.
  Otherwise the topic is silent while no light is watched.
- The topic set is 8 bits wide and full today: `why` widens it.

### 5.4 Limits said plainly

- When voices run out the engine cuts the oldest voice. It counts cuts
  but does not say which voice; the panel shows the count for the frame
  and nothing more.
- A row whose light lacks a capability, with no fallback or `ignore`,
  never writes: it does not appear among the writers. (The show's health
  already reports `missing-capability`.)
- The explanation is sampled at the debug rate (20 a second by default):
  a writer that lives for one frame between two samples is not seen.
  `Pause` shows one true frame.

## 6. Where the code goes

- `crates/ptah-vm`: the merge explanation (merge.rs), the per-channel
  sources (render.rs), the recording for the watched light (show/frame.rs
  and beside it), the fixture index map exported by the loader.
- `crates/ptah-engine`: the `watch` command, the publication of the
  explanation, telemetry's conversion to ids and its sink.
- `crates/ptah-server`: the command, the `why` topic, clearing the watch
  with the last subscriber and setting it again after a load.
- `packages/ds/src/debug`: the cell selection in `UniverseBlock`, a new
  `WhyPanel`, the words (model/words.ts), stories and visual baselines.
- `apps/web/src/debug`: `useMonitor` gains the selection (`?light=`), the
  `why` subscription and the pause rule.
- Docs: `docs/engine.md`, `docs/vm-rust.md`, `docs/api.md`,
  `docs/app.md`, `docs/design-system.md`.

## 7. Testing and exit

- Merge: for generated sets of layers, the explanation's winner and
  value equal `resolve_ranked`'s, for every attribute kind and both merge
  modes.
- Fixture step: with and without the sources output the bytes are equal;
  each source word is produced by a case (written, derived white, reduced
  colour, park attribute, park channel, mode default, raw, fine, virtual
  intensity).
- Frame: a watched light with rows, a scene, house lights, blackout,
  master, identify and freeze explains each as worded; a fallback write
  is tagged; a dropped write is listed as dropped.
- Allocation and time: the existing 512-instance allocation guard and the
  performance guards pass unchanged with no light watched, and pass with
  a light watched (0 allocations per frame; same p99 limits).
- Engine and server: the command's refusals; the watch survives a show
  load when the fixture remains and is cleared when it does not; cleared
  when the last `why` subscriber leaves; the topic's message shape.
- ds: the panel's states of 4.3 as stories with visual baselines at
  1280, 960 and 390; nothing shifts when values change.
- web: selection by click, key and URL; following another screen; pause.
- e2e: with the fake MIDI, play a note, select a lit light: the panel
  names the row and `from the colour`; blackout: the loud line; `Esc`
  clears and the topic goes silent.

Exit: the owner selects a light on the demo while the rendered HILLDALE
set plays, pauses, and reads who drives it.

## 8. Left to the builder

- The exact Rust types and where the recording buffer lives.
- How the explanation is published to telemetry (a third triple buffer
  beside the output and debug ones is the expected shape).
- The command's wire name and ack messages; how the server remembers the
  wanted fixture across loads.
- The panel's layout inside the column, within section 4's content and
  rules.

## 9. Calls made by the author (not the owner's decisions)

- One watched light for the whole engine; every screen shows it.
- Selecting a cell selects the whole light, not one channel.
- Bounds of 64 writes and 64 channels, 6 writers listed per row.
- The watch is cleared when nobody subscribes.
- Grouping colour, position and beam into one row when one writer wins
  the whole group.
- Selecting is refused while paused.
- One line per voice, with its note, the winner first.
- House lights and the fallback look shown as winning writers; Identify
  on the overrides line.
- No channel lines without a show; `Esc` works while paused and Resume
  takes the engine's selection.
- The exact words of 4.2 and 4.3.
