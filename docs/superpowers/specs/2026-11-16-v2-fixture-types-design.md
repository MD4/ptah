# PTAH V2 — Fixture types: bundled library, Library screen, type editor (design)

- **Date:** 2026-11-16
- **Status:** approved by the owner 2026-11-16, builder-checked (Library screen of its own,
  bundled only, in-place edits with a warning, layout B, approach 1: all
  chosen in conversation)
- **Repo:** `~/projects/ptah-v2` (V1 is never modified)
- **Step:** 3, between the Venue screen and the Show screen (owner
  decision, 2026-11-16). Master plan §4.2 (fixture type), §4.3.
- **Mockups:** `~/projects/ptah/.superpowers/brainstorm/42122-1794847005/content/library-layouts.html`
- **Builds on:** the Venue screen design
  (`2026-11-16-v2-venue-screen-design.md`): its type picker, its draft and
  save model, its conventions.

## 1. Intent

The Venue screen can only use a light whose type is already in the
library, and the library holds eight types. The owner's final objective
is to map a show onto any venue's rig. That needs every real light to be
describable, with as little typing as possible on the day and none of it
depending on a venue's Wi-Fi.

Three things deliver that: the Open Fixture Library (OFL) shipped inside
the app, a Library screen to find, import, adapt and keep types, and a
small editor for the lights OFL does not know. OFL holds 666 fixtures
from 138 makers today: a fraction of what venues hang. The editor is
therefore a regular tool, not a rare fallback.

## 2. Goals, non-goals, anti-goals

Goals
- Find a light by maker or model among the bundled entries and the
  owner's own types, offline, instantly.
- Import a bundled entry in one action, from the Library screen and from
  the Venue screen's type picker.
- See, per bundled entry, how faithfully it converted, before importing.
- Create a type from a manual in minutes: paste a channel list, correct
  the guessed roles, save.
- Adapt a similar type: duplicate, change, save.
- Edit a type that venues use, with a clear warning of what changes.
- Refresh the bundled library with one developer command and a
  reviewable diff.

Non-goals
- Fetching anything from the internet at run time, and importing a
  single OFL file by hand. (Owner decision: bundled only. File import
  can be added later if wanted.)
- Driving the pixels of a bar or matrix separately. They import as one
  light.
- Using value ranges in the engine (shutter open/closed for Flash,
  wheel slots). The data is carried; using it is later work.
- OFL's physical data beyond what `fixtureType@1` already holds, its
  RDM data, its gobo images.
- AI recognition of fixture names. Later steps.
- Deleting a type that venues use.
- Editing types on a phone.
- Telling the owner that a bundled entry they already imported has
  changed in a newer catalogue. The imported copy stays as it is.

Anti-goals (a failure even if it works)
- A type that converts wrong and says "clean".
- A saved type the engine refuses to load, or that changes a venue's
  footprints without the owner having been told.
- Losing a field of a type file the editor does not show (`physical`,
  `source`, ranges on a channel whose ranges were not opened).
- The bundled entries burying the owner's own types.
- Shipping OFL's content without its licence notice.

## 3. Approaches

Where the conversion happens and what ships.

1. **A converted catalogue committed in the repo.** Chosen by the owner.
   A developer command converts one pinned copy of OFL into a single
   catalogue file in PTAH's own format; the file is committed and
   embedded in the binary; the server offers it for search and hands out
   one entry on import. Builds need no network; a refresh is one command
   and a diff; all conversions are tested when the catalogue is made.
   Cost: a file of roughly 1 to 2 MB in git.
2. **Raw OFL vendored, converted at every build.** Every build pays for
   it; the repo carries 7.5 MB in a format its maintainers say may change
   without notice; a converter bug is a build failure, not a diff.
3. **Raw OFL embedded, converted at import.** Search needs its own index
   anyway; the conversion grade is unknown until import; errors surface
   at a venue.

