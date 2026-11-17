# PTAH V2 — Builder screen (design)

- **Date:** 2026-11-17
- **Status:** approved by the owner 2026-11-17, builder-checked (the scope split, layout B,
  React Flow 12.12.0, the Rust evaluator in the browser with a trial
  first, the server-side swap for "on the rig": chosen by the owner in
  conversation)
- **Repo:** `~/projects/ptah-v2` (V1 is never modified)
- **Step:** 3, fifth screen (after Perform, Venue, Library, Show). Master
  plan §4.4; Step 0 design §3.5; `docs/vm-instruction-set.md`.
- **Mockups:** `~/projects/ptah/.superpowers/brainstorm/87347-1794908309/content/builder-layouts.html`
- **Builds on:** the Show design (`2026-11-17-v2-show-screen-design.md`):
  the draft model, the server check, save and apply, the `audition`
  command; the fixture-types design for the in-use save guard.

## 1. Intent

A program (`flash`, `sine`, `distorded`) is a small graph of nodes that
turns time, velocity and faders into light. Today only V1's builder can
make or change one. The Builder is where that happens in V2, and it is
the last large screen before V1 can be uninstalled.

The owner has no particular pain with V1's builder. What he asked for:
more useful nodes, tooling that makes building easier, and a better
preview: V1's is useful, and being able to send the program to real DMX
while editing would make it much better.

One rule came out of the conversation and binds the whole design: **what
the preview shows is what the lights will do.** The preview therefore
runs the engine's own evaluator, not a second implementation of it.

## 2. Goals, non-goals, anti-goals

Goals
- Programs: list, create, duplicate, rename, delete, copy to another
  show.
- Edit a program as a graph on a wide canvas: add, wire, move, delete
  nodes; every node type the file format has; typed ports.
- Add a node by typing on the canvas.
- Undo and redo; copy, paste and duplicate, also between programs;
  multi-select; tidy layout; notes on the canvas.
- A live curve on every node, a strip of preview lights, and a test
  panel (note, velocity, one fader per setting, tempo, loop): all in
  the browser, with no rig and no show loaded.
- "On the rig": play the program being edited, unsaved, on the real
  rig, and show the real DMX values beside it.
- A save that would break a show says so first (which rows, which
  faders, which outputs).
- Problems are shown while editing, and what the page shows is what the
  engine will say at load.

Non-goals (later plans)
- A program inside another as an editable block (`subgraph` nodes are
  shown and kept, not created or opened).
- Starter templates; a "simplify" helper that rewrites V1 math chains;
  AI generation (Step 6).
- Scenes. Signal probes on a running show (Step 4 debug mode).
- Editing on a phone: the phone shows the program list and a read-only
  picture of the graph.
- Retiring the TypeScript reference evaluator used by the test oracles.

Anti-goals (a failure even if it works)
- The preview showing one thing and the lights doing another.
- Losing data: a node the page does not know (`unknown`, `subgraph`,
  `z1`), a field it does not edit, an edge to them, all come back from
  a save exactly as read. Node positions are never changed except by a
  move or by Tidy.
- A save that silently breaks a show: a removed setting whose fader a
  row binds, a removed output a row routes.
- "On the rig" firing during a song, a light left on after it, or the
  draft staying loaded after the page is left.
- An edit reaching a saved program without Save.
- Layout that shifts while editing (the dock, the header, the
  inspector).

## 3. Approaches

**The canvas.** React Flow (`@xyflow/react`), pinned at exactly
**12.12.0** (published 2026-09-24; version 13 came out on 2026-11-16 and
is too young for the 14-day rule). Chosen by the owner. V1's builder
uses the same library, so pan, zoom, wiring and selection behave as he
knows them. Styled with the design system's tokens. Rejected: an own
canvas (weeks of pan, zoom, routing and hit-testing for a worse start).

