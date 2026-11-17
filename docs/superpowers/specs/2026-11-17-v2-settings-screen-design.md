# PTAH V2 — Settings screen (design)

Status: draft for the owner's approval, 2026-11-17.
Code: `~/projects/ptah-v2`, branch `settings-screen`.
Follows: Perform, Venue, Library, Show, Builder (all merged). This is the
last Step 3 screen; when it ships, V1 can be uninstalled.

Words: "the owner" is the band's drummer who runs PTAH. "The file" is
`settings.json` under the served root. "The child" is `ptah run`, restarted
by its parent (`ptah supervise`, which bare `ptah` starts).

## 1. Intent

Today every setting is changed by editing `settings.json` by hand and
restarting PTAH; the owner has done so at least twice (the MIDI port name,
the transport port). The V1 import is command-line only. The Settings
screen removes the last reasons to open a terminal or a JSON file: MIDI
devices, the Reaper transport port, the number to type into Reaper, the
network address, the few engine numbers, and bringing V1's shows in.

Two moments of use shape the page:

- **at a venue, or when the rig changes**: a controller is plugged in, the
  clock master changes, the phone needs the address, Reaper needs its
  offset;
- **once, at home**: start-up behaviour, engine numbers, the V1 import.

## 2. Goals, non-goals, anti-goals

Goals

1. Every key the owner may need is editable on the page; no hand edit of
   the file is needed for a gig.
