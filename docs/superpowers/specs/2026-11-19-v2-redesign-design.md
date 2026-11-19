# PTAH V2 redesign: design (in progress)

Date started: 2026-11-19. Status: **all six places designed and reviewed with the owner; awaiting approval of this document as a whole.**

- Inventory of today's features: `2026-11-19-v2-redesign-inventory.md` (the checklist this design is held to).
- Design canvas (private): https://claude.ai/artifact/SShuCa7fFt43MLWB5tU8s7
- Design system, named **ZENITHALL** (private): https://claude.ai/artifact/VKt1djBsbmPwqkvuPCs8GF

## Intent

The owner finds today's app harsh, too complicated and unclear. Non-technical people must be able to use it, including the complex parts. The redesign covers exactly today's features, no less and no more; ideas for new features are filed (section 6), not built.

## Decisions so far (owner-approved)

### Across the app
1. **Organisation and names.** Four places in the order you use them, with these names in the header: **Lights** (today's Venue and Library) → **Effects** (Builder) → **Show** → **Live** (Perform). **Inspect** (Debug) and **Settings** are set apart on the right. Inside the screens, today's wording is kept (rule 4).
2. **Look: "H".** Filled colour panels with one cut corner and a heavy rule under the title; one teal tint per screen; sand for "picked" or "needs you"; red only for faults; hatching for "not available"; corner brackets on the picked thing; rows with a coloured edge; `!` badges; stat grids; one hint line per screen. Type: Chakra Petch; the one big number of a screen is heavy.
3. **Header.** A band with the PTAH logo, the four places (number, icon, word), then Inspect and Settings, then a **Dark | Light | Stage** switch, then the status. The Lights icon is a light with rays and a round centre. The look switch replaces today's "Stage" toggle and applies at once (it is not a Settings field).
4. **Wording: keep today's.** Labels are not renamed. Explanation goes in tooltips (a dotted underline marks a word that has one; the tooltip is a dark box with the word as title and sentence-case text) and in the one hint line.
5. **Nothing shifts.** Picking a thing changes colour and adds brackets; it never changes spacing. Reference spacing: the group tile on Show (6px gap, brackets 4px out). A badge sits above a bracket, never under it.
6. **Pick a thing, see it on the right.** The picked row, node, fixture or light opens a sand panel on the right of its screen.
7. **Small pieces.** The drag handle is six square dots. A small hatched block (an empty slot) uses 45° stripes, no border, label centred. Keys that already exist are shown at the bottom right as a word and a key cap.
8. **Three themes:** dark (default), light, stage. Stage turns fills into outlines.
9. **Two-layer design system.** Layer 1 is general and also serves IHY; layer 2 is per app.

### Live
- Two faces: the checklist before a show, the board while it plays; a one-column phone board.
- The bar reads `049.2`: bar and beat in one heavy number, the beat part in sand; four beat ticks under it.
- "Fixtures and dimmer" stays as named level bars. The Emergency panel is sand.

### Show
- Row details are the sand panel on the right. Its three choices (Plays, Notes hold, When it stops) are lists with a filled square on the chosen one; every section stays visible.
- The readout is a chain of three linked blocks: note (piano-roll icon, channel, letter name in a box) → program → light, with an "Also starts" line under it.
- A "Notes as numbers | letters" switch (new).

### Effects
- Square, right-angle wires. Three kinds of node: sources (outlined title), shaping and maths (filled title), outputs (double frame).
- The picked node's panel takes its space from the canvas (owner's choice over floating). It names what feeds each wired input.
- The bottom panels (Test, Preview, On the rig with From the show) can be minimised to a bar and opened again from the same spot on the right; the choice is remembered. The bar keeps Hold, Loop, the program's settings as small value bars, the preview swatches and the two switches.
- The add-node box shows, for each node, a small curve, its name, one sentence and its family. Node titles have tooltips. The preview readout is spelled out (Pan, Tilt, Zoom, Focus, Intensity). An empty program shows a hatched block with "Type a letter to add a node".
- Programs can be viewed as a list or as dense tiles (six across, actions under `···`), with a switch.

