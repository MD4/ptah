# PTAH V2 — Venue screen (design)

- **Date:** 2026-11-16
- **Status:** approved by the owner 2026-11-16 (layout C with B's block map,
  approach 3, Flash in scope, outputs reopened on reload: all chosen in
  conversation), builder-checked
- **Repo:** `~/projects/ptah-v2` (V1 is never modified)
- **Step:** 3, second screen (after Perform). Master plan §4.2, §4.3, §4.4.
- **Mockups:** `~/projects/ptah/.superpowers/brainstorm/43592-1794825864/content/venue-layouts.html`
- **Builds on:** the 3A design (`2026-11-11-v2-step3a-app-shell-perform-design.md`):
  the shell, the embedded app, the API client, the Reload path.

## 1. Intent

Today the band plays every show on the same rig, and the venue file is
edited by hand or in V1. The Venue screen is where the concrete rig is
edited in V2: universes and where their DMX goes, fixtures and their
addresses, and the patch that lands a show's groups on those fixtures.

The owner's final objective is larger: map the show onto any venue's rig
and configuration, with AI help when needed. This version serves the
owner's own rig fully, and must not assume there is only one rig. A venue
can be prepared at home, away from the rig, so that the one job left on
the day is checking addresses.

It is also one of the screens that must exist before V1 can be
uninstalled (Step 3's exit).

## 2. Goals, non-goals, anti-goals

Goals
- Edit a venue end to end from the app: universes and outputs, fixtures
  (name, type, mode, universe, address), patches.
- Several venues: create, duplicate, rename, delete.
- See the universe at a glance: what is where, what is free, what
  overlaps.
- A patch is always a proposal that is reviewed, corrected by hand if
  needed, and accepted on one page, whatever produced the proposal.
- A saved edit to the venue in use reaches the lights without a restart:
  fixtures, and also universes and outputs (owner decision: the engine
  reopens outputs on reload).
- Flash: hold a fixture's button and that light, and only it, goes to
  full on the real rig. From the laptop and from a phone.
- Everything works with no rig connected (preparing a venue at home).

Non-goals
- Adding fixture types. This screen picks from the library. Open Fixture
  Library import, a bundled snapshot and a small type editor are the next
  plan, ahead of the Show screen (owner decision, 2026-11-16).
- Stage positions and rotation (Step 5), park values, tags, response
  time, colour model, the DAW offset, venue notes. The screen does not
  edit them.
- AI of any kind (pasted fixture lists, name recognition). Later steps.
- Choosing which venue the engine runs. The Perform picker does that
  (restart, exit 76) and keeps doing it.
- Editing on a phone. The phone gets a read-only list with Flash.
- A printed patch sheet.

Anti-goals (a failure even if it works)
- Losing data: any field of the venue file the screen does not edit
  (position, rotation, tags, park, responseMs, colorModel, notes,
  dawOffsetMs, a patch's fallbacks, computedAt and health) must come back
  from a save exactly as it was read.
- The screen saying "fine" and the engine refusing the file at load.
- A light stuck on after Flash, or Flash firing during a song.
- An edit reaching the running show by surprise, without the owner
  having pressed Save.
- Layout that shifts while editing or dragging.

## 3. Approaches

Where the checking and the patch proposal run while editing. The rules
exist twice: Rust (`ptah-model`: `lint_venue`, `propose_patch`, `health`)
and TypeScript (`packages/model-tools`, the Step 0 executable spec), held
equal by shared oracles.

1. **Server decides everything.** The page sends its draft to the server
   for every check. One source of truth; a request per drag step, visible
   lag over Wi-Fi.
2. **Browser decides, server stores.** Instant, no new routes; the screen
   could then say "fine" where the engine refuses.
3. **Browser for feedback, server for the verdict.** Chosen by the owner.
   While dragging or typing, the TypeScript rules colour overlaps and
   overflows at once. Propose and Save go to Rust, and the server's
   issues replace the local ones.

Dropped early: compiling the Rust rules to WebAssembly (a new toolchain
and dependencies for what the oracles already guarantee).

Approach 3 makes `@ptah-app/model-tools` a dependency of the web side.
Only its pure modules may be imported (`lint/venue`, `lint/ids`,
`lint/show`, `patch/*`, `health`, `capabilities`, `types`, `issue`);
`schemas.ts` and
`validateTree.ts` read files and stay out of the bundle.

## 4. The screen

Route `/venue` opens the venue in use, or the last one opened, or the
first; `/venue/<id>` a given venue; the Patch page is `/venue/<id>/patch`.
The shell's strip marks Venue as shipped.

### 4.1 Header (both pages)

- The venue's name, editable in place.
- `in use` beside it when the engine runs this venue. Nothing otherwise.
- A venue menu: the other venues, then New, Duplicate, Delete.
- A fault count (`1 overlap`, `2 errors`) drawn only when there is
  something wrong. Its place is reserved so nothing shifts.
- Undo, Redo, Save. Save is the accent button, disabled with no changes.
- Tabs: Rig, Patch. The Patch tab carries a warning count when a patch
  has unfilled slots or health issues.

### 4.2 Rig page

Top to bottom, full width:

**Universes table.** Columns: name, number, output, target, rate, used
(`61 / 512`), state. A last row adds a universe.
- Output is one of `none`, `USB Pro`, `Art-Net`, `sACN`; the target cell
  shows that kind's fields: USB Pro an optional serial (`any` when
  empty), Art-Net host, port (blank means 6454), net, subnet, universe;
  sACN a universe number.
- Rate in Hz; blank means the engine default.
- State is live only for the venue in use (`connected`, or the fault
  word in fault colour); blank for any other venue.
- Deleting a universe that still has fixtures is refused with a line
  naming how many.

**Block map**, one per universe (a new design-system primitive beside
`UniverseGrid`).
- 512 channels as 8 rows of 64. All 8 rows are always drawn, so the map
  has one fixed height.
- Each fixture is a block spanning its channels, wrapping across rows,
  carrying its name (clipped when narrow; the full name, type and
  channel range show in a fixed readout line under the map on hover,
  focus or selection).
- Selecting a block selects the table row, and the reverse.
- Drag a block to re-address it; it snaps to channels. Dropping onto
  occupied channels is allowed and turns both fixtures red: an overlap
  is a warning, as in the file rules, not a refusal. A drop that would
  run past 512 is not accepted.
- Keyboard: with a block focused, left and right move it one channel,
  with Shift by its own footprint. The address cell in the table is the
  other path.
- Overlapping channels are drawn in fault colour.

**Fixtures table.** Columns: name, type, mode, universe, address,
channels, groups, and a Flash button on the row.
- Name, type (a searchable picker over the library), mode, universe and
  address are edited in place. Changing type picks that type's first
  mode. Channels is derived.
- Groups is read-only: the groups this fixture serves in the venue's
  patches, as `group (show)`.
- Row actions: duplicate (next free address), delete. Deleting a fixture
  used in a patch asks first, naming the shows and groups; its slots
  become empty.
- **Add fixtures**: count, type, mode, universe, start address (default:
  the first gap that fits them all), base name. Adds `Name 1..n` at
  consecutive addresses.
- Under the type picker, one quiet line: `Type missing? Types are added
  in the next version.` (wording to settle in the plan).
- Sorted by universe then address; a row does not jump while its address
  is being typed (it moves on commit).

### 4.3 Patch page

Works on the saved rig. With unsaved rig changes the page shows one line,
`Save the rig to patch it`, and its actions are disabled.

- A picker of the venue's patches, shown as show name (and patch number
  when a show has several), plus `Patch another show…` listing the shows
  with no patch here.
