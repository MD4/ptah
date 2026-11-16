# PTAH V2 — Show screen (design)

- **Date:** 2026-11-17
- **Status:** approved by the owner 2026-11-17 (layout B, the scope split,
  hold-to-play in scope, approach 1: chosen in conversation), builder-checked
- **Repo:** `~/projects/ptah-v2` (V1 is never modified)
- **Step:** 3, fourth screen (after Perform, Venue, Library). Master plan
  §4.2, §4.2.1, §4.4; Step 0 design §3.3–§3.8.
- **Mockups:** `~/projects/ptah/.superpowers/brainstorm/78641-1794868807/content/show-layouts.html`
- **Builds on:** the Venue design (`2026-11-16-v2-venue-screen-design.md`):
  the draft model, Save and apply, the revision check, Flash's command.

## 1. Intent

In V1 a show ties each program straight to specific lights: when the
lights change, the show is redone. The owner's last V1 edit was exactly
that job, "mapping my programs onto the venue's lights".

V2 splits it. The show says which program plays on which **group** of
lights and which notes start it, and never names a venue. A venue's
patch (Venue screen, Patch tab, shipped) puts each group on real
fixtures. The Show screen is where the first half is edited: once per
show, for every venue.

It serves the owner's final objective (the same show on any venue's rig)
and it is one of the screens that must exist before V1 is uninstalled.

The owner thinks from the programs ("flash goes on the pars"), not from
the notes. The notes already exist in the band's Reaper tracks, so the
screen must make it easy to keep each note pointing at the right
program and light.

## 2. Goals, non-goals, anti-goals

Goals
- Shows: create, duplicate, rename, delete. No two shows share a name
  (closes finding F-E, the two `HILLDALE` rows in the picker).
- Groups: add, rename, resize, name the lights, delete.
- The grid: for one group, programs as rows and lights as columns; a
  cell holds the notes that start that program on that light.
- Per row: which program, how it plays (one note per light, one note
  for all, one note spread), its faders (which CC drives which program
  setting), what each program output drives on a light.
- Merge groups: fold groups of the same shape into one and keep every
  note, so an imported show (7 groups for HILLDALE) becomes a few.
- Hold to play: hold a cell and that program plays on that light on the
  real rig, as if Reaper had sent the note.
- Problems are shown while editing, and what the page shows is what the
  engine will say at load.
- A saved edit to the playing show reaches the lights without a restart.
- Everything except hold-to-play works with no rig and no show loaded.

Non-goals (later plans)
- Songs and sections, scenes (creating or editing them), overrides
  (blackout on a pad, master), the timeline (MIDI file import), the
  fallback look, tempo and clock mode.
- Editing programs: the Builder. A new show gets programs by copying
  them from another show (§4.6).
- Triggers other than MIDI notes (program change, OSC, pad, key), and
  fader sources other than a 7-bit CC. They are shown and kept.
- AI of any kind.
- Patching. The Venue screen does it; this screen links to it.
- Editing on a phone. The phone gets a read-only view.

Anti-goals (a failure even if it works)
- Losing data: every part of the show file this screen does not edit
  (songs, scenes, overrides, timeline, tempo, clock mode, fallback
  scene, a mapping's device, a binding's curve and invert, an
  instance's merge, `velocityTo`, `heldVoiceCapBeats`, `members`,
  routes the page cannot express) comes back from a save exactly as it
  was read.
- The page saying "fine" and the engine refusing the show at load.
- A note silently moved: after any edit other than to that cell, every
  note starts what it started before. Merge and resize included.
- A program left playing after hold-to-play, or hold-to-play firing
  during a song.
- An edit reaching the running show without Save having been pressed.
- Layout that shifts while editing.

## 3. Approaches

Where the checking runs while editing.

1. **The server checks the draft.** Chosen by the owner. A moment after
   each edit the page sends the unsaved show to the server, which
   answers with the Rust lint's issues. One set of rules, the one that
   checks a show at load. Feedback about a tenth of a second after the
   edit stops; none while the server is unreachable (and no save then
   either).
2. **Rules twice, as on the Venue screen.** Instant, but show rules
   depend on each program's parameters and outputs; two copies to keep
   equal and a standing source of "the page said fine, the save
   refused".