### Lights
- Three tabs: Rig and Patch (this venue), then Library set apart.
- Rig: the universes are a strip that also switches which universe is shown; then the channel map; then the fixtures list (name, type, address, Flash) with the picked fixture's sand panel.
- Patch: one Save per tab (the top-right button reads "Save patch"; if the rig is unsaved it must read "Save" and save the rig). An empty slot is hatched; a group that needs a fixture is sand with a `!`.
- The hint line says what each tab is for.

### Inspect
- Three columns: Coming in; Problems (first), Playing now, Overrides, Timing; Going out with the why panel under it.
- The channel grid stays. Every cell is the same square; a light is a thin line tight around its cells, with no fill; the picked light has a doubled sand line and its name on a tag. A "Find a light" control picks by name (new).
- The "Notes as" choice applies here too. Pause has a tooltip saying it pauses the page only.

### Settings
- Reaper offset first, as three steps. Engine folded by default, showing a `!` when a field inside has changed. Fields that need a restart carry a small label.

## Feature mapping

Every line of the inventory must appear here with its home on the new screen. "—" in the last column means the item has a home but is not drawn yet; see "Still to draw".

### Live (inventory section 2)

| Today | New home | Drawn |
|---|---|---|
| Checklist band "Ready to load / Not ready — N waiting" | Band at the top of the Checklist panel | yes |
| Eight checklist rows (label, word, reason) | Rows in the Checklist panel; tick, sand `!`, or red × | yes (red not drawn) |
| Phone QR / "local only" | Phone panel | yes ("local only" not drawn) |
| "Load show" [L] | Large button in the Show panel | yes |
| Show picker dialog (show, venue, Load / Restart with, states, toasts) | Dialog | — |
| Status band and its 11 states | Band across the top of the board | "All well" only |
| Words: Clock, Outputs, BPM | Right end of the status band | yes |
| Song, name, bar, beat ticks | Song panel | yes |
| Restart steps (Link lost → Reconnecting → …) in place of the ticks | Song panel | — |
| Active programs (3 rows, chip, name, group, + N more) | Active programs panel | yes ("+ N more" not drawn) |
| MIDI: devices, last in, unmapped | Title line of the MIDI panel | yes |
| DMX per universe with tiles and state | DMX panel | yes ("not sending", "holding" not drawn) |
| Latency p99: Render, Output lag, End to end | Latency panel, with sparklines | yes |
| Emergency: Restart engine, Reload show, Blackout, Freeze; holds | Emergency panel (sand) | yes (disabled states not drawn) |
| Transport: Start, Stop (hold), Go to start; "no transport" | Under the bar in the Song panel | yes ("no transport" not drawn) |
| Keys C, M, L, F2, ⌘K | Hint line | yes |
| Mark toasts | Toast | — |
| Palette "Perform commands" | Command palette | — |
| Full layout: show name, songs count | Status band | yes ("previewing" mark not drawn) |
| Faults list (active first, cleared stay) | Faults panel | empty state only |
| Last inputs table | MIDI panel | yes |
| Device names, "checked every second" | — | — |
| Fixtures and dimmer level meters | Fixtures and dimmer panel | yes |
| "Full / column layout" override | — | — |
| Narrow / phone column | Phone board | yes |

### Show (inventory section 6)