**The evaluator behind the preview.**
1. **The Rust evaluator in the browser, as WebAssembly.** Chosen by the
   owner, with a trial first. One engine: `ptah-vm` and `ptah-model`
   compiled for the browser; curves answer at once; no rig needed. Cost:
   a new build step (the `wasm32-unknown-unknown` target and a small
   loader), unproven in this repo.
2. **The server runs the Rust evaluator and streams node values.** The
   fallback if the trial fails. One engine; curves at about 30 per
   second with a small delay.
3. **The TypeScript reference evaluator.** Rejected by the owner: two
   engines in two languages. It has already drifted (two rules, the
   stopped-scene fade and the oneshot end, exist only in Rust).

**The trial** is the plan's first task and is done in one day: compile
the core for the browser with no new library (plain exported functions
and a hand-written loader), run the fixture `sine` program in a page
**through the voice layer** (a compiled show stepping a held note, §6),
and compare the frames with the same run natively. The plan states what
counts as failure (does not build without a new dependency, or frames
differ, or the module is too large to ship embedded, a size the plan
fixes).

What the trial already knows (checked against the code): the toolchain
gains the `wasm32-unknown-unknown` target (in `rust-toolchain.toml` and
CI; a target, not a dependency); and `ptah-model` today pulls
`jsonschema`, whose hashing needs a random source that does not build
for that target. The browser build therefore leaves schema validation,
the file store, the importers and the tree loader out behind a cargo
feature. The browser core checks with the lint; schema validation
stays the server's, at Save. Edits are typed and bounded by the
catalogue's ranges, so a schema refusal at Save means a page defect. On failure the plan switches to road
2 and the rest of this design holds unchanged: §6 describes the core's
three services, not the road.

**"On the rig" with an unsaved program.**
1. **The server swaps the draft in.** Chosen by the owner. The server
   builds the loaded show with the draft in place of the saved program
   and gives it to the engine as a reload (the existing path, which
   keeps the clock and compiles off the render thread).
2. Save first, then play. Rejected: every experiment would be a save
   into the real show.

## 4. The screen

Routes: `/builder` is the program list; `/builder/<showId>/<programId>`
a program. The shell's strip marks Builder as shipped.

### 4.1 Program list

Programs live inside their show, so the list is grouped by show (the
playing show first). Per program: name, the number of nodes, its
settings by name, where it is used (`3 rows`), and a small still
picture of its output curve. Actions: open, Duplicate (in the same
show), Copy to… (another show), Delete (refused while a row uses it,
naming the rows), and per show `New program`.

A new program starts with one `time` node wired to nothing and one
`out · dimmer` node.

### 4.2 Header (program page)