3. **The Rust rules compiled to run in the browser.** One set and
   instant; a new toolchain and dependencies for a tenth of a second.

Consequence of 1: the page imports no lint from `@ptah-app/model-tools`.
Rules that are pure arithmetic of the page itself (a note is 0–127, a
name is not empty, a size is at least 1) are field validation, not a
second lint.

The same for every approach: merge runs on the server in Rust and
returns a draft; hold-to-play is an engine command beside Flash's; the
page is built from the existing design-system parts.

## 4. The screen

Route `/show` opens the playing show, or the last one opened, or the
first; `/show/<id>` a given show. The shell's strip marks Show as
shipped. The interface says **group** (as the Venue screen and the
files do) and **light** for a member of a group.

### 4.1 Header

- The show's name, editable in place. A name another show has is
  refused on the field (`another show has this name`), compared trimmed
  and without case.
- `playing` beside it when the engine plays this show. Nothing
  otherwise.
- A show menu: the other shows, then New, Duplicate, Delete.
- The show's MIDI channel (1–16, `defaultMidiChannel`): the channel new
  notes and faders get. In the file every note and fader carries its
  own channel, so changing this field asks: `Move the 31 notes and 6
  faders on channel 1 to channel 2?` with `Move them`, `Only new ones`
  and `Cancel`. Nothing moves without that answer. A note or fader on
  `any` channel reads `·any` and is never moved.
- A fault count, drawn only when something is wrong; its place is
  reserved.
- Undo, Redo, Save (accent, disabled with no changes).

### 4.2 Groups (left column)

One entry per group, in the show's order: name, size (`× 4`), what its
lights need in words (`dimmer + colour`, `3 channels`), the number of
rows it carries. A mark in fault or warning colour when a problem
names that group. A last entry adds a group. One group is always
selected when the show has any.

Above the grid, the selected group's own line:
- Name, in place.
- Size. Growing adds lights at the end. Shrinking is refused while a
  note points at a light that would go, with a line naming the rows.
  A size of `any` (the file allows it) is shown as `any` and not
  edited.
- Light names (`Par 1` … `Par 4`), in place in the column heads. With
  none set the heads read `1` … `n`.
- Needs: read-only. They are computed from the rows' outputs (the
  model's `requiredCapabilities`), written on save.
- Menu: Merge with… (§4.5), Delete. Deleting a group that carries rows
  asks first, naming them; the rows and their notes go with it.
- When the draft changes what a venue's patch must provide (a group's
  size or needs, a new group), the check's venue warnings (§5) say so,
  venue by venue, each with a link to that venue's Patch page.

### 4.3 The grid

One row per instance on the selected group, in the show's order; one
column per light.

- **Row head:** the instance's name (by default its program's name),
  and `scene` in dim text for a scene instance. A disabled row is
  dimmed.
- **Cells, one note per light** (`per-member`): each cell holds the
  notes that start the row on that light, as chips. A cell may hold
  none, one or several notes (the file allows several mappings on one
  light). An empty cell is drawn dashed.
- **Cells, one note for all** (`all`) and **one note, spread**
  (`spread`): one wide cell across the lights, with its notes and the
  words `all together` or `spread`.