Dropped early: unpacking every entry into the owner's library folder at
first start (it buries the owner's types).

## 4. The bundled catalogue

### 4.1 The developer command

`ptah library build --ofl <dir> --out <file>` (hidden from the normal
help). `<dir>` is a checkout of OFL at one pinned commit; the command
never downloads. It writes the catalogue and a short report (counts by
grade, every fixture skipped and why). The catalogue records the OFL
commit and date it was built from. `docs/` gains the refresh steps
(clone at a commit, run, review the diff, commit). OFL's licence (MIT)
notice is committed beside the catalogue and shown in the app (§5.1).

The converter is written once, in Rust, beside the V1 importer, and
produces `fixtureType@1` values through the model's own types.

### 4.2 Conversion rules

One OFL fixture becomes one type; each OFL mode becomes a mode, channels
in order.

- **Identity.** The type's id is derived from the OFL key
  (`<manufacturer>/<fixture>`) alone (a name-based UUID in a fixed PTAH
  namespace), so it is the same on every machine and across refreshes.
  Mode ids are derived from the OFL mode's short name (or name), in the
  schema's form (`^[a-z0-9]+(-[a-z0-9]+)*$`), made unique within the
  type. Venues store `modeId`, so a mode's id never changes once it
  exists: not on a refresh (same OFL mode, same id) and not in the
  editor (§5.2). `source` is `{ kind: "ofl", key, fetchedAt }`
  with `fetchedAt` the pinned commit's date.
- **Role** of a channel, from its capabilities (ignoring `NoFunction`):
  - `Intensity` → intensity; `ColorIntensity` → the colour's role (Red,
    Green, Blue, Cyan, Magenta, Yellow, Amber, White, UV, Lime, Indigo;
    Warm White and Cold White → white); `ColorTemperature` → colorTemp;
  - `Pan`/`PanContinuous` → pan; `Tilt`/`TiltContinuous` → tilt;
    `PanTiltSpeed`, `Speed`, `EffectSpeed`, `Time` → speed;
  - `ShutterStrobe`, `StrobeSpeed`, `StrobeDuration` → strobe when any
    range strobes, shutter when the ranges are only open and closed;
  - `Zoom` → zoom; `Focus` → focus; `Iris`/`IrisEffect` → iris;
    `Prism`/`PrismRotation` → prism;
  - a wheel channel (`WheelSlot`, `WheelRotation`, `WheelShake`,
    `WheelSlotRotation`): gobo when the wheel holds gobos (the second
    such wheel → gobo2), otherwise macro (a colour wheel is a macro
    channel with named ranges);
  - `ColorPreset`, `Maintenance` → macro; `Effect`, `EffectDuration`,
    `EffectParameter`, `SoundSensitivity` → effect;
  - everything else, and a channel mixing unrelated kinds → generic.
  The role is that of the capability kind covering the most DMX values.
- **Fine channels.** An OFL fine alias becomes a channel with `fineOf`
  pointing at its coarse channel in the same mode. Only the first fine
  byte is kept as fine (16 bit); a further byte becomes a generic channel
  with no `fineOf` (the lint of §5.5 refuses two fine bytes on one
  channel) and the type is graded simplified.
- **Default** is OFL's `defaultValue` (a percentage is scaled to 0–255),
  else 0. Exception: the engine writes strobe and shutter channels from
  the show's rate and otherwise leaves the mode default, so a shutter
  channel with no OFL default takes the first value of its `Open` range
  (a light must not sit dark because its shutter defaults to closed).
  When no range is open and value 0 is closed, the type is graded
  simplified: `the shutter may start closed`.
- **Ranges.** A channel with more than one capability, or with a
  capability that is not proportional over 0–255, gets one range per
  capability: `from`, `to`, `meaning` (a short readable label built from
  the capability: `Open`, `Closed`, `Strobe slow→fast`, the wheel slot's
  name, the OFL comment when there is one), and `value` when there is a
  single obvious one (a slot number, a colour name). Shutter ranges
  always say `Open` or `Closed` in `meaning` when that is what they are.
- **Pixels and matrices.** Template channels are expanded in the mode's
  order; every pixel's channels keep their roles. The engine gives all
  channels of one role the same value, so the fixture acts as one
  light. Graded simplified: `N pixels act as one light`.