- One row per group of the show, in the show's order: group name, wanted
  against assigned (`4/4`), one chip per member slot, and at the right
  `ok` in dim text or the issue with its fallback in warning colour.
- A slot chip opens a picker of the venue's fixtures (those meeting the
  group's needs first, the others marked) or empties the slot. Empty
  slots are drawn dashed.
- Below: the fixtures this show does not use.
- Actions: **Propose** replaces the page's draft patch with the
  matcher's proposal (not stored yet; changed slots are marked);
  **Save patch** stores it; **Revert** returns to the stored patch.
- The issue text and the tab's count come from the TypeScript `health`
  run in the browser on the page's draft patch. The file's stored
  `health` is not read for display.
- Fallbacks are shown, not edited. Propose takes the matcher's
  assignments and keeps the stored patch's hand-set fallbacks for groups
  that still exist.
- Save patch writes `computedAt` when the draft is an untouched
  proposal and drops it after a hand edit; it drops a stored `health`,
  which would be stale. Patches not saved from this page keep both.
- A member slot that holds several fixtures (the file allows a tuple)
  is shown as one chip listing them and is not editable in this version;
  it is preserved.

### 4.4 Flash

- A hold button on each fixture row. While held, that fixture goes to
  full and nothing else changes; on release it returns to what the show
  gives it.