- **Editing a cell:** click or Enter opens it; type a note number
  (0–127) or a note name (`C3` = 60, the project's convention); Enter
  adds the chip, Backspace on an empty input removes the last chip.
  Arrow keys move between cells. A chip shows the number; the note
  name, and the channel when it differs from the show's, are in the
  readout (below).
- **A note on another channel:** the chip carries `·ch 2`. The cell
  editor has a channel field, blank for the show's channel.
- **The same note in several cells is allowed** (layering is
  deliberate: in the re-authored HILLDALE note 0 starts both `flash`
  and the `strobe arm` scene). It is never an error or a warning,
  across rows or on two lights of one row. Today's lint warns
  `duplicate-trigger` for one note on two lights of a row, because its
  key leaves out the light: the key gains `memberOffset` (Rust and the
  TypeScript model, held equal by the oracles). The same note twice in
  one cell stays a warning.
- **Note ranges** (`midi.noteRange`): drawn as their notes across the
  cells they reach, joined by a line. Editing any of them replaces the
  range by single notes with the same effect.
- **Other triggers** (program change, OSC, pad, key): one dim chip in
  the row head's line naming the kind (`OSC /lights/flash`). Kept, not
  edited.
- **Lights the row may not touch** (`members` is a list): those cells
  are blank and closed. Kept, not edited.
- **Faders column:** the row's bindings in short (`CC 3 → level`), `—`
  with none.
- **Readout:** one fixed line under the grid for the focused or hovered
  chip: note number and name, channel, and everything else that note
  starts in the whole show (`note 0 · C-2 · ch 1 · also starts strobe
  arm on Strobe 1`).
- **Note strip:** under the readout, the 128 notes of the show's
  channel as one fixed strip, a cell lit when anything in the show
  uses that note; the selected group's notes in the accent. Hovering a
  cell fills the readout. It is how a free note is found, and how the
  other groups stay in view while one is open.
- **Add program:** the last row. Picks a program (§4.6), then asks how
  it plays. The new row has no notes; its faders are empty; each
  output drives its natural target.
- Row menu: Details (§4.4), Duplicate onto another group, Move up,
  Move down, Disable or Enable, Delete.

### 4.4 Row details

Opening a row shows its details in a panel that replaces nothing: a
fixed-height area under the note strip, empty when no row is open.

- **Name.**
- **Program** (or scene, read-only for a scene). Changing the program
  keeps the notes; faders of settings the new program lacks are dropped
  and the server's issues say so before Save.
- **Plays:** one note per light, one note for all, one note spread.
  Changing from per-light to another mode is refused while more than
  one light holds notes (the page says which); the other way puts the
  row's notes on the first light.
- **Notes hold:** `while held` (gate), `press on, press off` (toggle),
  `once` (oneshot). **When it stops:** `fade out` (release), `cut`
  (reset), `keep` (hold).
- **Faders:** one line per setting of the program: its name, its range
  and default, and its source: `none` or `CC n` with an optional
  channel. A setting bound to any other kind of source shows that
  source in words, read-only. Several bindings on one setting are
  shown as several lines.
- **Outputs:** one line per output of the program: its kind
  (intensity, colour, strobe, position, beam, channel) and what it
  drives on a light: the natural target, or for an intensity output a
  raw channel number. A group whose positions hold several fixtures
  each (an imported V1 show) adds the part it drives (`part 1 of 3`,
  or `every part`). A route the page cannot express in those terms is
  shown as `custom` and kept as read.

Not edited, kept: merge mode and priority, `velocityTo`,
`heldVoiceCapBeats`, a binding's curve and invert.

### 4.5 Merge groups

For shows that came from V1: one group per program and kind of light.

- From a group's menu, `Merge with…` lists the groups of the **same
  shape**: the same size and the same number of parts per light.
  Others are listed dim with the reason (`3 lights, this one has 4`).
  The parts of a group are read from its rows' outputs: the highest
  part any route names (`tupleIndex` + 1), or 1 when none does. The
  Outputs panel (§4.4) uses the same number.
- The server builds the merged show and the page takes it as its draft
  (one undo step): the chosen groups become one, named by the owner in
  the dialog; every row moves to it with its notes, faders and outputs
  as they were; light names come from the first group that has them.
- Nothing audible changes: position `k` of each merged group becomes
  position `k` of the result.
- **Patches carry over.** The merged group keeps the id of the group
  the merge was started from, so that group's assignment in every
  venue's patch stays valid as it is. Saving the show removes, in every
  venue, the assignments of groups the show no longer has (§6). No
  proposing again is needed: the matcher would not reproduce a V1
  import's hand-made assignment, and several fixtures in one slot are
  not editable on the Patch page.
- Before the merge is accepted the dialog says, per venue, whether the
  merged groups were patched onto the same fixtures in the same order.
  Where they were not, it names the venue and says whose assignment
  wins (the group the merge was started from); the lights of the
  others' rows would move there, so that is a warning in fault colour.
- This does not turn V1's raw channels into real fixtures. HILLDALE
  (collapsed) after merging is three groups: the four pars and the
  three strobes, whose lights are still made of three one-channel
  fixtures each, and `red @ note 21`, which drives four single
  channels and so has another shape. Becoming portable is three further steps
  by hand, all possible with shipped screens and this one: replace the
  raw fixtures by real types on the Venue screen, set each row's
  outputs here, propose the patch again.

### 4.6 Programs of a show

A show carries its own program files. `Add program` lists:
- this show's programs;
- then every program of the other shows, by show. Choosing one copies
  that file into this show (same program id; if this show already has
  that id, it is the same program and nothing is copied).

A program no row uses stays in the show. Removing program files is the
Builder's business.

### 4.7 Hold to play

- Holding a chip (pointer down, or Space on a focused chip) plays that
  row on that light on the real rig for as long as it is held, at full
  velocity. A wide cell plays the row as its note would.
- Holding always behaves as `while held` and `cut`, whatever the row
  says: a `press on, press off`, `once` or `keep` row also plays while
  held and is cut on release, so nothing can stay on. The readout says
  so for such a row (`plays while held here; the row keeps its value
  on a real note`).
- The row's faders stay at whatever the engine holds for them (their
  last CC value or their default). The details panel does not move
  them in this version.