2. A change is saved, then applied by a restart the page offers (the
   owner's choice, §3). The page always says what is waiting for a restart.
3. Each MIDI device shows whether it is there and whether it speaks, now.
4. The page gives one number to type into Reaper, with its breakdown.
5. The V1 import runs from the page: look first, then add.
6. Two pages saving at once cannot lose each other's change, and a save
   cannot lose the engine's own writes to the file.

Non-goals (later steps; their keys are kept untouched on save)

- AI key (`ai`), house lights (`houseLightsSceneId`), fixture library
  refresh (`library.oflRefresh`), OSC (`osc`), audio input (`audio`),
  `debugRateHz`.
- Applying a change without a restart (approach B, §3).
- The measured and calibrated levels of the offset (Step 4).

Anti-goals

- A restart that surprises: never restart without the owner's click, and
  ask first while the clock runs.
- A settings page that can leave PTAH unable to start (a refused save
  writes nothing; every save is validated and linted as today).
- Technical words on the page: no key names, no "supervisor", no "exit 75".

## 3. Approaches

**A. Save, then restart (chosen by the owner).** The page writes the file
and asks the existing `POST /restart`; the child exits 75 and comes back on
the same show from its journal a few seconds later. It matches the engine
as built: settings are read at start. Cost: a few seconds without light
changes on each applied change.

**B. Apply live where possible.** Enabling a device or moving the clock
master would act at once. Rejected for now: it needs new work on the live
MIDI input path, the riskiest place to touch for a settings page. It can
come later for MIDI devices alone.

**C. A raw editor of the file** (a table of keys and values). Rejected: it
does not say what a number means, nor show the live state, and it exposes
keys of later steps.

## 4. The screen

Route `/settings` (today the "Not yet" view). Settings gets a tab, the last
in the strip, and joins `shipped`. One page, no sub-routes. At 1280 px two
columns; under 900 px one column (left column's sections first); under
600 px read-only (§4.9).

```
PTAH  Perform  Venue  Library  Show  Builder  Settings
┌──────────────────────────────────────────────────────────────────────┐
│ 2 changes apply when PTAH restarts: clock master, frames per second  │
│                                         [Discard] [Save and restart] │
├───────────────────────────────────┬──────────────────────────────────┤
│ MIDI INPUTS                       │ WHEN PTAH STARTS                 │
│ Device   Port     On Clock Now    │ Open the browser        (on)     │
│ Reaper   ptah     ●  ◉    2 s ago │ After a crash, resume if it was  │
│ SPD-SX   SPD-SX   ●  ○    silent  │   less than [60] s ago           │
│ Keystat. Keystat. ○  ○    not plu.│ ENGINE · rarely changed          │
│ Add a device                      │ Frames per second       [44]     │
│ Reaper transport port [ptah tra…] │ Notes at once, per row  [16]     │
│ REAPER OFFSET                     │ Longest held note       [16] b.  │
│ Set Track playback offset to      │ Realtime priority       (on)     │
│ −53 ms   (breakdown)              │ Recorder keeps the last [10] min │
│ ON THE NETWORK                    │ Call the stage quiet    [120] s  │
│ Other devices can open PTAH (on)  │ Back to defaults                 │
│ Port [8420]   Address … [QR]      │ BRING IN V1   [Look…]            │
│                                   │ ABOUT  2.0.0 · files in …        │
└───────────────────────────────────┴──────────────────────────────────┘
```

The owner saw and accepted this arrangement as a browser sketch
(`ptah-v2/.superpowers/brainstorm/25093-1794947592/content/settings-proposal.html`).

### 4.1 The band (draft, saved, waiting)

The band is a fixed-height row under the strip, always present, so nothing
shifts; it is empty and calm when there is nothing to say.

| State | Band says | Buttons |
| --- | --- | --- |
| nothing changed, nothing waiting | (empty) | none |
| the draft differs from the file | `N changes` and their labels; when all of them need no restart: `N changes` only | `Discard`, `Save and restart` (or `Save` when no change needs a restart) |
| the draft has an error (§4.8) | the first error in plain words | `Discard`; save disabled |
| the file differs from what the child started with | `Saved. Applies when PTAH restarts.` | `Restart now` |
| restarting | `Restarting…` | none |
| the child is back | (empty), a toast `Restarted` | none |
| no parent to restart it (`409 no-supervisor`) | `Saved. Start PTAH again for it to apply.` | none |
| the file changed on disk (409 on save) | `Settings changed elsewhere.` | `Reload` (drops the draft), `Keep mine` (reads the new revision, re-applies the draft's changed fields on it) |

`Save and restart` saves, then restarts. While the clock runs (the live
stream's clock state), it asks first, in a dialog: "Reaper is playing. The
lights stop changing for a few seconds while PTAH restarts." with `Cancel`,
`Save only`, `Restart now`. `Save only` leaves the "Saved. Applies when
PTAH restarts." state. `Restart now` in the band asks the same question
while the clock runs (without `Save only`).

Leaving the page with a draft asks, as the other editors do.

Which changes need what:

| Applies | Keys |
| --- | --- |
| nothing to apply | `resumeWithinSeconds` (read when used), `openBrowser` (only read when `ptah` starts, which is when it matters) |
| when the child restarts (the band's restart) | `devices`, `transportPortName`, `renderRateHz`, `polyphonyPerInstance`, `heldVoiceCapBeats`, `realtimePriority`, `recorderMinutes`, `quietAfterSeconds` |
| the next time `ptah` itself is started | `uiPort`, `listen` (the parent fixes them at its start and hands them to every child) |

A change of `uiPort` or `listen` is saved like any other; its row then says
`applies the next time you start PTAH` until it does (compare with
`GET /server`'s bound address). These two never count in "apply when PTAH
restarts", and never trigger the restart question.

### 4.2 MIDI inputs

A table, one row per device of `devices`, in file order.

- **Device**: the name. A device on PTAH's own port (it has
  `virtualPortName`) has an editable name; a hardware device's name is its
  port's name (the engine matches the two), shown as text.
- **Port**: the port's name with a small word: `PTAH's own port` (virtual:
  PTAH creates it, Reaper sends to it; editable), or nothing for hardware.
- **On**: a toggle (`enabled`).
- **Clock**: a radio across rows (`clockMaster`): zero or one device.
  Clicking the selected radio clears it (no clock master: PTAH keeps its
  own tempo).
- **Now**, live, from `GET /devices` once a second while the page is
  visible, for the devices the running child knows: `message 2 s ago`
  (green dot; the age from the row's new `lastMessageAgeMs`, §6.4, in s,
  then min), `silent` (present, no message yet; grey),
  `not plugged in` (absent; attention colour), `off` (disabled). A device
  added or changed in the draft or not yet applied says `after restart`.
- A row menu: `Remove`. Removing a device a show uses is refused at save
  (§6.1): the row comes back marked `used by <show names>`.
- **Add a device** opens a menu: the MIDI input ports this machine sees now
  that are not already a device (`GET /midi/ports`), then `A new PTAH
  port…` (asks its name; default `ptah`, or `ptah 2`… when taken). An empty
  list says `No other MIDI input is plugged in.` A new device is enabled,
  not clock master, with a new uuid.

**Reaper transport port**: a text field (`transportPortName`), with `open`
or `could not open` from `GET /server`'s `transport` when it matches the
saved name. Emptied, it is saved as `null` and the row says `no transport
keys`. The existing lint (the same name as an input port) shows on the
field.

### 4.3 Reaper offset

One line, 24 px: `Set Track playback offset to −53 ms`. Under it: the venue
it is for (the venue the child is on), where to type it (`On the LIGHTS
track: Routing → Track playback offset`), and the breakdown, one line per
term. Under the breakdown, `Estimated.` (the level; Step 4 replaces it).

The venue file already has `dawOffsetMs`, and the health check already
warns (`offset-stale`) on a show with a timeline while it is absent. So the
section ends with what Reaper is set to:

- nothing stored: `Not set in Reaper yet.` and a button `I typed it into
  Reaper`, which stores the advised number in the venue (§6.3);
- stored and equal to the advice: `Reaper is set to −53 ms.` (calm);
- stored and different: `Reaper is set to −42 ms. The estimate is now
  −53 ms.` in the attention colour, with the same button.

The button needs no restart and is not part of the draft or the band. It
is disabled while the draft's frames per second differs from the file's
(`Save first.`).

The number comes from `GET /offset-advice` (§6.3), asked on mount, after a
restart, and when the draft's frames per second changes (the page passes
the draft's rate so the number follows the field before saving).

- No venue (the child waits without one): `Choose a venue on Perform
  first.`
- A venue whose universes all have no output: `This venue sends to no
  output.`
- Several universes with different totals: the headline is the largest (a
  light slightly early reads better than one late), and the breakdown has
  one block per universe, named.

### 4.4 On the network

- `Other devices can open PTAH` (toggle, `listen`).
- `Port` (number field, `uiPort`, 1024–65535).
- `Address`: `GET /server`'s `urls[0]` and a QR code of it (the existing
  encoder from Perform's readiness panel); the other addresses under it
  when there are several. With listening off: `Only this machine:
  http://127.0.0.1:<port>`, no QR.

### 4.5 When PTAH starts

- `Open the browser` (toggle, `openBrowser`).
- `After a crash, resume if it was less than [60] s ago`
  (`resumeWithinSeconds`; 0 reads `never resume`).

### 4.6 Engine

Header `Engine · rarely changed`. Number fields with their unit and one
short note each:

| Label | Key | Range | Note |
| --- | --- | --- | --- |
| Frames per second | `renderRateHz` | 1–200 | `DMX's maximum is 44` |
| Notes at once, per row | `polyphonyPerInstance` | 1–64 | |
| Longest held note | `heldVoiceCapBeats` | 0–… beats | `0: no limit` only if the engine means that (builder checks `docs/engine.md`; else no note) |
| Realtime priority | `realtimePriority` | toggle | |
| Recorder keeps the last | `recorderMinutes` | 0–… min | `0: off` |
| Call the stage quiet after | `quietAfterSeconds` | 0–… s | `without a note; 0: never` |

A key absent from the file shows its default and stays absent until
changed. `Back to defaults` sets frames per second to 44 (the schema
requires that key) and removes the other five keys from the draft (the
band then lists what changed).

### 4.7 Bring in V1, and About

**Bring in V1.** A path field (default `~/.ptah`, which the server
expands) and `Look…`. `Look…` asks `POST /import-v1` with `dryRun: true`
and opens a dialog:

- what it found, one line per show: its name, its rows and programs
  counts, and under it one line per non-empty list of the import report,
  in plain words with its count (the builder words each list; a list is
  expandable to its entries);
- what it would replace: files already here whose content would change
  (they are backed up first) and stale programs that would be removed;
  files that are new or identical are only counted;
- a checkbox `One row per note range instead of one row per note`
  (`collapse`), on by default; changing it asks the dry run again;
- `Cancel` and `Bring in N shows`.

`Bring in…` asks the same without `dryRun`, then says in the dialog what
was written and backed up, with `Done`. Refusals in plain words: nothing
found there (404), `That folder is V1's own; PTAH will not write into it`
(409), a write failed (500, with the server's notes). The import never
changes an existing `settings.json` (it keeps it, and imported shows
listen to any device), so nothing waits for a restart after it; the
dialog's last line says `Open Show to see them.` with a link.

V1's files are only ever read; the server's existing guard refuses any
write into them.

**About.** `PTAH <version>` (`GET /server`) and `files in <root>`
(`GET /server` gains `root`, §6.4).

### 4.8 Errors on the page

Checked on the draft, in the page, before a save is offered: an empty
device name or port name; two devices with the same port; a number outside
its range. The field is marked and the band says the first one. Whatever
the server refuses (422 issues, by path) is shown the same way on the
field its path names, else in the band.

### 4.9 Phone, and rules that apply everywhere

Under 600 px: one column, every value as text, the live `Now` column, the
offset and the address kept; no field, no save, no import, no restart.

Tokens only; nothing shifts (the band and every status word have a fixed
box); calm when well, loud only when wrong (the only attention colour on a
healthy page is none). Keyboard: every control reachable; ⌘S saves (and
asks to restart as the button does); the palette gains `Settings`.

## 5. Editing model

The page holds the file as read (with its revision) and a draft. The draft
is the whole document: keys the page does not show are carried as read.
"Changes" in the band are the shown keys whose draft value differs from
the file, by label. There is no undo stack; `Discard` returns to the file.
A save sends the whole draft with `If-Match` (§6.1) and takes the answer's
revision as the new base.

The engine-owned keys (`currentShowId`, `currentVenueId`,
`currentPatchIndex`) are never the page's: the server keeps the file's
values whatever the body says (§6.1), so a show loaded while the page is
open neither conflicts with the draft nor is undone by a save.

## 6. Server

### 6.1 `GET`/`PUT /settings`

- `GET` adds `ETag: "<revision>"`: the revision (as the venue routes
  compute it) of the file **without** the three engine-owned keys, in a
  canonical form, so the engine's writes do not change it.
- `PUT` takes `If-Match` as the venue routes do (409 `{ "error":
  "settings changed on disk", "revision" }`, 400 `bad-if-match`; none:
  unchecked, as today's callers).
- Every read-modify-write of the file in the `ptah run` process takes one
  process-wide settings lock across its read and write. The writers are
  in three crates (`PUT /settings` and the show `DELETE`'s index
  correction in the server, today under the venue write lock; the loader
  remembering the last show in `ptah-engine`; `cmd::edit_settings` in
  `ptah`), so the lock lives below them all, with the file store in
  `ptah-model`. Order: the venue write lock first, then the settings
  lock, never the reverse. Under it, `PUT` replaces the body's three
  engine-owned keys with the file's (absent stays absent), then validates
  and lints as today, then writes. The answer gains `revision`.
- A device removed by the `PUT` that a show which loads names (a
  `DeviceRef` by id, in any trigger or source) is refused: 422 with one
  issue per device, `code: "device-in-use"`, `path: "/devices"`, `message:
  "used by <show names>"`, and `devices: [{ id, shows: [names] }]`.
  Nothing is written. Disabling is never refused.

### 6.2 `GET /midi/ports`

`[{ "name": "<port>" }]`: the MIDI input ports the machine lists now, in
the system's order, without the ports PTAH itself created (its own virtual
inputs and the transport port). Under `--fake-io`: `[]`. An enumeration
failure is 200 `[]` with a `warn` log (the page says the list is empty).

### 6.3 `GET /offset-advice?renderRateHz=<n>`

For the venue the child is on (404 `no-venue` without one). `renderRateHz`
is optional (default: the file's).

```json
{ "venueId": "…", "venue": "Hilldale", "level": "estimated",
  "offsetMs": -53, "storedMs": -42,
  "universes": [
    { "universe": 1, "name": "Stage", "output": "usbpro", "totalMs": 53,
      "terms": [ { "what": "frame-wait", "ms": 11 },
                 { "what": "output-wait", "ms": 11 },
                 { "what": "output", "ms": 23 },
                 { "what": "fixtures", "ms": 8, "kind": "led" } ] } ] }
```

- `frame-wait`: half a frame period, `500 / renderRateHz` ms.
- `output-wait`: half the universe's output period, `500 / rateHz` ms,
  with the universe's own output rate (its `rateHz`, else the engine's
  default output rate), which is separate from the render rate.
- `output`: `usbpro` one full DMX frame, 23 ms; `artnet` and `sacn` 23 ms
  (the node's own DMX frame; a typical node); `none`: the universe is left
  out.
- `fixtures`: by the technology most patched fixtures of the universe
  have, from their type's `bulbType` (text match, case-insensitive): LED
  8 ms; halogen, tungsten or incandescent 60 ms; discharge, HMI, MSR or
  arc 20 ms; unknown or absent: LED. A universe without fixtures: LED.
- `totalMs` is the sum, rounded to the millisecond; `offsetMs` is minus
  the largest `totalMs`; no universe with an output: `offsetMs: null`,
  `universes: []`.

`storedMs` is the venue's `dawOffsetMs` (null when absent). `PUT
/offset-advice` `{ "ms": -53 }` stores it: the venue file is read,
`dawOffsetMs` set and the file written under the venue write lock, as a
venue `PUT` saves it (404 `no-venue`; 422 for a positive or non-integer
number); answer `{ "storedMs": -53 }`.

The page words the terms: `Waiting for the next frame (44 Hz)`,
`Waiting for the next send (44 Hz)`, `Enttec
USB Pro, one full frame` / `Art-Net node, one frame` / `sACN node, one
frame`, `Fixtures (LED)` / `(halogen)` / `(discharge)`.

The function that computes it lives in `ptah-model` (pure: venue, fixture
types, rate → advice), so Step 4 can swap terms for measured ones.

### 6.4 `GET /server` additions

- `settingsRevision`: the §6.1 revision of the file as the child read it
  at its start (null when it could not). The page compares it with the
  current revision: different means "Saved. Applies when PTAH restarts."
  Changes of only `uiPort`, `listen`, `openBrowser` or
  `resumeWithinSeconds` must not raise that state. The mechanism is the
  builder's choice: either this revision is computed over the
  restart-applied keys only, or `GET /server` carries the child's
  started-with values of those keys. The behaviour in §4.1 is what is
  fixed.
- `GET /devices` rows gain `lastMessageAgeMs`: engine time now minus
  `lastMessageAt`, in ms (null with it).
- `root`: the served root as an absolute path, the home directory shown as
  `~`.

### 6.5 Restart

`POST /restart {}` as it is. The page then waits for the live stream to
drop and come back (the shell's existing stale handling), reads `GET
/server`, `GET /settings` and `GET /devices` again, and toasts
`Restarted`. No answer within 20 s: the band says `PTAH did not come back.
Look at its terminal.` A child that was waiting for a show waits again
(exit 76); the page treats both the same.

### 6.6 Import

`POST /import-v1` as it is, plus: `from` may start with `~` (expanded to
the server user's home) and defaults to `~/.ptah` when absent. Each
summary gains what the dialog needs: `name` (the show's name), `rows` and
`programs` (counts), and, in a dry run, each planned file's state (`new`,
`changed` or `same`; a kept file such as an existing `settings.json` is
left out). Additive: the CLI's output keeps its fields.

## 7. Where the code goes

- `crates/ptah-model`: `offset_advice` (pure), the device-in-use lookup
  over shows, the settings lock in the store, the import summary's new
  fields.
- `crates/ptah-server`: `http/settings.rs` (the settings routes moved out
  of `files.rs`, revision, lock, device guard), `http/midi_ports.rs`,
  `http/offset.rs`, the `/server` additions; the lock used by the loader's
  and the other writers' settings writes.
- `crates/ptah-io`: a function listing input port names (the server calls
  it).
- `crates/ptah-engine`, `crates/ptah`: their settings writes take the
  lock; nothing else changes.
- `packages/ds/src/settings/`: `SettingsScreen` and its parts
  (`DeviceTable`, `OffsetAdvice`, `NetworkPanel`, `EngineFields`,
  `ImportDialog`, `RestartDialog`, `SettingsBand`, `SettingsPhone`), a pure
  `model/` (draft, changes by label, validation, which keys need what),
  stories and tests; entry `@ptah-app/ds/settings`.
- `apps/web/src/settings/`: `SettingsPage`, `useSettings` (read, draft,
  save, conflict), `useRestart`, `useDevicesNow`, `words.ts` (server
  refusals in plain words); the route, the tab, the palette entry.
- Docs: `docs/app.md`, `docs/api.md`, `docs/design-system.md`,
  `docs/file-layout.md` where they name `/settings`.
- No new dependency is expected. No schema change to `settings.json`.

## 8. Testing and exit

- Rust: revision ignores the engine-owned keys; a `PUT` keeps them; a
  stale `If-Match` is 409; two concurrent `PUT`s, one wins; a loader write
  between a page's read and its `PUT` neither conflicts nor is lost;
  device-in-use refusal (by id, in a trigger and in a source; `any` never
  counts); `offset_advice` cases (each output kind, mixed technologies, no
  output, no fixtures, the rate parameter, a universe's own output
  rate); storing the offset clears `offset-stale`; `/midi/ports` under fake I/O;
  `~` expansion and the default of the import.
- ds: the model (changes by label, which need a restart, validation), every
  band state as a story with a no-shift check across states, the device
  table's `Now` words, the dialogs; visual boards at 1280×800 and 390×844
  (well, draft, error, waiting for restart, restarting, conflict, import
  dialog, no venue, phone).
- web: the page state table of §4.1 as tests (save, save only, restart,
  no supervisor, conflict and `Keep mine`, a refused removal, the 20 s
  timeout).
- e2e against the real binary under `ptah supervise` with fake I/O: change
  frames per second, save and restart, the page comes back and `GET
  /status` reports the new rate; add a PTAH port, restart, `GET /devices`
  lists it; remove a device a fixture show uses, refused with the show's
  name; the phone width is read-only. The import e2e runs against a copy
  of the V1 fixtures in a temp directory, never `~/.ptah`.

Exit: the owner changes the clock master and the frames per second from
the page, restarts from the page, sees the offset for their venue, and
imports their V1 tree with `Look…` then `Bring in`, with no terminal and
no file edit. Owner check on the rig, listed in
`docs/ledgers/settings-owner-check.md`.

## 9. Left to the builder

- The polling or stream mechanism for `Now` (once a second is the bar).
- The canonical form the revision is computed over.
- The mechanism behind "waiting for a restart" (§6.4), within the fixed
  behaviour.
- The exact widths, the two-column split, the dialog layouts, within the
  tokens and the no-shift rule.
- How `Keep mine` re-applies the draft (per changed shown key).
- Upper bounds of the open-ended number fields (what the schema allows).

## 10. Calls made by the author (not the owner's decisions)

1. No separate Claude Design round: a form page from existing parts (told
   to the owner, not objected).
2. `uiPort` and `listen` apply the next time `ptah` is started, not on the
   page's restart, and the page says so. (I first told the owner the page
   would follow a port change after the restart; the parent fixes the port
   at its own start, and re-binding from a page is a way to lose the page
   at a venue. Changed, flagged.)
3. The offset is stored with the venue (the existing `dawOffsetMs`) only
   when the owner presses `I typed it into Reaper`: PTAH cannot know what
   Reaper is set to, so it stores what the owner confirms.
4. With several universes the headline offset is the slowest one's.
5. The fixture and node timing constants of §6.3 (LED 8 ms, halogen 60 ms,
   discharge 20 ms, a node 23 ms).
6. Removing a device a show uses is refused by the server at save;
   disabling is always allowed.
7. The engine-owned keys are kept by the server on every `PUT`, and the
   revision ignores them.
8. `Save only` exists in the restart question while the clock runs.
9. The import's `collapse` is on by default (the owner's own import used
   it) and the import is refused while a draft is unsaved.
10. A hardware device's name is its port name (no schema change); only
    PTAH's own ports have a free name.
11. Keys of later steps are neither shown nor touched.
12. The import does not add V1's MIDI port to an existing `settings.json`
    (as the command line behaves today).
13. The offset counts a wait for the output's next send, at the
    universe's own output rate.