- Enabled only when all of these hold: the engine runs this venue with a
  show loaded (so the venue needs a saved patch and to be picked in
  Perform first; Flash with no show is not in this version), the fixture is in the saved file, and the clock is not
  running. Otherwise the button is disabled and its tooltip gives the
  reason (`load a show on this venue`, `save first`, `Reaper is
  running`).
- "Full" means the fixture's intensity at 1, and red, green, blue,
  white, amber and uv at 1 where it has them; every other channel keeps
  its value.

### 4.5 Phone

Below the editing width the page is a read-only list: universes with
their output, then fixtures (name, address, type) each with its Flash
hold button at touch size, then the patch as text. No editing controls,
and one line saying editing needs a wider screen.

### 4.6 Rules that apply everywhere

Tokens only; nothing shifts; calm when well and loud only when wrong;
every action reachable from the keyboard and listed in the command
palette (New venue, Duplicate venue, Add fixtures, Save, Propose patch,
Go to Rig, Go to Patch).

## 5. Editing model

- Opening a venue reads the whole file and keeps it as the base. Edits
  build a draft in the page; undo and redo walk the draft's steps. Save
  writes the whole draft; every field the screen does not edit rides
  along untouched (anti-goal 1). The file format refuses unknown keys,
  so there is nothing else to carry.
- New ids (venue, universe, fixture) are UUIDs made in the browser.
- Local feedback: after each step the page runs the TypeScript
  `lintVenue` on the draft for the map colours, the row marks and the
  count.
- Save sends the draft. Schema errors refuse the save and are shown on
  the fields they name. On success the server's issue list replaces the
  local one.
- Warnings (overlap, park-unsupported) do not block a save. Lint errors
  (unknown type, unknown mode, unknown universe, overflow past 512,
  duplicate ids) do.
- Leaving the page, switching venue or closing the tab with unsaved
  changes asks first.
- **The venue in use.** After a successful save the page reloads the
  playing show on the same venue and patch (the Reload path, which keeps
  the clock). If the clock is running, Save first asks: `Apply to the
  running show?` with `Save and apply` and `Cancel`. If the engine
  refuses the reload, the file stays saved, the old show keeps playing,
  and the page says so in fault colour with the engine's reason until
  the next successful save.
- Saving a patch follows the same rule when it is the patch playing.
- **New venue**: one universe `Main`, number 1, output `none`, no
  fixtures, no patches. **Duplicate**: a copy under a new venue id and
  `<name> copy`, patches included. **Delete**: asks, naming the patches
  that go with it; refused for the venue in use.
- If the file changed on disk since it was read (another tab, a hand
  edit), Save is refused and the page offers to reload it or overwrite.

## 6. Server and engine changes

API (all under the existing `/api/v1`):
- `PUT /venues/{id}` already creates the venue when the id is new and
  already answers with the Rust lint `issues`. New: it takes the
  revision the file was read at and answers 409 when the file has moved
  on.
- `GET /venues/{id}` gains that revision.
- `DELETE /venues/{id}`: 409 for the venue in use.
- `POST /venues/{id}/patches/propose` with `{ showId }`: the Rust
  `propose_patch` over the stored venue, show, programs and library.
  Stores nothing.
- `PUT /venues/{id}/patches/{index}` exists; it gains the same revision
  check and answers with the new revision, so the Rig draft never
  overwrites a patch saved from the Patch page.
- `GET /venues` exists; the page needs each patch's show name, taken
  from `GET /shows`.