| Today | New home | Drawn |
|---|---|---|
| Name, "playing" mark, Shows ▾, channel, fault count, Undo, Redo, Save | Bar under the header | yes ("playing" not drawn; Shows menu content not drawn) |
| Notice line (saved not applied, could not be pruned, could not be read) | — | — |
| Groups column (name, size, needs, parts, rows, issue icon), + Add group | Groups panel | yes (issue icon, parts not drawn) |
| "Not on any group" | — | — |
| Group line (name, size, needs, parts per light), menu Merge / Delete | Title line of the grid panel, `···` | yes (menu not drawn) |
| Grid headers, light names editable | Grid | yes |
| Row head: name, "scene", dim chips for undrawable triggers and stray notes | Row head | name only |
| Row menu (Details, Duplicate onto, Move, Disable, Delete) | `···` in the row head | not opened |
| Cells, chips, ranges, "+N", "all together", "spread" | Grid cells | yes (ranges, "+N", "spread" not drawn) |
| Adding a note, chip keys, hold to audition, refusals | Cells; hint line "Hold a note to play it" | hint only |
| Faders column | Grid | yes |
| "+ Add program" | Under the rows | yes |
| Readout: note, name, channel, "also starts", issues, refusals | Chain of three blocks plus an "also starts" line | yes (issues, refusals not drawn) |
| Note strip (128 notes; free, used, this group; hover) | Bottom of the grid panel, with a legend | yes |
| Row details (Name, Program, Plays, Notes hold, When it stops, Faders, Outputs, refusal, close) | Sand panel on the right | yes (refusal line not drawn) |
| Dialogs (no show, new show, add program, merge, channel change, delete, apply, conflict, leave) | Dialogs | — |
| Palette, ⌘Z / ⇧⌘Z | Hint line and command palette | keys only |
| Under 900 px read-only view | — | — |

### Effects (inventory section 5)

| Today | New home | Drawn |
|---|---|---|
| Program list: one section per show, the playing one first and marked | Programs screen, one panel per show | yes |
| Each line: curve picture, name, "used by N rows", node count and settings | A row (list view) or a tile (tiles view) | yes |
| Duplicate, Copy to…, Delete | On each row; behind `···` on a tile | yes (menu not opened) |
| Refusal slot per line (used by, played inside, id clash, server errors) | A line under the row or tile, in `fault` | — |
| Delete confirm | Dialog (cannot be undone) | shared piece |
| New program | In each show's title line (list); a dashed tile (tiles) | yes |
| Loading, "could not be read … Retry" | Notice line | shared piece |
| Editor header: ← Programs, name, "on the rig" mark, show, "used by", fault count, Undo, Redo, Tidy, Save | Bar under the header | yes (issue list not opened) |
| Name refusals ("a program needs a name"…) | Under the name, in `fault` | — |
| Line under the header: canvas refusals and notices | Notice line | shared piece |
| Canvas: pan, zoom, dot grid, Fit | Canvas | yes |
| Node box: title, values, ports, live curve, colour swatch, "—" | Node (three kinds) | yes (colour swatch not drawn) |
| Errors and warnings marked on nodes and wires | Node and wire in `fault` or sand | — |
| Wires by dragging; valid inputs light up; refused wire says why; drop on empty canvas opens the add box | Canvas, square wires | wires only |
| Sticky notes | Canvas | yes |
| Add box (type a letter; name and family; "no node matches") | Add box, with curve and one sentence per node | yes ("no node matches" not drawn) |
| Canvas keys (multi-select, move, delete, W to wire, copy, cut, paste, duplicate, Tab) | Unchanged; the common ones in the hint line | partly |
| Inspector: a control per field; read-only kinds; refusals; "none yet"; several nodes picked | Sand panel on the right | one node only |
| All node kinds (inputs, shape, math, outputs, other) | Node; each needs its tooltip sentence | six kinds drawn |
| Test: Hold, Loop, Beats, Tempo, Velocity, Plays like, On stop | Test panel | yes |
| Settings: slider each, `…` editor, Add a setting | Test panel; value bars in the minimised bar | yes (editor not opened) |
| "the show drives" dimming | Test panel | yes |
| Preview: mode, lights, swatches, readout, pick a light by swatch, "preview unavailable" | Preview panel, readout spelled out | yes ("unavailable" not drawn) |
| On the rig: toggle, row picker, reasons it cannot turn on, reasons it ended, "previewing without", live DMX list | On the rig panel | on state drawn; ended reasons not drawn |
| From the show: toggle, off reasons, status line, messages, row and light pickers, footnote | Its switch in the On the rig panel; details in Preview | on state drawn; messages not drawn |
| Impact dialog, "breaks other programs", apply to the running show, conflict, leave | Dialogs | shared pieces |
| Palette (Builder) | Command box, plus Minimise / Open the panels | shared piece |
| Phone view (read-only graph, settings list) | Phone board | yes |