- Enabled only when all hold: the engine plays this show, the page has
  no unsaved changes, the clock is not running. Otherwise the gesture
  does nothing and the readout gives the reason (`load this show
  first`, `save first`, `Reaper is running`).
- Nothing stays on: release, leaving the page, a lost connection or a
  closed tab all end it (§6).

### 4.8 Shows: new, duplicate, delete

- **New:** asks a name. An empty show on channel 1 with no groups.
- **Duplicate:** a copy under a new show id named `<name> copy` (then
  `copy 2`, …), with its program files. Group ids are kept, and every
  venue's patch of the original is copied for the new show, so the
  copy plays where the original did.
- **Delete:** asks, naming the venue patches that go with it. Refused
  for the playing show and for `settings.currentShowId`. A venue's
  patches are a numbered list, so removing one renumbers those after
  it: the server corrects `settings.currentPatchIndex` in the same
  write, and Delete is refused (`stop the show first`) while the
  engine plays a patch whose number would change.
- Duplicate and Delete write venue files. For the venue in use the
  Venue page then reports the file as changed since it was loaded
  until the next reload (the known rig-revision item); accepted here.
- Existing shows that already share a name stay as they are; the menu
  and the Perform picker add the number of groups and rows to tell
  them apart (`HILLDALE · 7 groups, 7 rows`) only when names collide.

### 4.9 Phone

Below the editing width: the show's name, then each group with its
rows as text (`flash: Par 1 = 1, Par 2 = 3, …`), read-only, and one
line saying editing needs a wider screen. No hold-to-play on the phone
in this version.

### 4.10 Rules that apply everywhere

Tokens only; nothing shifts; calm when well and loud only when wrong;
every action reachable from the keyboard and in the command palette
(New show, Duplicate show, Add group, Add program, Merge groups, Save,
Go to group…). The screen scrolls inside the shell's page area, never
the window.

## 5. Editing model

As the Venue screen, with the check moved to the server.

- Opening a show reads `show.json` and the show's program files (names,
  parameters, outputs). Edits build a draft in the page; undo and redo
  walk its steps. Save writes the whole draft; what the screen does not
  edit rides along untouched.
- New ids (show, group, instance, mapping) are UUIDs made in the
  browser.
- **Check:** 150 ms after the last edit the page posts the draft to the
  check route (§6) and shows the answer: the count in the header, marks
  on groups, rows and cells where an issue's path names them, the text
  in the readout on focus and in a list opened from the count. An
  answer for an older draft is dropped. While a check is pending the
  previous answer stays; if the server cannot be reached the count's
  place says `not checked` in warning colour.
- The check also answers what the draft would do on each venue that
  has a patch of this show: the health of draft, venue and patch
  together, and whether the show would still build there. These are
  shown as warnings named by venue (`Hilldale rig: pars needs 4
  lights, the patch has 3`), with the playing venue first. They never
  block a save: the cure is on the Venue screen.
- **Save** sends the draft with the revision it was read at. Errors
  refuse the save and are shown as above; warnings do not block. On
  success the server's issues replace the page's.
- Group `requires` are recomputed by the server on save (the page does
  not write them).
