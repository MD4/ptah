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

## The look in numbers (ZENITHALL)

So this document stands without the canvas. The same values are in the ZENITHALL design system; if the two differ, ZENITHALL wins.

### Colours

| Token | Dark | Light | Stage | Used for |
|---|---|---|---|---|
| `ground` | `#0b1117` | `#dfe6e3` | `#000000` | Page background |
| `panel` | `#a9d6d0` at 8 % | `#3d5257` at 9 % | `#5f8f8a` at 10 % | Fill of a panel, row, tile |
| `band` | `#a9d6d0` at 16 % | `#3d5257` at 15 % | `#5f8f8a` at 14 % | Header band |
| `line` | `#a9d6d0` at 30 % | `#3d5257` at 31 % | `#5f8f8a` at 30 % | Separators, quiet outlines |
| `tint` | `#a9d6d0` | `#3d5257` | `#5f8f8a` | The one ink of a screen |
| `tint-dim` | `#7fa39f` | `#4f6468` | `#588580` | Small labels |
| `bright` | `#e9f4f2` | `#1c2a2d` | `#8fb5b0` | Logo, the big number, sentence text |
| `on-tint` | `#0b1117` | `#eef3f1` | `#000000` | Text on a tint fill |
| `sand` | `#e6c88f` | `#7d500c` | `#a88f4e` | Picked, or needs you |
| `sand-panel` | `#e6c88f` at 10 % | `#7d500c` at 10 % | `#a88f4e` at 12 % | The picked thing's panel |
| `sand-line` | `#e6c88f` at 40 % | `#7d500c` at 40 % | `#a88f4e` at 40 % | Separators in a sand panel |
| `on-sand` | `#0b1117` | `#f6efe2` | `#000000` | Text on a sand fill |
| `fault` | `#ff6b5e` | `#b3261e` | `#d9483c` | Wrong, fix it now |
| `on-fault` | `#0b1117` | `#ffffff` | `#000000` | Text on a fault fill |
| `stripe-1..4` | `#5fa8a3` `#d9c58a` `#d08a5a` `#8f84d6` | same, 2 is `#b8973a` | dimmed | The four-bar logo stripe only |

The tint is the same teal on every screen; "one tint per screen" means a screen never adds a second hue.

### Type

Chakra Petch (300 to 700), shipped as local font files like Inter is today. Capitals with wide spacing for names, labels and buttons; sentence case for anything read as a sentence.

| Style | Size / line | Weight | Spacing | Used for |
|---|---|---|---|---|
| `logo` | 26 / 32 | 300 | 0.30em | PTAH in the header |
| `screen-title` | 22 / 28 | 500 | 0.08em | The show, venue or program name under the header |
| `panel-title` | 17 / 24 | 400 | 0.14em | Title of a panel |
| `row` | 14 / 20 | 500 | 0.08em | Names in rows, tiles, navigation |
| `chip` | 12 / 16 | 600 | 0.12em | Buttons, chips, badges |
| `label` | 11 / 14 | 500 | 0.14em | Small labels, column heads, hint line. The floor. |
| `value` | 20 / 24 | 500 | 0.04em | The value under a label |
| `body` | 13 to 14 / 19 to 22 | 400 | none | Sentences: dialogs, tooltips |
| `number-xl` | 124 / 124 | 600 | -0.01em | The bar and beat on Live |
| `number-md` | 26 / 30 | 300 (Jost) | none | Readouts beside a control |

Every number that changes while you watch uses tabular figures, so nothing shifts.

### Space, size, shape

- Spacing steps: 4, 8, 12, 16, 24 px. Page margin 24 px (16 px on a phone). Gap between panels 14 px.
- Header band 52 px. Rows 36 to 38 px. Toolbar buttons 30 px. Chips 24 px. Anything pressed with a thumb at least 44 px.
- Everything is square. A panel has no outline: a `panel` fill, 12 px top and 16 px side padding, one cut corner of 16 px at the top right, and a 2 px `tint` rule under its title.
- Picked: `sand` fill, four corner brackets 7 to 8 px long and 2 px thick, 4 px outside the thing. Rows and tiles sit 6 px apart so the brackets never touch a neighbour.
- A row has a 4 px stripe on its left edge: `tint`, or `sand` when it needs you, or `fault`.
- Hatching: diagonal stripes in `line`, 10 px wide at about 115 degrees for large areas; 5 px at 45 degrees for a small block such as an empty slot. Its label sits on a `ground` plate.
- Tooltip and dialog: a `ground` box, 1 px `tint` outline, title in `chip`, text in `body`.
- Stage theme: every filled control becomes an outline in the same colour.

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

