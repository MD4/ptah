# PTAH V2 redesign: design (in progress)

Date started: 2026-11-19. Status: **brainstorm in progress**, written as decisions land. Not yet approved as a whole.

- Inventory of today's features: `2026-11-19-v2-redesign-inventory.md` (the checklist this design is held to).
- Design canvas (private): https://claude.ai/artifact/SShuCa7fFt43MLWB5tU8s7
- Design system (private): https://claude.ai/artifact/VKt1djBsbmPwqkvuPCs8GF

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

Every line of the inventory must appear here with its home on the new screen. "—" in the right column is a gap to close before this design is approved.

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

### Lights, Effects, Inspect, Settings

Not designed yet. The H boards for Effects, Inspect and Lights are look references with placeholder content.

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

- Fault (red) states on every place; the restart sequence on Live.
- Menus and dialogs (save, conflict, leave, add fixtures, add program, merge groups, value ranges, show picker).
- "On the rig" and "From the show" switched on in Effects.
- Phone and narrow views; navigation and the look switch on a phone.
- The light and stage themes on a real screen.
- Mapping tables for Effects, Lights, Inspect and Settings.

## Filed for later review

- A global status mark in the header on every screen (drawn on the boards; today each page shows its own faults).
- Navigation on a phone.
- Hand control of master level and house lights.
- Starter programs to copy from.
- A link from a problem to its moment in Look back.