- **The playing show.** After a successful save the page reloads it on
  the same venue and patch (the Reload path, which keeps the clock).
  If the clock is running, Save first asks `Apply to the running
  show?`. If the engine refuses the reload (most likely: the patch no
  longer fits the groups), the file stays saved, the old show keeps
  playing, and the page says so in fault colour with the engine's
  reason and a link to that venue's Patch page.
- Leaving the page, switching show or closing the tab with unsaved
  changes asks first.
- If the file changed on disk since it was read, Save is refused and
  the page offers to reload it or overwrite.
- Copying a program into the show (§4.6) is written at once, before
  Save, because the show's lint reads program files from disk. It is
  not undone by Undo; an unused program file is harmless.

## 6. Server and engine changes

API (under `/api/v1`):
- `GET /shows/{id}` gains the `ETag` revision; `PUT /shows/{id}` takes
  `If-Match` and answers `{ path, issues, revision }`, 409 when the
  file moved on: exactly as the venue routes. It recomputes each
  group's `requires` before writing. It refuses (422) a name another
  show has only when the save creates the show or changes its name: a
  show that already shares a name on disk still saves. In the same
  write, under the lock, it removes from every venue's patches of this
  show the assignments of groups the show no longer has.
- `POST /shows/{id}/check`: the draft as body → `{ issues, venues }`.
  `issues`: validating and linting it as the `PUT` would, against the
  program files on disk. `venues`: per venue with a patch of this
  show, the `health` issues of the draft on that venue and patch, plus
  an issue when the show would not compile there (what a load would
  refuse). Nothing written. Works for an id not on disk yet.
- `POST /shows/{id}/merge-groups` with `{ show, groupIds, name }`
  (`show` the page's draft, `groupIds[0]` the group whose id and
  patch assignment are kept): → `{ show, venues }`, the merged draft
  and, per venue with a patch of this show, whether the merged groups
  were patched alike. Nothing written. 422 when the groups differ in
  shape.
- `POST /shows/{id}/duplicate` with `{ name }`: writes the copy, its
  programs and the copied patches under the write lock; answers the
  new id.
- `DELETE /shows/{id}`: removes the show directory and its patches in
  every venue; 409 for the playing show or `settings.currentShowId`.
- `GET /shows` gains, per show, `groups` and `instances` counts (for
  §4.8's telling apart) and the page gets every program's name per
  show from a new `GET /programs` (`[{ showId, id, name }]`).
- `POST /shows/{id}/programs/{pid}/copy-from` with `{ showId }`: copies
  the file when this show lacks it.
- Show writes join the write lock the venue and type writes hold.

Engine:
- A new command, `audition`, beside `identify`: an instance index, an
  optional member, on or off, and the show epoch. On: a trigger start
  for that instance and member at velocity 1, with no MIDI key. It
  holds for 2 s unless repeated (the page repeats every 500 ms while
  held), so nothing stays on. One at a time: a new `on` ends the
  previous. Off, the hold running out, the clock starting to run, and
  a show swap each end it with a trigger stop.
- Refused, in order: `stale epoch`, `no show`, `unknown instance`,
  `member out of range`, `clock running` (the flag Flash uses).
- Its voice always runs as a gate and ends by a reset, whatever the
  instance's trigger mode and `onStop` are (§4.7).
- Its voice merges and renders as a note's would, but it is kept out
  of the journal and of the recorder's show state, so a restart or a
  resume never brings an auditioned voice back. How the voice is
  marked is the builder's, within the render thread's no-allocation
  rule.
- The page finds the instance index from `GET /show-info`
  (`instanceIds`) and passes `showEpoch`.

## 7. Where the code goes

- `packages/ds/src/show/`: the screen's parts (header, group list,
  grid, note strip, details panel, dialogs, phone view) and the draft
  model as pure functions with unit tests; stories for each state.
  A note chip and the 128-note strip are primitives if the existing
  `NoteChip` does not already serve.
- `apps/web/src/show/`: the route, the API calls, the debounced check,
  save and apply, hold-to-play's repeat, the live state (`playing`,
  clock running).
- `crates/ptah-model`: the merge (a pure function with its tests) and
  the show duplicate's patch copy. `crates/ptah-server`: the routes.
  `crates/ptah-engine`: `audition`. Docs (`api.md`, `app.md`,
  `engine.md`) updated.