- **Switching channels.** The channel takes the meaning selected by the
  trigger channel's default value. Graded simplified: `a switching
  channel uses its default meaning`.
- **Skipped.** A fixture that cannot produce a valid type (no modes, a
  mode over 512 channels, a structure the converter does not know) is
  left out and listed in the report with its reason. Nothing invalid
  enters the catalogue.

### 4.3 Grades

Each catalogue entry carries `conversion`: `clean`, or `simplified` with
a list of reasons in plain words (the phrases above, plus `a 24-bit
channel keeps 16 bits` and `a channel mixing several functions is
generic`). A type is clean only when every channel got a specific role
or is honestly generic in OFL, nothing was dropped, and no rule above
marked it.

### 4.4 Tests

- The whole pinned library converts: every produced type passes the
  model's schema and lint; the report's counts are asserted so a refresh
  that changes them is seen.
- A set of hand-checked fixtures (a 1-channel dimmer, an RGBW par with
  several modes, a 16-bit mover with gobo and colour wheels, a pixel
  bar, a fixture with a switching channel, a strobe with shutter ranges)
  with their expected types committed as oracles. A few OFL files are
  vendored as test fixtures for this, with the licence notice.
- Ids are stable: converting twice gives identical bytes.

## 5. The screens

### 5.1 Library list (`/library`)

The top strip gains **Library**, after Venue. Full width (layout B).

- A search field (maker, model, typed words in any order) and a filter:
  All, Mine, Bundled, with counts. Mine is first in All.
- One row per type: name, maker, modes as channel counts (`4 · 6 · 8
  ch`), source (`mine` or `bundled`), conversion (`clean`, `simplified`
  in warning colour, blank for the owner's own), used in (venue names
  with fixture counts), and the row's actions.
- A bundled entry already imported appears once, as `mine`, keeping its
  OFL origin in its detail.
- Actions on a row: `mine` → Edit, Duplicate, Delete (refused while
  used, saying where); `bundled` → Import, Duplicate (imports under a
  new id as a custom type and opens it).
- **New type** opens an empty type page.
- A quiet footer line: `Bundled from Open Fixture Library, <date>, MIT
  licence`, linking to the notice.
- The list is virtualised; search filters as typed with no layout shift.

### 5.2 Type page (`/library/<id>`)

Full width, with `← Library`.

- Header: name and maker (editable for `mine`), the source mark, `used
  in …`, Duplicate, and Save (or **Import** for a bundled entry, which
  is read-only).
- For a bundled or imported entry: one line stating the conversion,
  `clean` in dim text or `simplified: <reasons>` in warning colour.
- Modes as tabs, each with an editable name; add, duplicate, remove a
  mode (removing one that fixtures use is refused, saying where). A
  mode's id is set when the mode is created (from its first name, or a
  fresh one for a duplicate) and never changes afterwards: renaming a
  mode changes its name only.
- The channel table of the selected mode: position, name, role (a
  picker over the 27 roles, grouped), fine of (a picker over the mode's
  other channels), default (0–255), inverted, value ranges (a summary;
  opening it edits the list of `from`–`to`–`meaning` rows), and row
  actions (move up, move down, duplicate, delete). Channels reorder by
  keyboard and by drag.
- **Paste a channel list**: a text box under the table. One channel per
  line, an optional leading number, then the name (`1 Dimmer`, `2: Red`,
  `Pan fine`). It replaces the mode's channels after a confirm when the
  mode is not empty. Roles are guessed from the names by keyword
  matching (a fixed table in code: dimmer/intensity/master → intensity,
  red/r → red, …, `fine` → fine of the preceding channel of the same
  base name); unmatched names are generic. No AI.
- Live checks as in the Venue screen: the TypeScript rules mark what the
  server would refuse (§5.5), and Save is blocked while an error stands.
- While a Venue page is open, it reads the types again when its window
  regains focus and before each Save, so a type saved in the Library is
  never judged against a stale copy.

### 5.3 The Venue screen's type picker

The picker searches the owner's types and the bundled entries together,
`mine` first, bundled ones marked. Picking a bundled entry imports it
(silently when clean; with its `simplified` line shown once when not)
and selects it. The line `Type missing? Types are added in the next
version.` becomes two entries at the foot of the picker: `New type…`
and `Open the Library`, both leaving the Venue page through its
unsaved-changes guard.

### 5.4 Phone

Below the editing width the Library is a read-only list with search;
a type page shows its modes and channels as text. No editing.

### 5.5 New rules for a type (Rust and TypeScript, with shared oracles)

Today both lints check only the channel count and that `fineOf` is in
range. These become errors, on both sides, held equal by new oracle
cases; every catalogue entry and the eight existing types must pass:

- a mode with no channel; duplicate mode ids in a type;
- `fineOf` pointing at the channel itself or at a channel that is itself
  a fine byte; two channels that are fine bytes of the same channel;
- a range with `from` greater than `to`; ranges of one channel that
  overlap.

## 6. Saving and the in-use warning

The type page follows the Venue page's model: a draft, undo and redo,
explicit Save, the server's verdict replacing the local checks, a
revision check against changes made elsewhere, and a guard on leaving
with unsaved changes. A type file's fields the editor does not show
ride along untouched.

**State table** (owner convention for stateful pages; the plan carries
the full table with one test per row):

| State | Event | Result |
|---|---|---|
| clean | edit | dirty; local checks run |
| dirty, no errors | Save, type unused | saved; clean |
| dirty, no errors | Save, type used, footprints unchanged | saved; clean; venues pick it up at their next load |
| dirty, no errors | Save, type used, a footprint changes or a used mode's channels move, every venue stays loadable | the in-use warning opens |
| in-use warning | Save anyway | saved; clean |
| in-use warning | Cancel | dirty, nothing written |
| dirty, no errors | Save, and a venue would no longer load (a fixture past channel 512) | refused: the list of venues and fixtures to move first; dirty, nothing written |
| dirty | Save, file changed on disk | conflict: Reload or Overwrite |
| dirty | Save refused by the server | dirty; the server's issues shown on their fields |
| dirty | leave, Back, Forward, close | asks first |
| saving | any edit | refused until the answer arrives; focus kept |
| bundled, read-only | Import | the type is written; the page becomes `mine` and editable |
| bundled, read-only | Import, a type with that id exists | opens the existing one; nothing written |
| any | the type is deleted elsewhere | the page says so and offers the Library |

**The in-use warning** lists, per venue, the fixtures of this type, and
for each change what it does: the footprint before and after, the
fixtures that would then overlap another or pass channel 512, and the
patches whose groups lose a capability they need. It is computed by the
server from the files on disk (so it also covers venues not open in any
page), offered as `Save anyway` / `Cancel`. If the venue in use is
affected and a show is loaded, the warning also says the running show
changes at its next reload, and the save does not reload it.

**What is refused, not warned.** A venue with an error-level issue is
skipped when the tree is loaded: it vanishes from the venue list and no
show can load on it. A type save must never cause that. So a save that
would push any fixture past channel 512 is refused, with the venues and
fixtures to move first; removing a used mode is already refused, and a
mode's id cannot change. Overlaps are warnings in the file rules and
stay a warning here (`Save anyway`). The server enforces this on the
`PUT` itself, not only in the impact answer.

## 7. Server changes

All under the existing `/api/v1`:
- `GET /library/catalog`: the bundled index (id, key, name, maker,
  modes as `{ name, channelCount }`, conversion grade and reasons), plus
  the OFL commit and date. Served from the embedded file.
- `GET /library/catalog/{id}`: one bundled entry as a full type.
- `POST /library/catalog/{id}/import`: writes it to the library if no
  type has that id; answers the type either way.
- `GET /types` (today `{ id, name }` only) gains what the list needs:
  maker, mode summaries, source.
- `GET /types/{id}` and `PUT /types/{id}` gain the revision check the
  venue routes have (`ETag`, `If-Match`, 409, 400 for an unusable
  header), under the same write lock.
- `PUT /types/{id}?check=uses` (or a `POST /types/{id}/impact` with the
  draft; builder's call on the shape): answers the in-use impact of
  §6 without writing. The real `PUT` answers 409 with the same list
  when a venue would stop loading.
- `GET /types/{id}/uses`: the venues and fixtures using a type.
- `DELETE /types/{id}`: 409 while used, naming where.

No engine change. Types are read when a show is loaded, as today.

## 8. Where the code goes

- `crates/ptah-model/src/import/ofl/`: the converter, its role table,
  its report. `crates/ptah`: the `library build` command.
- `crates/ptah-server`: the catalogue embedded like the web app, the
  routes of §7.
- `library/ofl-catalog.json` (name to settle) and `library/OFL-LICENSE`
  in the repo.
- `packages/ds/src/library/`: the list, the type page, the paste box,
  the range editor, the in-use warning; the draft model and the
  paste parser as pure functions with unit tests; stories for each
  state of the table.
- `apps/web/src/library/`: routes, API calls, the save flow.
- `packages/ds/src/venue/`: the type picker's bundled search and its
  two foot entries.
- `packages/model-tools`: the TypeScript lint for a type, if it lacks a
  rule §5.2 needs (kept equal to the Rust lint by the shared oracles).

No new outside dependency is expected (`uuid` with its name-based v5
is already in the workspace). Anything else is raised with the owner
first, older than 14 days and pinned exactly.

## 9. Testing and exit

- Converter: §4.4.
- Rust: route tests (catalogue, import idempotent, revision conflict,
  impact answers for footprint growth, overlap, overflow and a lost
  capability, delete refused while used).
- Design system: unit tests for the draft model, the paste parser (a
  table of real manual excerpts), the role guesses; stories under the
  visual, no-shift and tap gates; one test per row of the state table.
- End to end against the real binary: search a bundled par, import it,
  use it in a venue, save; create a type by pasting a channel list, use
  it; grow a used type's footprint and see the warning name the
  overlap.

Exit, checked by the owner:
1. In the Venue screen, add fixtures of a light never used before, found
   by typing its maker and model, with no network.
2. Create a type for a light OFL lacks from its manual's channel list in
   under five minutes.
3. Duplicate a bundled par, remove a channel, save, use it.
4. Change the channel count of a type the Hilldale venue uses: the
   warning names the fixtures and the overlap; Cancel leaves the file
   untouched; Save anyway changes it.
5. Open a simplified entry (a pixel bar): its line says why; imported
   and patched, the whole bar lights as one.

## 10. Execution conventions (owner, 2026-11-16)

The plan splits the type page into small tasks around the state table;
Rust tasks run in pre-built worktrees; at most three agents at once;
UI tasks run the visual gate on their own boards and the full gates run
at the checkpoints; failing test first.

## 11. Left to the builder

- The catalogue's file name, its exact shape and whether it is stored
  compressed.
- The UUID namespace constant and the mode-id rule's details.
- The exact keyword table of the paste parser and the labels of ranges,
  within "short and readable".
- The shape of the impact route.
- Search ranking (maker and model words, prefix before substring).

## 12. Calls made by the author (not the owner's decisions)

- Pixels act as one light; switching channels take their default
  meaning; colour wheels are macro channels with named ranges.
- Shutter ranges always carry `Open` / `Closed`.
- An id derived from the OFL key, the same everywhere.
- A bundled entry already imported is listed once, as `mine`.
- Delete is refused while a type is used; removing a used mode too.
- A save that changes a used type never reloads the running show.
- The paste box replaces the mode's channels, after a confirm.
- The picker imports a clean entry silently.
- The converter in Rust only, with no TypeScript twin.
- The phone is read-only.
- From the builder check: a save that would make a venue unloadable is
  refused rather than warned; mode ids are frozen at creation; a shutter
  with no default opens; six new lint errors on both sides; an open
  Venue page re-reads types on focus and before Save; a changed bundled
  entry is not flagged.
