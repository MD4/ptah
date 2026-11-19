# PTAH V2 redesign: design (in progress)

Date started: 2026-11-19. Status: **brainstorm in progress**, written as decisions land. Not yet approved as a whole.

- Inventory of today's features: `2026-11-19-v2-redesign-inventory.md` (the checklist this design is held to).
- Design canvas (private): https://claude.ai/artifact/SShuCa7fFt43MLWB5tU8s7
- Design system (private): https://claude.ai/artifact/VKt1djBsbmPwqkvuPCs8GF

## Intent

The owner finds today's app harsh, too complicated and unclear. Non-technical people must be able to use it, including the complex parts. The redesign covers exactly today's features, no less and no more; ideas for new features are filed (section 6), not built.

## Decisions so far (owner-approved)

1. **Organisation.** Four places in the order you use them: Lights (Venue + Library) → Effects (Builder) → Show → Live (Perform). Inspect (Debug) and Settings are set apart. *Open: whether the navigation uses these names or today's.*
2. **Look: "H".** Filled colour panels with one cut corner and a heavy rule under the title; one teal tint per screen; sand for "picked" or "needs you"; red only for faults; hatching for "not available"; corner brackets on the picked thing; rows with a coloured edge; `!` badges; stat grids; one hint line per screen. Header band with the PTAH logo and navigation with icon and word. Type: Chakra Petch; the one big number of a screen is heavy.
3. **Three themes:** dark (default), light, stage. Stage turns fills into outlines.
4. **Wording: keep today's.** Labels are not renamed. Explanations go in tooltips (dotted underline on the word) and in the one hint line.
5. **Nothing shifts.** Picking a thing changes colour and adds brackets; it never changes spacing. The reference spacing is the group tile on the Show board (6px gap, brackets 4px out).
6. **Two-layer design system.** Layer 1 is general and also serves IHY (phone first, faders, meters, one personal colour per musician). Layer 2 is per app.
7. **Live:** the bar reads `049.2` (bar and beat in one number, beat part in sand), panel not ring.
8. **Show:** row details are a panel on the right while a row is picked; the readout is a chain of three linked blocks (note with its letter name in a box → program → light) with an "also starts" line; a "Notes as numbers | letters" switch (new, owner's request); the details panel keeps every section visible.

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

- Light theme.
- "Notes as numbers | letters" switch on Show.

## Filed for later review

- A global status mark in the header on every screen.
- Navigation on a phone.
- Hand control of master level and house lights.