The grid is a stateful page: the plan carries a state table for it
(cell states, row modes, check states, hold-to-play's guards) and
keeps its tasks small, per the owner's conventions.

No new outside dependency is expected. If one is needed it follows the
standing rule (older than 14 days, pinned exactly) and is raised with
the owner first.

## 8. Testing and exit

- Unit: the draft model (every edit, undo and redo; the untouched-part
  round trip over the four fixture shows; resize refusals; mode
  changes; range splitting keeps what each note starts).
- Rust: merge (HILLDALE collapsed merges to three groups and, on its
  venue with the patch carried over, renders the same frames for the
  replay oracle's MIDI as before the merge; shape refusals; patches
  reported alike or not; the save's removal of orphan assignments);
  the lint key with `memberOffset`; the check's venue part; the
  routes (revision conflict, check equals the `PUT`'s issues, unique
  names, duplicate copies programs and patches, delete refusals);
  `audition` (refusals in order, expiry, release when the clock starts
  and on a swap, one at a time, the zero-allocation guard).
- Design system: stories under the visual, no-shift and tap gates. A
  layout change that touches shared parts runs the full visual gate.
- End to end against the real binary: move a note to another light,
  save, and the captured DMX for that note moves without a restart;
  merge two groups, save, and the frames for a fixed MIDI are
  unchanged with no patch work; hold a chip and its light's channels
  move, then return on release and by themselves when the page is
  closed.

Exit, checked by the owner on the rig:
1. Open HILLDALE, merge its groups into three (pars, strobes, red),
   save: the show plays as before, with nothing to do on the Venue
   screen.
2. Move a note to another light, Save while Reaper is stopped: the
   light follows, no restart.
3. Hold a chip: that program plays on that light; release: it stops.
   Start Reaper: holding is refused and says why.
4. Make a new show, add a group and a program copied from HILLDALE,
   give it notes, patch it on the venue, load it in Perform: it plays.
5. Change one note in the owner's show and save: a diff of the file
   shows only that mapping (and `requires` only if they changed).
6. Give two shows the same name: refused. The picker never shows two
   rows a person cannot tell apart.

## 9. Left to the builder

- The wire forms of `audition`, the check, merge, duplicate and copy
  routes, and whether `GET /programs` is its own route or part of
  `GET /shows`.
- The debounce length around 150 ms, and how an issue's path maps to a
  group, row or cell.
- How a note range is drawn across cells, and how several chips share
  a narrow cell (wrap inside a fixed row height, or `+2`).
- The editing width below which the phone view shows.
- Exact wording of lines and tooltips, within "calm when well".
- The order of work, as long as the grid is usable before merge and
  hold-to-play, which can be built in parallel with it.

## 10. Calls made by the author (not the owner's decisions)

- The interface says "group" (as Venue and the files), not "role".
- A group's needs are computed from its rows' outputs, not typed in.
- The row details include Outputs (what each program output drives):
  without it an imported show can never be made portable.
- Merge is exact and only for groups of the same shape; it does not
  convert V1's raw channels into real fixtures (§4.5). The merged
  group keeps one group's id so patches carry over, and a show save
  cleans the venues' patches of groups that are gone.
- The same note in several cells is allowed and never flagged; the
  lint's duplicate key gains the light.
- Changing the show's channel asks before moving existing notes.
- A name clash is refused only when a show is created or renamed.
- The check also reports, per patched venue, what the draft would
  break there, as warnings.
- Holding always plays as a gate and cuts on release; its voice is
  kept out of the journal.
- Delete is refused while it would renumber the playing patch.
- A note strip of 128 cells under the grid.
- Hold-to-play uses a new `audition` command with a 2 s expiry rather
  than the existing `trigger` command, which has no expiry and no
  clock guard; it needs the show saved and loaded; velocity is full;
  no fader control; not on the phone.
- Duplicate copies the venue patches; Delete removes them; Delete is
  refused for the playing show.
- Unique names are enforced on save only; shows that already collide
  are told apart by counts, not renamed.
- Copying a program into a show is written at once and not undone.
- Explicit Save with undo and redo, the conflict check, the phone view
  read-only: as on the Venue screen.