`← Programs`; the program's name, editable in place (a name another
program of that show has is refused); the show's name; `used by <n>
rows` in dim text (nothing when unused); a fault count drawn only when
something is wrong, its place reserved; Undo, Redo, Tidy, Save (accent,
disabled with no changes).

### 4.3 Canvas

The graph takes the full width between the header and the dock.

- **Nodes** are boxes: a title, the node's own fields when it has few
  (a constant's value), one input handle per input port on the left and
  one output handle per output port on the right, named when the node
  has several, and a **live curve** of its output along the bottom
  (§4.6). A colour output draws a colour band instead of a curve.
- **Wires** connect an output handle to an input handle. A wire can
  only be dropped where the port types agree (number, colour, bool; a
  number may feed a bool, as the format allows); while dragging, the
  handles that would accept it are marked and the others dimmed. One
  wire per input; dropping on a taken input replaces its wire (one undo
  step). A wire that would close a loop is refused with a line saying
  so.
- **Unwired inputs** show the value they take (the node's own field or
  its default), so a node reads without opening it.
- **Add by typing:** with the canvas focused, typing opens a small box
  at the pointer (or at the centre from the keyboard); it filters the
  node list by name and by words (`sine` finds `lfo`); Enter adds the
  first match there; Escape closes. A menu button in the header opens
  the same list for the mouse. Dropping a wire on empty canvas opens it
  filtered to nodes that accept that wire, and wires the new node.
- **Inspector:** selecting one node shows its fields in a panel that
  floats at the canvas's top right corner, always the same place and
  size: numbers, choices (an `lfo`'s shape and rate unit), the setting
  a `setting` node reads. Selecting several shows the count and the
  actions that apply to all.
- **Selection and clipboard:** click, Shift-click, drag a box; Delete
  removes; Cmd/Ctrl-C, X, V, D copy, cut, paste and duplicate with the
  wires between the copied nodes; paste works across programs and
  browser tabs of the app (the clipboard holds the nodes as JSON).
  Settings read by pasted `setting` nodes are created in the target
  program when it has none of that name.
- **Notes:** a note is a text box on the canvas, added from the same
  list (`note`), moved and deleted like a node; it has no ports and no
  effect.
- **Tidy** lays the graph out left to right by depth, one undo step.
- **Output nodes** carry their slot number; adding an output takes the
  next free slot of its kind.
- **Nodes the page does not edit** (`unknown` from an import,
  `subgraph`, `z1`): drawn with their type name and ports, movable,
  wirable where their ports are known, deletable; their own fields are
  shown as text and kept.
- Pan with the trackpad or by dragging the background; zoom with pinch
  or Cmd/Ctrl-scroll; `Fit` in the corner.

### 4.4 Settings of a program

The program's settings (the file's `parameters`: what a show row's
fader drives) are listed in the dock's Test section and edited there:
add, rename, range, default, unit, delete. Deleting a setting a
`setting` node reads is refused, naming the nodes.

### 4.5 The dock

One fixed-height band under the canvas, three sections.

**Test.** `Hold` (a button to hold, and the space bar when the canvas
has focus): the note is down while held; `Loop` replays a note of a
chosen length (in beats) over and over; velocity (0–127); one slider
per setting, from its range, starting at its default; tempo (beats per
minute). These drive the preview, and the rig when "On the rig" is on
(Loop included: the page sends the notes).

`Plays like`: how the note behaves, since that is a row's choice and
not the program's: `while held` / `press on, press off` / `once`, and
on stop `fade out` / `cut` / `keep` (the Show screen's words). It
starts as `while held`, `fade out`, or as the row's own choices when
the program was opened from a row or "On the rig" names one.

**Preview.** A row of preview lights (4 by default, 1 to 8), each
showing what one light of a group would do: brightness and colour, a
strobe drawn as blinking, position and beam as small readouts. A
selector says how the program would play on them: `all together`,
`one note per light` (the held note plays the light clicked), `spread`.
With no colour output a light is white at the dimmer's level.

**On the rig.** A switch, and beside it the row it will play: the
loaded show's rows that use this program (a chooser when several).
Under it, the DMX values of the fixtures that row drives, live from
the engine. See §4.7.

### 4.6 Live curves

Each node's curve is the value at its output over the last few seconds
of the preview clock, as the test panel drives it: hold a note and the
envelope rises; move a fader and the curves downstream move at once.
With nothing held, curves show the idle output. The evaluator runs in
the browser (§6); nothing is sent to the server or the engine for it.

A program that does not compile (a loop, a wire of the wrong type)
has no curves at all: every node shows `—`, and the issue is marked on
the node or wire that causes it. The page refuses to draw a loop in
the first place, so this is the state of an imported or hand-edited
file. A `subgraph` node shows its first output. Compiling a program
that uses `subgraph` needs the show's other programs: the page gives
them to the core.

### 4.7 On the rig

- Turning the switch on loads the show with the draft in place of the
  saved program; from then on each edit refreshes it shortly after
  (300 ms after the last edit). `Hold`, velocity and the sliders then
  act on the real rig through the chosen row, with the row's real
  velocity, release and stop behaviour: the page sends the engine's
  `trigger` and `setParam` commands (not `audition`, which always
  plays at full velocity and cuts on release).
- Each refresh is a show swap: it ends the notes and puts the settings
  back to their defaults. The page therefore sends the sliders' values
  again after every swap, and the held note again if it is still held
  (its envelope starts over). A slider overrides the row's physical
  fader until that fader moves again.
- A draft that drops a setting a row's fader binds, or an output a row
  routes, would make the show refuse to load. For the preview the
  server leaves those faders and routes out, in memory only, and the
  line under the switch says which (`previewing without: CC 3 →
  speed`).
- A note left down is safe: whatever ends the preview (below) reloads
  the saved show, which ends every note.
- Available only when all hold: the engine plays the show this program
  belongs to, a row of it uses the program, the clock is not running,
  and the draft has no error. Otherwise the switch is off and disabled
  and a line gives the reason (`load <show> first`, `no row uses this
  program`, `Reaper is running`, `fix the errors first`).
- It turns itself off, and the saved show is loaded back, when the
  switch is turned off, the page is left, the tab is closed or hidden
  for more than a few seconds, the connection is lost, the clock starts
  running, or another show is loaded. Nothing of the draft is written
  to disk by it.
- While it is on, the header says `on the rig` beside the program's
  name, and Perform shows the show as `previewing` (wording in the
  plan), so nobody mistakes the rig's state for the saved show.
- The values shown are the engine's own frames, not a prediction.

### 4.8 Saving and its guard

- Save writes the program file. Before it does, the page asks the
  server what the save would do to the show (§6). When a row's fader
  binds a setting the draft no longer has, or a row routes an output
  slot the draft no longer has, a dialog lists them (`flash (pars):
  the fader CC 3 loses its setting "speed"`) with `Save anyway` and
  `Cancel`. `Save anyway` saves the program and removes exactly the
  listed bindings and routes from the show, in one server operation.
- When the show is playing, a successful save reloads it (the Reload
  path), after `Apply to the running show?` when the clock runs, as
  the Show screen does.
- Conflict (`This program changed on disk`, `Reload` / `Overwrite`),
  the leave prompt with unsaved changes, and explicit Save with undo:
  as on the Show screen.

### 4.9 Phone

Below the editing width: the program list, and for a program its name,
settings and a read-only picture of the graph that pans and zooms. One
line says editing needs a wider screen.

### 4.10 Rules that apply everywhere

Tokens only; nothing shifts; calm when well and loud only when wrong;
every action reachable from the keyboard and in the command palette
(New program, Add node, Tidy, Save, Hold, On the rig). The canvas is
keyboard-operable: Tab moves between nodes, arrows move the selected
node, Enter opens its inspector, a wire can be started and ended from
the keyboard. The screen scrolls inside the shell's page area, never
the window.

## 5. Editing model

As the Show screen: opening a program reads its file with a revision;
edits build a draft in the page; undo and redo walk its steps (a drag
is one step, typing in a field is one step per commit); Save writes
the whole draft; what the page does not edit rides along untouched.
New ids are UUIDs made in the browser.

The file's `outputs` list is derived from the output nodes on save (by
the server), as a group's needs are on the Show screen.

**Checking** runs on the core (§6) after each edit, at once: the lint's
issues are placed on the node or wire their path names, counted in the
header, listed from the count. Save is the server's verdict and its
issues replace the page's.

## 6. The Rust core in the browser, and the server

**The core** is `ptah-model` and `ptah-vm` built for the browser. It
provides three services to the page, and nothing else:
- **the node catalogue:** every node type, its fields with their
  ranges and defaults, and its ports with their types. The node list,
  the inspector and the wiring rule are drawn from it; the page holds
  no table of its own. Ports exist in Rust today; field ranges exist
  only in `schemas/program.schema.json`: the catalogue's ranges are
  held equal to the schema by a test;
- **the check of a draft program:** the program lint the engine runs
  at load, and the derivation of the file's `outputs` list from the
  output nodes, which the page applies to its draft after each edit so
  the lint never sees a stale list;
- **evaluation through the voice layer:** the core builds a small
  preview show (one group of the chosen number of lights of a built-in
  preview fixture that has every capability, one row running the draft
  with the `Plays like` choices) and steps the engine's own compiled
  show: notes down and up, velocity, setting values through the
  engine's own smoothing, tempo. So slew, velocity routing, the
  oneshot end, stop fades and the spread across lights are the
  engine's, not imitations. It returns every node's output for the
  step and the attribute values per preview light.

Per-node outputs need one addition to `ptah-vm`: the compiler keeps
its node-to-slot table in the compiled program (it is internal today),
so a node's value can be read from the voice's slots. Nothing on the
render path changes; the no-allocation guard stays as it is.

The module is built by the repository's build, embedded in the binary
with the web app, and loaded once by the Builder page only. If the
trial fails (§3), the same three services are served by the server
(the catalogue and the check as requests, evaluation as a stream), and
the page does not otherwise change.

**Server API** (under `/api/v1`):
- `GET /shows/{id}/programs/{pid}` gains the `ETag` revision; `PUT`
  takes `If-Match`, derives `outputs` (today a stale list is a lint
  error and the save is refused), and answers `{ path, issues,
  revision }`; 409 when the file moved on. A name another program of
  the show has is refused when creating or renaming.
- `POST /shows/{id}/programs/{pid}/impact`: the draft as body → what
  saving it would do to the show: the rows that use the program, and
  per row everything the show's lint would then refuse: the bindings
  whose setting the draft lacks, a `velocityTo` naming such a setting,
  the routes whose output slot the draft lacks, and the routes whose
  target no longer fits because an output changed kind on its slot.
  Nothing written.
- `PUT …?prune=1` (form left to the builder): the save that also
  removes exactly those bindings, `velocityTo` and routes from
  `show.json`, under the write lock, both files or neither.
- `DELETE /shows/{id}/programs/{pid}`: 409 while a row uses it, naming
  the rows. `POST …/duplicate`. `copy-from` exists.
- `GET /programs` gains, per program, its node count, setting names
  and use count.

**Engine and loader:**
- A preview load: a load of the playing show, on the same venue and
  patch, with one program's content given by the server instead of
  read from disk. It is a show swap like any reload (compiled off the
  render thread, the clock kept). Refused while the clock runs and
  when no show plays. The show info says a preview is loaded, and
  which program, so every page can tell.
- The server ends a preview by an ordinary reload from disk: when the
  page asks, when the page's connection drops or it stops renewing the
  preview (a lease, renewed every few seconds), when the clock starts
  running, and before any other load. A restart never comes back with
  a preview loaded: the journal records the saved show.
- The loader gains a request that carries the substituted program (a
  load reads everything from disk today) and the in-memory pruning of
  §4.7; the show info gains the preview marker.
- Notes and settings from the page use the existing `trigger` and
  `setParam` commands with the swap's new epoch; setting indexes are
  read again from the show info after each swap, since adding or
  removing a setting moves them.

## 7. Where the code goes

- `crates/ptah-web` (new, name left to the builder): the browser build
  of the core and its exported functions. `scripts/` and the build:
  the wasm step, and embedding the module.
- `packages/ds/src/builder/`: the screen's parts (list, header, canvas
  node and wire renderers, add box, inspector, dock, dialogs, phone
  view) and the draft model as pure functions with unit tests; stories
  for each state. `packages/ds` gains the dependency `@xyflow/react`
  `12.12.0` (exact).
- `apps/web/src/builder/`: the routes, loading the core, API calls,
  the preview clock, "on the rig" and its lease, save and its guard.
- `crates/ptah-server`: the routes; `crates/ptah-engine`: the preview
  load. Docs updated (`api.md`, `app.md`, `engine.md`,
  `rust-workspace.md`).

The page is stateful: the plan carries state tables for the canvas
(wire drag, add box, selection), for "on the rig" (every way it turns
off) and for save, and keeps their tasks small, per the owner's
conventions.

## 8. Testing and exit

- **The preview equals the engine:** the browser core is run in the
  test suite against the same golden traces the Rust evaluator is
  tested with, for every fixture program, and a test fails if the
  module embedded in the app was built from other sources than the
  engine's.
- Unit: the draft model (every edit, undo and redo, clipboard,
  tidy, the untouched-part round trip over every fixture program,
  including ones with `unknown` nodes).
- Rust: the impact and the pruning save (both files or neither), the
  preview load (refusals, the lease running out, the clock starting,
  another load, a restart coming back saved), the no-allocation guard
  untouched.
- Design system: stories under the visual, no-shift and tap gates; the
  canvas's wire drag and add box as play tests.
- End to end against the real binary: build a two-node program, save,
  add it to a row, and the captured DMX follows it; turn "On the rig"
  on, change a constant, and the DMX changes without a save; close the
  page, and the DMX returns to the saved program; a save that removes
  a bound setting shows the dialog, and `Save anyway` leaves a show
  that loads.

Exit, checked by the owner on the rig:
1. Open `sine`, replace its math chain by one `lfo`, watch the curves
   agree, Save: the lights do what the preview showed.
2. Build a new program with an envelope and a colour output, by typing
   to add nodes; add it to a row on the Show screen; it plays.
3. Turn "On the rig" on, hold the note, move a fader: the lights
   follow at once. Start Reaper: it turns off by itself and says why.
4. Close the tab while "On the rig" is on: within a few seconds the
   rig is back on the saved show.
5. Delete a setting that a row's fader uses, Save: the dialog names
   the row; `Save anyway`; the show still loads.
6. Open the owner's `flash`, move one node, save: a diff of the file
   shows only that node's position.

## 9. Left to the builder

- The crate's name, the exported functions' form, the loader, and the
  size limit that fails the trial.
- The wire forms of the impact, the pruning save, the preview load and
  its lease; the lease length.
- How long a curve's window is, the preview clock's step, and how
  curves are drawn cheaply for a few dozen nodes.
- The tidy algorithm; how the still picture in the list is made.
- The editing width below which the phone view shows.
- Exact wording of lines and tooltips, within "calm when well".
- The order of work, as long as the trial comes first and the canvas
  with its preview is usable before "on the rig".

## 10. Calls made by the author (not the owner's decisions)

- The node catalogue, the lint and the evaluation all come from the
  Rust core; the page keeps no node table of its own.
- Notes on the canvas need a small addition to the program file
  (an optional `notes` list); older files stay valid.
- Programs stay per show (the file layout's rule); "Copy to…" is how a
  program reaches another show.
- `subgraph`, `z1` and `unknown` nodes are kept and shown, not edited.
- "On the rig" plays through a row of the loaded show that uses the
  program (so the real fixtures, routing and patch apply), ends by a
  lease, and marks the show as previewing everywhere.
- `Save anyway` prunes the broken faders and routes from the show in
  the same operation, so a saved program never leaves a show that
  fails to load.
- Preview lights: 4 by default, up to 8.
- The preview steps the engine's whole voice layer on a small built-in
  preview rig, not only the graph; `Plays like` is in the test panel
  because trigger mode and stop behaviour belong to a row.
- The browser build leaves schema validation out (it does not build
  for the browser without a new dependency); the lint runs in the
  browser and the schema at Save.
- "On the rig" uses the real `trigger` and `setParam` commands, resent
  after each refresh; a held note restarts when the draft refreshes; a
  slider overrides the physical fader until it moves.
- A draft that would break the show is previewed with the broken
  faders and routes left out, in memory, and says so.
- The save guard also covers `velocityTo` and outputs that changed
  kind.
- The toolchain gains the `wasm32-unknown-unknown` target.
- One wire per input; dropping on a taken input replaces the wire.
- The phone shows a read-only picture.