Engine:
- **Outputs follow a reload** (owner decision, 2026-11-16). Today the
  outputs are opened once at start and a hot swap only re-maps existing
  slots by universe number, so an added, renumbered or re-targeted
  universe would be ignored. New: on a load, the loader compares the
  venue's universes with the outputs that are open.
  - An unchanged universe (same number, kind, target and rate) keeps
    its output untouched: no gap in its frames.
  - A changed, added or removed one is closed and opened off the render
    thread, and the swap takes the new set at a frame boundary. The
    render thread still allocates nothing.
  - An output that fails to open leaves that universe in fault, shown
    in the universes table's state column; the others and the show keep
    running. The load itself is not refused for it.
  - A rate change alone re-arms that output's rate without reopening
    the device where the worker allows it (builder's call).
- A new command, `identify`, carrying a fixture of the loaded venue and
  on or off. Applied on the render thread above the merge and above the
  master and blackout overrides, for that fixture's channels only, with
  no allocation. "Full" is set per attribute, so the work reaches
  `ptah-vm`'s fixture rendering as well as `ptah-engine`. A compiled
  show already holds every fixture of the venue, grouped or not.
- "The clock is running" means the beat is advancing, whatever the mode
  (locked with pulses arriving, internal and running, free-run). Held at
  0, stopped, or locked and still waiting for the first pulse is not
  running. The wire has no such flag today (`internal` covers held and
  running): the `clock` topic gains `running`, used by Flash and by the
  Save confirmation.
- Refused when no show is loaded, the fixture is unknown, or the clock
  is running. A Start or first pulse while one is held releases it.
- It expires by itself: an `on` holds for 2 s unless repeated, so a lost
  connection or a closed tab never leaves a light on. The page repeats
  it while the button is held.
- Not journalled, not part of the recorder's show state; a restart
  comes back with nothing identified.
- One fixture at a time: a new `on` replaces the previous one.

## 7. Where the code goes

As Perform did it:
- `packages/ds/src/primitives/BlockMap/`: the map, with stories and the
  no-shift gate.
- `packages/ds/src/venue/`: the screen's parts (header, universes table,
  fixtures table, add dialog, patch page, phone list) and the draft
  model as pure functions with unit tests; stories for each state
  (well, overlap, error, unsaved, in use, empty venue, phone).
- `apps/web/src/venue/`: the route, API calls, the save-and-apply flow,
  the live state for `in use`, clock running and output state.
- `crates/ptah-server`: the routes of §6. `crates/ptah-engine` (and `ptah-vm`, `ptah-io` as needed): the
  command and outputs on reload. `docs/api.md`, `docs/app.md`, `docs/engine.md` updated.

No new outside dependency is expected. If one turns out to be needed it
follows the standing rule (older than 14 days, pinned exactly) and is
raised with the owner first.

## 8. Testing and exit

- Unit: the draft model (every edit, undo and redo, the untouched-fields
  round trip over the four fixture venues), the add-fixtures gap search,
  the map's channel arithmetic.
- Design system: stories under the existing visual, no-shift and tap
  gates.
- Rust: route tests (create, revision conflict, delete in use, propose
  equals the oracle's proposal, `computedAt` aside); the identify command (refusals, expiry,
  release on Start, the zero-allocation guard, wins over blackout);
  outputs on reload (unchanged output keeps its frames with no gap,
  added and re-targeted universes send, a removed one stops, a failed
  open is a fault that does not stop the others, the allocation guard).
- End to end against the real binary: re-address a fixture, save, and
  the captured DMX moves to the new channels without a restart; point
  the universe in use at another Art-Net target, save, and frames
  arrive there without a restart; hold
  Flash and the fixture's channels go to full then return.
- Gates: focused tests while iterating, full `pnpm allcheck` and the
  serial Rust suite once per task.

Exit, checked by the owner on the rig:
1. Drag a fixture to a new address, Save: the light follows, no restart,
   the bar keeps counting.
2. Duplicate the venue, point its universe at Art-Net, Propose and save
   a patch, pick it in Perform: the show plays.
3. Hold Flash on each fixture from the phone: the right light answers,
   and nothing stays on.
4. Start Reaper: Flash is refused and says why.
6. On the venue in use, switch the universe from the USB Pro to Art-Net
   and back, saving each time: the lights follow, no restart.
5. Open the owner's venue file, change one address, save: a diff of the
   file shows only that address. (Holds for files already in the
   server's own pretty form; a hand-formatted file is reformatted once.)

## 9. Left to the builder

- The names and shape of the revision (`etag` header or a field), of the
  `identify` wire form, and of the patch-propose answer.
- How the map draws a block that wraps rows, and how narrow blocks
  abbreviate.
- The editing width below which the phone list shows.
- Exact wording of the lines and tooltips, within "calm when well".
- The order of work, as long as the Rig page is usable before the Patch
  page and Flash, which can be built in parallel with them.

## 10. Calls made by the author (not the owner's decisions)

- Explicit Save with a confirmation when the clock runs; undo and redo.
- The Patch page works on the saved rig only, and saves through the
  existing patch route.
- Slots are hand-editable; tuple slots are shown but not edited.
- Overlap is a warning that does not block saving.
- Flash wins over blackout and master, expires after 2 s, and is
  available on the phone.
- The phone page is read-only apart from Flash.
- Eight rows always drawn in the map.
- Delete is refused for the venue in use; Duplicate copies patches.
- A conflict check on save.