### Lights (inventory sections 3 and 4)

| Today | New home | Drawn |
|---|---|---|
| Venue name, "in use", Venues menu (open, new, duplicate, delete) | Bar under the header | yes (menu not opened) |
| Fault count, Undo, Redo, Save and its tooltip | Bar under the header | yes, with the overlap state |
| "saved, not applied", the save note | Notice line | shared piece |
| Tabs Rig and Patch, with the patch warning count | Tabs Rig, Patch; Library set apart | yes (count not drawn) |
| Universes table: name, number, output, target, rate, used, state, remove, add | Universe strip; the full table behind "Edit" | strip only; the editor not drawn |
| Channel map per universe: blocks, overlaps, drag, arrows, select, readout | Channel map, one universe at a time, switched from the strip | yes |
| Fixtures table: name, type, mode, universe, address, ch, groups, Flash, duplicate, delete | List (name, type, address, Flash) plus the picked fixture's sand panel | yes |
| Add fixtures dialog | Dialog | — |
| Type picker (own types, bundled, import, simplified warning, New type, Open the Library) | In the fixture's panel, on Type | — |
| Flash: hold; off reasons; toasts | On each row and in the panel; hint line | yes (reasons not drawn) |
| Patch bar: Patch for, Patch another show, Propose, Save patch, Revert | Patch panel; Save patch is the top-right button | yes |
| Patch rows: group, filled/wanted, slots, changed marks, slot menu, tuple slots, status, fallback | Patch rows | yes (changed marks, tuples, fallback not drawn) |
| "Not used by this show" | Under the rows | yes |
| "Save the rig to patch it" (patch locked) | Notice line; the top-right button reads Save | — |
| Shortcuts and Venue palette | Hint line and command box | keys only |
| States: no venue, could not be read, read faults, apply to the running show, conflict, leave, patch saving | Empty state, notice line, dialogs | shared pieces |
| Validation: shared channels, past 512, unknown type, mode, universe | Red on the map and the row; Save tooltip | overlap only |
| Phone view (read-only lists, large Flash) | Phone board | yes |
| Library list: search, filters with counts, New type, table, actions per row, "no type matches", footer, read faults | Library tab | yes ("no type matches" not drawn) |
| Type header: back, name, maker, mine/bundled, used in, fault count, Undo, Redo, Duplicate, Save or Import | Bar under the header; "used in" in the panel title | yes |
| Conversion line (clean / simplified with reasons) | By the mode tabs, with a tooltip | "clean" only |
| Modes: tabs, add, name, duplicate, remove, fault line | Above the channel table | yes |
| Channel table: handle, name, role, fine of, default, inverted, value ranges, row menu, add | Channel table | yes |
| Value ranges dialog | Dialog | — |
| Paste a channel list, replace question | Under the table; dialog | box only |
| Lint messages | In the row, in `fault`; fault count | — |
| Bundled entry (read-only, Import) | Same screen without controls | — |
| Save flow: "saving changes venues", blocked cases, conflict, duplicate with changes, leave, missing type | Dialogs | shared pieces |
| Library phone views | Phone board | Lights only |

### Inspect (inventory section 7, Debug)