## The app shell (inventory section 1)

| Today | New home |
|---|---|
| Strip: PTAH mark, seven tabs, Stage toggle, ⌘K hint | Header band: logo, four places, Inspect and Settings, the look switch, the status. The ⌘K hint moves to the bottom-right key hints of each screen. |
| Stage toggle, F2, remembered | The three-way look switch; F2 as decided below; remembered. A saved "normal" reads as dark. |
| Under 600 px: only the mark and a "Commands ⌘K" button | Unchanged: the phone header is the logo and "Commands". |
| Unknown path: "Not yet." with "Back to Perform" | An empty state on the page, with the same words and a button to Live. |
| Back / Forward go through each page's leave guard | Unchanged. |
| No global status; each page shows its own | The header status is drawn on the boards. It is on the filed list; the plan treats it as optional and last. |

## Homes for the items the first tables missed

Found by the builder check. Each keeps today's behaviour unless said.

- **Live.** The checklist still opens over the board with C, as a dialog. The full / column layout choice stays, in the command box, with the same 1024 px rule. "Device N names, checked every second" goes in the title line of the MIDI panel. Command failures are toasts.
- **Show.** The notice line sits under the bar, as on every screen. "Not on any group" is a last entry in the Groups panel, in sand. The fault count keeps "not checked" and opens the issue list, whose venue warnings link to that venue's Patch. Arrow keys still move around the grid. The latching-row audition message shows in the "also starts" line. Below 900 px: the read-only view on the phone board, and the note strip in two rows.
- **Effects.** "No programs yet" is the empty state of a show's panel. The program list goes narrow below 900 px as today. "This program could not be read" is a notice line with "← Programs". "Preview unavailable: nodes cannot be added" shows in the add box. Save toasts as on every screen.
- **Lights.** The picked fixture's panel holds Name, Type, Mode, Universe, Address, Ch (read-only), Groups (read-only), Flash, Duplicate and Delete with its patch confirm. `?q=` and `?f=` on the Library, `/library/new`, "This type no longer exists" and "Used in" hiding below 1100 px are unchanged. The Library phone list is as today.
- **Inspect.** The URL state (`?show`, `?unheard`, `?light`, `?at`) and the light pick shared with other screens are unchanged. `[` and `]` are in the key hints. Below 1080 px of its own width it is one column, as today; that is the layout shown on the phone board.

## Calls I made (the owner can overrule any of them)

- **"Notes as"** changes every place a note number is shown (chips, the chain, the note strip's readout, Inspect's messages). Typing accepts both forms, as today. The choice is kept per browser, like the layout choice on Live, and is shared by Show and Inspect.
- **Layer 1 of ZENITHALL is not a new package yet.** It stays inside `packages/ds`, with the general pieces and the PTAH pieces in separate folders so they can be split out when IHY adopts it. IHY is the owner's other app (musicians set their in-ear mix from a phone); it is not touched here.
- **Chakra Petch replaces the monospace face too**, with tabular figures. If the font's tabular figures prove unsteady, numbers keep a fixed-width box.
- **The states listed under "Still to draw"** are drawn during the build, and each screen's task ends with the owner looking at it before it is called done.
- **Rig shows one universe at a time.** If the picked fixture is on another universe, picking it switches the strip to that universe.

## Checked against the code

- The canvas uses React Flow (`@xyflow/react` 12.12.0). Today's wire calls its curved-path helper in `packages/ds/src/builder/Wire.tsx`; the same library provides the right-angle one. The credit mark is already shown and stays.
- The stage setting is a browser preference (`ptah.ds.mode`), applied as an attribute on the page; colours exist per mode with contrast checks per mode. The light theme is a third set with its own checks.
- Which settings need a restart is already in the code (`packages/ds/src/settings/model/changes.ts`): the MIDI devices, the transport port and all six Engine fields need a restart; the two network fields apply at the next start; the two "When PTAH starts" fields apply at once.
- Fonts already ship as local files (`packages/ds/src/fonts`); Chakra Petch follows the same pattern and adds no dependency.
- There are 369 visual-test reference images and about 280 label or role lookups across 11 end-to-end test files, plus routes used in tests. They change with the look, the header names and the addresses.

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

## Open questions for the owner

1. **F2 with three looks.** Proposed: F2 switches Stage on and off, returning to whichever of Dark or Light was in use.
2. **Addresses.** Proposed: they follow the new names (`/lights`, `/effects`, `/show`, `/live`, `/inspect`, `/settings`), and the old ones keep working by redirecting.

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