| Today | New home | Drawn |
|---|---|---|
| Live / Look back switch | Left of the bar | yes |
| Chips: notes, CC, other, only what nothing listens to | Bar | yes |
| "Paused at bar…", show and venue, Pause | Right of the bar | yes (paused state not drawn) |
| Coming in: device lines, clock line | Top of the Coming in panel | yes |
| Messages table with the rows that listen; "nothing listens"; gap line on resume | Coming in panel | yes (gap line not drawn) |
| Playing now: rows with age, ended rows dim, footnote, "no show is playing", "not available on a replay" | Playing now panel | yes (two states not drawn) |
| Overrides: Master, Blackout, Freeze, House lights | Overrides panel, two by two | yes |
| Problems: code, subject, age; "engine restarting"; "no data" | Problems panel, first in its column | empty state only |
| Going out: per universe name, output, state, frames/s | Line above the grid | one universe |
| 512-cell grid with hover readout; "no venue yet" | Channel grid, lights grouped; readout under it | yes ("no venue" not drawn) |
| Timing table (usual, worst, dropped with breakdown) | Timing panel | yes (breakdown not drawn) |
| Why panel: hint, select and clear, head, rows with writers and reasons, override lines, channel lines, footers, other states, dimming, toast | Sand panel under the grid | main state only |
| Pause holds every column | Unchanged | — |
| Look back bar: previous, next, Play, Mark now | Right of the bar | yes |
| Header line and legend | Title line of the timeline panel | yes |
| Session strip and zoom strip, cursor, keys | Timeline panel | yes |
| Came in, Was playing, Overrides, Problems then, Went out | Three columns under the timeline | yes |
| "nothing recorded here", "the recorder is off", read toasts | Empty state, notice line, toast | — |
| One column below 1080 px | Phone board | yes |

### Settings (inventory section 7)

| Today | New home | Drawn |
|---|---|---|
| Band: changes, labels, Discard, Save / Save and restart, saved states, restarting, changed elsewhere, did not come back, validation error | Bar under the header | one state |
| Restart question (clock running) | Dialog | shared piece |
| MIDI inputs table, row menu, Add a device, Reaper transport port and its status | MIDI inputs panel | yes (menus not opened) |
| Reaper offset: the advice, measure line, venue, where to type it, breakdown, set / not set, "I typed it into Reaper", no-venue and no-output cases | Reaper offset panel, first, as three steps | yes (two cases not drawn) |
| On the network: toggle, port, "applies next time", address, QR | On the network panel | yes |
| When PTAH starts: open the browser, resume after a crash | When PTAH starts panel | yes |
| Engine: six fields, Back to defaults | Engine panel, folded by default | folded only |
| About | About panel | yes |
| Errors, read failures, leave guard | In the field in `fault`; notice line; dialog | — |
| Settings palette | Command box | shared piece |
| Two columns, one when narrower; read-only phone view | Phone board | yes |

## Constraints for the build

- Fonts ship inside the app (no network on stage).
- Tokens-only styling stays; the tokens and `docs/design-system.md` are rewritten for the new system.
- All visual-test baselines are regenerated.
- The logic layer (models, hooks, engine, server) is not touched.
- Merging Venue and Library into one place changes routes; tests that navigate follow.

## New things (not re-skins)

- Light theme, and the three-way look switch in the header.
- "Notes as numbers | letters" (Show, Inspect).
- Minimising the bottom panels in Effects, with the settings in the minimised bar.
- Programs as tiles, with the list / tiles switch.
- "Find a light" on Inspect.
- The universe strip on Rig doubling as a universe switch (today: one map per universe, stacked).

## To verify before the build

- Which Settings fields need a restart.
- That today's canvas library (React Flow) draws right-angle wires as expected; its credit mark must stay on the canvas.
- Where the "Notes as" and view choices are stored.

## Still to draw

Nothing here blocks the plan; each item reuses a piece that exists. They are drawn as the screens are built, checked against Storybook.

- Refusal and validation lines under a field or a row (one pattern: a line in `fault`).
- Opened menus and the remaining dialogs (add fixtures, value ranges, the settings editor, add program, merge groups, show picker): the shared Menu and Dialog.
- The universe editor behind "Edit" on Rig, with the Art-Net target fields.
- Empty and missing states ("no venue yet", "no show is playing", "nothing recorded here", "preview unavailable"): the shared empty state.
- Several nodes picked; error marks on nodes and wires; the colour swatch on a colour output.
- The paused state and several universes on Inspect; the why panel's other states.
- The Engine panel opened; the other states of the Settings band.
- The light and stage themes on the screens other than Live.

## Filed for later review

- A global status mark in the header on every screen (drawn on the boards; today each page shows its own faults).
- Navigation on a phone.
- Hand control of master level and house lights.
- Starter programs to copy from.
- A link from a problem to its moment in Look back.
