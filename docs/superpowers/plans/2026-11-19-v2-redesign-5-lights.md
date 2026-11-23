# Redesign 5 of 7: Lights — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Lights place (today's Venue and Library) its ZENITHALL screens: Rig, Patch and Library as three tabs, with the universe strip, the channel map, the fixtures list with the picked fixture's sand panel, the patch rows, the Library list and the fixture type editor.

**Architecture:** Every piece of today's Venue and Library screens in `packages/ds/src/venue` and `packages/ds/src/library` is restyled in place with the same data, roles and words. The venue and type models, the drafts, the save, apply and conflict flows, the patch logic and the flash (`venue/model/*`, `library/model/*`, `apps/web/src/venue/*.ts`, `apps/web/src/library/*.ts`) are not changed. Two things move: the universes table goes behind an "Edit" button and a strip stands in its place; a fixture's fields move from its table row to a sand panel on the right.

**Tech Stack:** TypeScript, React, CSS modules with tokens only, Vitest, Storybook, Playwright (visual and e2e), Biome.

**Spec:** `~/projects/ptah/docs/superpowers/specs/2026-11-19-v2-redesign-design.md` (sections "Lights", "Across the app", "The look in numbers", the Lights feature table, "Homes for the items the first tables missed", "Calls I made"). Inventory: `2026-11-19-v2-redesign-inventory.md`, sections 3 and 4. Code: `~/projects/ptah-v2`, branch `redesign-lights` from `master`.

**Boards (the drawings to match):** in `~/projects/ptah/docs/superpowers/specs/2026-11-19-v2-redesign-boards/png/`. Open them with the Read tool before styling.

| Board | Shows |
|---|---|
| `O-Lights-Rig.png` | Rig: the tabs, the bar, the universe strip, the channel map, the fixtures list, a fixture picked |
| `V-Lights-Overlap.png` | Rig with two fixtures sharing channels |
| `O-Lights-Patch.png` | Patch, with an empty slot and the Propose tooltip |
| `O-Lights-Library.png` | The Library list |
| `O-Lights-Type.png` | The fixture type editor |
| `T-03-venue-rig.png`, `T-04-venue-patch.png`, `T-05-library-list.png`, `T-06-library-type.png` | Today's screens, for what must still be there |
| `X-Phones.png` | The phone view |

Markup: `…-boards/html/<name>.dc.html`. Where a board and this plan differ, this plan wins; where a board's words differ from the code's, the code's words win.

**What plans 2 to 4 set, to follow here:** `packages/ds/src/show/` and `packages/ds/src/builder/` for the patterns: a `Panel` per region with `level`; a right column for the picked thing that is always there at 1180 px and wider (a hatched block when nothing is picked) and lays over the main panel from 900 to 1179 px, with the main panel scrollable from under it; `Digits` for changing numbers; `useWholeWhenCut` with `Tooltip disabled` for cut text; `Explain` for a word with a tooltip; `Choice` for one-click choices; one fixed 24 px line under the bar for the notice or a refusal (a refusal ends at the next action; a fault never waits behind a sand notice), given as `{ tone, text, action? }`; `HintLine`; `Dialog tone="danger"` with `<Button confirm>` for a delete; a thin always-visible scrollbar on a panel that scrolls; Storybook plays for anything measured; light and stage stories beside each story. From `packages/ds`, visual boards are regenerated with `pnpm update:visual --only <name>` (the `--` form fails; `--only` matches by prefix).

## Global Constraints

- Exactly today's features, no less, no more, plus what the spec lists under "New things" for Lights: the universe strip doubling as a universe switch.
- Inside the screens, today's wording is kept: every label, word, fault, refusal, off-reason, toast, dialog text and command title stays as it is in the code. The only new words are the ones this plan lists (the three hint lines, the tooltip sentences, "Edit" on the strip, "N on <universe>").
- Nothing shifts: picking a fixture, a block, a universe, a channel row or a slot, a fault, a look change or a value change never moves or resizes anything.
- Calm when well, loud only when wrong: `fault` appears only for a fault.
- Tokens-only styling. Gaps use `--gap-panel` and `--gap-row`; line heights use `--lh-*`. On a sand fill, text uses only `--on-sand`; on a `--sand-panel`, `--sand`. Biome only.
- The logic is not touched: no change to the existing functions of `packages/ds/src/venue/model/*` and `packages/ds/src/library/model/*`, to `apps/web/src/venue/{useVenue,usePatch,save,derive}.ts`, `apps/web/src/library/{useType,saveType}.ts`, the server or the engine. New pure functions and new files may be added beside them.
- Story ids keep their names (`venue-rig--…`, `venue-patch--…`, `library-list--…`, `library-type--…`); stories for the light look are added beside the existing ones.
- No new dependency. Never start V1 services or pm2; never touch `~/.ptah` or `~/ptah-home`; leave the untracked `docs/design/brief/` and `.ignore` alone; the Storybook servers on 6006–6008 stay up; no push unless the owner asks.
- Disk (AGENTS.md): `df -h /System/Volumes/Data | tail -1` before a heavy run; below 30 GB free, clean first and tell the owner. No extra worktree.
- At most three agents at once. A design-system task runs the visual gate for its own boards, then `pnpm -F @ptah-app/ds test:visual` must pass; the full gate runs at the checkpoint. Do not run the ds tests side by side with the web tests (the ds build test removes `dist/`).
- Every task that changes how something looks ends with the owner looking at its Storybook stories before the task is closed.

## Decisions this plan makes

- **Three tabs, on every Lights screen.** At the left of the bar: `Rig`, `Patch`, then a thin rule, then `Library` with its icon. They are links: Rig and Patch go to the venue in view (from the Library: the venue `/lights` opens, as today); Library goes to `/lights/library`. The current one is filled. Patch carries its count of patch warnings as today. The "Library" button plan 1 put on the venue screen goes; the tabs replace it.

- **The venue bar** (Rig and Patch). After the tabs: the venue's name, edited in place, in `screen-title`; "Venues ▾" (open another, New venue, Duplicate venue, Delete venue with its danger confirm); the "in use" mark. Right: the fault count, Undo, Redo, and the primary button (below). Under it the fixed 24 px line for the notice ("saved, not applied: …", the save note, read faults with Retry) or a refusal.

- **Rig at 1180 px and wider**, top to bottom:

  | Region | Holds |
  |---|---|
  | Universe strip (36 px) | "Universes" as a label; one tile per universe: name, "Universe N", its output and target in short, "n / 512", and its state when the venue is in use. Right: "Edit ▾" and "Add universe". |
  | Channel map panel | Titled with the shown universe's name; at the right of the title, the readout of the block pointed at or picked ("back par 2 · 11–14", today's words), then "Universe N · output". The 8 × 64 grid. |
  | Fixtures panel (left) and the picked fixture's panel (right, 330 px) | The list; the sand panel, or a hatched block labelled "Fixture" when none is picked |
  | Hint line | |

  The map takes its natural height; the fixtures row takes the rest and the list scrolls inside its panel.

- **The universe strip also picks the universe shown.** A click on a tile shows that universe in the map and in the fixtures list. The shown tile is filled, with brackets. Picking a fixture or a block that is on another universe switches the strip to it. A universe with a fault has a `fault` stripe; "lost" and "late" are in `fault`, "not sent" in `sand`. With more universes than fit, the tiles scroll sideways inside the strip; "Edit" and "Add universe" never leave it.

- **"Edit ▾" opens the universes table as it is today** in a dialog titled "Universes": Name, No., Output, Target with every field of every output kind, Rate, Used, State, Remove with its refusal, and "Add universe". Every fault and placeholder of today's table is kept. The dialog edits the same draft; closing it changes nothing more.

- **The fixtures list** shows the fixtures of the universe shown, sorted by address: Name (with the fault icon and its tooltip), Type, Address, Flash. Its title line reads "N on <universe's name>" and holds "Add fixtures". A fixture whose universe is unknown is listed at the end of every universe's list, with its fault, so it can always be picked and fixed. "No fixtures" is the hatched empty state.

- **The picked fixture's panel** is a `Panel tone="sand"` titled with the fixture's name; at the right of the title, "N channels". Fields: Name; Type (the type picker, unchanged: the user's types, bundled ones, "… more: keep typing", "No type matches", "New type…", "Open the Library", the import of a bundled entry and its "simplified" toast); Mode (disabled when the type has none); Universe; Address, with "to N" beside it (in `fault` when it passes 512 or overlaps); Groups, read-only. At the bottom: Flash (with its off reasons as today), Duplicate, Delete (the confirm with the patches that use it is a danger dialog). The fixture's issues are listed in the panel under the fields, in `fault`.

- **From 900 to 1179 px** the picked fixture's panel lays over the right 330 px of the fixtures panel, which scrolls from under it. Below 900 px the read-only phone list stays, restyled.

- **The channel map.** A free cell is a `--panel` square; a fixture's block is a `--tint` fill with its name in `--on-tint`; the picked block is `--sand` with `--on-sand`; blocks that share channels are `--fault` with `--on-fault`; the ghost of a drag is a dashed `--tint` outline. Dragging, Left / Right, Shift + arrow, Enter / Space and the shared pick with the list are unchanged.

- **Patch.** One panel titled "Patch", with the count of groups at the right. A line with "Patch for <show ▾>", "Patch another show…", and at the right Propose and Revert. Then one row per group: its name, "filled / wanted", one chip per slot, and its status at the right. An empty slot is a small hatched block reading "empty" that opens the same menu. A group that needs a fixture is a `--sand-panel` row with a `--sand` stripe and the `!` badge before its status; a group with an error, `--fault-panel` and a `--fault` stripe. A changed chip keeps its mark. Tuple slots stay text ("A + B"). "Not used by this show: …" sits under the rows.

- **One Save per tab.**

  | Tab | Rig is | The primary button reads | It does |
  |---|---|---|---|
  | Rig | any | Save | Saves the rig |
  | Patch | saved | Save patch | Saves the patch |
  | Patch | unsaved | Save | Saves the rig; the notice line says "Save the rig to patch it" and the rows are locked, as today |

  ⌘S follows the same table, as it does today.

- **Library.** After the tabs: the search field ("Search maker or model"), the three filters with their counts (All, Mine, Bundled) as a `Choice`, and at the right "New type". One panel titled "Fixture types" with the count shown. Columns: Type, Maker, Modes, Source, Conversion, "Used in" (hidden under 1100 px, as today), then the actions (own types: Edit, Duplicate, Delete; bundled: Import, Duplicate). "simplified" is in `sand` with its reasons in a tooltip. Enter opens a type. The footer line and "No type matches" are as today. Delete is a danger dialog.

- **The type editor.** After the tabs: "← Library", the name and the maker edited in place, the "mine" or "bundled" mark; right: the fault count, Undo, Redo, Duplicate, and Save or Import. One panel titled "Channels"; at the right of the title, "used in …". A line with the mode tabs and "+ Add mode"; at the right "Mode name" with its field, the `···` menu (Duplicate mode, Remove mode) and the conversion ("clean", or "simplified" with its reasons). The channel table: the handle of six square dots with the number, Name, Role, "Fine of", Default, Inverted (the square switch), Value ranges (the summary; a click opens the dialog), `···`. A row with a lint fault has a `fault` stripe and its message under the name. Under the table: "+ Add channel" and the paste box. A bundled entry is the same screen read-only, with Import.

- **Explanations** (new words, in `Explain` tooltips):

  | Word | Tooltip |
  |---|---|
  | Universes | A universe is one cable of up to 512 channels going out to the lights. |
  | in use | PTAH is running with this venue now. |
  | Address | The first channel the light listens on. It takes as many channels as its mode has. |
  | Mode | How many channels the light uses. Set the same mode on the light itself. |
  | Universe (in the panel) | The cable this light is plugged on. |
  | Propose | Fills the empty slots with fixtures that fit. Nothing is saved until you save the patch. |
  | Conversion | How well this type came over from the Open Fixture Library. Simplified means some of its features were left out. |
  | Role | What the channel does, so programs know how to drive it. |
  | Fine of | A second channel that makes another one more precise. Pick the channel it refines. |
  | Inverted | The light reads this channel upside down: 255 is off and 0 is full. |
  | Value ranges | What each band of values does, for a channel that is a list of choices and not a level. |

- **The hint lines** (new words). Rig: "Rig: the lights you have and where they are plugged"; keys Move a block `← →`, Save `⌘S`, Undo `⌘Z`, Commands `⌘K`. Patch: "Patch: which lights each group of the show uses"; Save `⌘S`, Commands `⌘K`. Library: "Library: every kind of light PTAH knows, shared by all venues"; Commands `⌘K` only where the page has a palette today. Type editor: "Drag a number to reorder"; Save `⌘S`, Undo `⌘Z`.

- **`/lights/venue` with no id** goes to `/lights`.

## Review Focus

1. **Six universes at 1280 px**: the tiles scroll sideways inside the strip; "Edit" and "Add universe" stay in view; the shown tile is scrolled into view when a fixture on it is picked. (Task 3)
2. **A fixture whose universe or type is unknown** can still be found, picked and fixed. (Task 5)
3. **Dragging a block with its fixture picked**: the panel's Address follows the drag, the map and the list do not move, and letting go leaves one undo step, as today. (Tasks 4, 6)
4. **Patch with the rig unsaved**: the rows are locked, the button reads "Save" and saves the rig, then reads "Save patch"; ⌘S does the same. (Tasks 7, 10)
5. **The Library with 1 240 types**: typing in the search stays as quick as today; the list scrolls inside its panel; nothing outside it moves. (Task 8)

---

### Task 1: Shared pieces: the tabs and the explanations

**Files:**
- Create: `packages/ds/src/venue/LightsTabs.tsx`, `packages/ds/src/venue/LightsTabs.module.css`, `packages/ds/src/venue/__tests__/tabs.test.tsx`, `packages/ds/src/venue/words.ts`, stories in `packages/ds/src/venue/Venue.stories.tsx`
- Modify: `packages/ds/src/venue/index.ts`, `packages/ds/src/library/index.ts` (re-export for the Library screens), `docs/design-system.md`

**Interfaces:**
- Produces:

```ts
export type LightsTab = "rig" | "patch" | "library";
export function LightsTabs(props: {
  current: LightsTab;
  hrefs: { rig: string; patch: string; library: string };
  /** A plain click; the href stays for a middle click or a copy. */
  onNavigate: (tab: LightsTab) => void;
  /** Patch warnings, as today's Patch tab shows them. */
  patchWarnings?: number;
}): JSX.Element;
// words.ts
export const LIGHTS_WORDS: Record<
  "universes" | "inUse" | "address" | "mode" | "universe" | "propose" |
  "conversion" | "role" | "fineOf" | "inverted" | "valueRanges", string>;
export const LIGHTS_HINTS: Record<LightsTab | "type", string>;
```

- [ ] **Step 1: Write the failing tests**: a `navigation` named "Lights" with three links in the order Rig, Patch, Library; the current one has `aria-current="page"`; a plain click calls `onNavigate` and a ⌘-click does not; `patchWarnings={2}` shows today's count on Patch and its name says so; every key of `LIGHTS_WORDS` and `LIGHTS_HINTS` equals the sentence of the tables above. Play: the tabs have the same box whichever is current.
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test -- tabs` — FAIL.
- [ ] **Step 3: Implement.** A tab is a 30 px chip; the current one is a `--tint` fill; the rule before Library is `--line`.
- [ ] **Step 4: Run** tests and Storybook — PASS. Boards: add `venue-tabs` in the three looks.
- [ ] **Step 5: Commit** (code, then baselines).

### Task 2: The venue bar

**Files (modify):** `packages/ds/src/venue/VenueHeader.tsx`, `Venue.module.css` (the header's rules), `Venue.stories.tsx`, `__tests__/rig.test.tsx` (the header's cases).

**Interfaces:**
- Consumes: `LightsTabs`, `LIGHTS_WORDS` (Task 1), `NoticeLine`, `Explain`, `Menu`, `Dialog tone="danger"`.
- Produces: `VenueHeader` unchanged in props, plus `tabs: ReactNode` (the caller builds `LightsTabs`) and `primary: { label: "Save" | "Save patch"; onClick: () => void; disabled: boolean; title?: string }` in place of its own Save, so the table of "One Save per tab" is the caller's.

- [ ] **Step 1: Write the failing tests.** Today's header tests stay green, changed only where they find Save (now `primary`). New: the name's edit (empty ignored); "in use" is an `Explain`; every item of "Venues ▾" with its disabled reason; "Delete <name>?" is a danger dialog with exactly one `fault` button and today's two texts; the fault count's words ("1 overlap, 2 errors"); the primary button shows the given label and its tooltip (the first error); the notice line takes a `{ tone, text, action }` and a refusal takes its place until the next action. Plays: the bar is one line 52 px high with a 60-character venue name (cut, tooltip); the 24 px line has the same height empty and filled.
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test -- rig` — FAIL on the new ones.
- [ ] **Step 3: Implement** from the top of `O-Lights-Rig.png`.
- [ ] **Step 4: Run** tests and the venue stories — PASS.
- [ ] **Step 5: Commit**.

### Task 3: The universe strip and the universes dialog

**Files:**
- Create: `packages/ds/src/venue/UniverseStrip.tsx`, `packages/ds/src/venue/UniversesDialog.tsx`, `packages/ds/src/venue/__tests__/strip.test.tsx`
- Modify: `packages/ds/src/venue/UniversesTable.tsx` (its look only; it is now drawn inside the dialog), `Venue.module.css`, `Venue.stories.tsx`, `sample.ts` (a six-universe venue), `__tests__/rig.test.tsx`

**Interfaces:**
- Consumes: the venue model's universes with their used counts, faults and states (existing).
- Produces:

```ts
export function UniverseStrip(props: {
  universes: { id: string; name: string; number: number; output: string; used: number;
               state?: string; stateTone?: "tint" | "sand" | "fault"; fault: boolean }[];
  shown: string;                       // a universe id
  onShow: (id: string) => void;
  onEdit: () => void;
  onAdd: () => void;
}): JSX.Element;
export function UniversesDialog(props: { open: boolean; onOpenChange: (o: boolean) => void; children: ReactNode }): JSX.Element;
```

  `output` is today's words in short: "USB Pro", "Art-Net · 10.0.0.20", "sACN · 12", "none".

- [ ] **Step 1: Write the failing tests.** Today's universes-table tests stay green untouched, run with the table inside the dialog (every field of every output kind, the repeat-number fault, Remove's refusal, "Add universe", the placeholders, "sACN (not yet)"). New: the strip is a `tablist` named "Universes" with one `tab` per universe; the shown one has `aria-selected`; a click and the arrow keys call `onShow`; each tile reads name, "Universe N", the output, "n / 512" and its state; "lost" and "late" carry `data-tone="fault"`, "not sent" `sand`; a universe with a fault carries `data-fault`; "Edit" and "Add universe" call their handlers; "Universes" is an `Explain`. Plays: with six universes at 1280 px the tiles scroll sideways and both buttons are fully inside the strip; showing a universe scrolls its tile into view (Review Focus 1); the strip is 36 px high with one universe and with six; a tile's box is the same shown and not.
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test -- strip rig` — FAIL.
- [ ] **Step 3: Implement** from the strip of `O-Lights-Rig.png`.
- [ ] **Step 4: Run** tests and Storybook — PASS. Boards: `venue-rig-strip`, `venue-rig-strip-six`, `venue-rig-universes-dialog`.
- [ ] **Step 5: Commit** (code, then baselines).

### Task 4: The channel map

**Files (modify):** `packages/ds/src/primitives/BlockMap/` (its look; its props and handlers stay), `packages/ds/src/venue/RigPage.tsx` (the map's part), `Venue.module.css`, `Venue.stories.tsx`, `__tests__/rig.test.tsx`, the BlockMap test and stories.

**Interfaces:**
- Consumes: `Panel`.
- Produces: a `ChannelMapPanel` exported from `RigPage.tsx` (or its own file): `{ universe, blocks, picked, readout, onPick, onMove }` with the same block and handler types the map takes today; it draws one universe.

- [ ] **Step 1: Write the failing tests.** Today's map tests stay green untouched (drag re-addresses with a ghost; Left / Right move one channel; Shift + arrow moves by the block's width; Enter / Space picks; the readout's words). New: the panel is titled with the universe's name and its title's right end holds the readout and "Universe N · output"; the picked block has `data-picked`; overlapping blocks have `data-fault`. Plays: picking a block changes no cell's box; in `V-Lights-Overlap`'s story both blocks read in `fault` in the three looks, with `--on-fault` text that passes contrast; a block too narrow for its name cuts it and the readout gives it whole.
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test -- BlockMap rig` — FAIL on the new ones.
- [ ] **Step 3: Implement** "The channel map" decision.
- [ ] **Step 4: Run** tests and Storybook — PASS. Boards: the BlockMap boards and `venue-rig-overlap`.
- [ ] **Step 5: Commit** (code, then baselines).

### Task 5: The fixtures list and the picked fixture's panel

**Files:**
- Create: `packages/ds/src/venue/FixturePanel.tsx`, `packages/ds/src/venue/__tests__/fixture.test.tsx`
- Modify: `packages/ds/src/venue/FixturesTable.tsx` (it becomes the list: Name, Type, Address, Flash), `TypePicker.tsx`, `FlashButton.tsx`, `AddFixturesDialog.tsx`, `Venue.module.css`, `Venue.stories.tsx`, `sample.ts` (a fixture with an unknown universe and one with an unknown type), `__tests__/rig.test.tsx`

**Interfaces:**
- Consumes: the fixture rows and handlers the table takes today; `Panel tone="sand"`, `Explain`, `Select`, `NumberField`, `Dialog tone="danger"`.
- Produces: `FixturesTable` takes `shown: string` (the universe id) and `picked: string | null` with `onPick`, and no longer draws the Type, Mode, Universe and Address controls; `<FixturePanel fixture … />` takes the picked fixture's row and the same edit handlers the table's controls called, and draws them.

- [ ] **Step 1: Write the failing tests.**
  - The list shows the shown universe's fixtures sorted by address, each with name, type, address and Flash; its title reads "N on <name>"; a fixture with an unknown universe is last in every universe's list with its fault icon (Review Focus 2); "No fixtures" is the hatched empty state; a click or Enter on a row calls `onPick`; the picked row has `data-picked` and brackets.
  - The panel: every edit of today's row is still possible and sends the same edit (drive the old table's cases against the panel: name, type, mode, universe, address, duplicate, delete); Mode is disabled when the type has none; Address shows "to N" and both are in `fault` on a fault; Groups reads "group (show), …"; the issues list; Delete with a patch use is a danger dialog with today's sentence and its "show · group" list; Address, Mode and Universe are `Explain`s.
  - The type picker's tests, Flash's tests (hold by pointer and by Space / Enter, the three off reasons, release on blur and on a hidden tab) and the Add fixtures dialog's tests stay green untouched.
  - Plays: picking a fixture changes no row's box; every text colour on the panel is `--sand` or `--on-sand` in the three looks; the panel scrolls inside itself when short, with its scrollbar showing.
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test -- fixture rig` — FAIL.
- [ ] **Step 3: Implement** from the bottom of `O-Lights-Rig.png`.
- [ ] **Step 4: Run** tests and Storybook — PASS. Boards: `venue-rig-fixture-panel` in the three looks, `venue-rig-add-dialog`.
- [ ] **Step 5: Commit** (code, then baselines).

### Task 6: The Rig screen

**Files (modify):** `packages/ds/src/venue/RigPage.tsx`, `Venue.tsx` (its `return` for Rig), `Venue.module.css`, `VenuePhone.tsx`, `VenuePhone.module.css`, `Venue.stories.tsx`, `__tests__/rig.test.tsx`, `__tests__/phone.test.tsx`, `packages/ds/scripts/test-visual.mjs`.

**Interfaces:**
- Consumes: Tasks 2 to 5, `HintLine`, `LIGHTS_HINTS`.
- Produces: `RigPage` keeps its props and gains `shown: string` and `onShow: (universeId: string) => void` (left out, it keeps the shown universe itself, starting with the first). A pure function `universeToShow(fixtures, pickedId, shown): string` in `packages/ds/src/venue/model/shown.ts`, with its test.

| State | Event | Result |
|---|---|---|
| Universe A shown | click on B's tile | B shown; the pick is kept if the picked fixture is on B, else cleared |
| A shown, nothing picked | a fixture of A picked (list or map) | The panel shows it; nothing moves |
| A shown | a fixture of B picked (a fault link, the palette, a new duplicate) | B shown, its tile in view, the fixture picked |
| A fixture picked | its Universe changed to B in the panel | B shown; the fixture stays picked |
| A fixture picked | its block dragged | Address in the panel follows; one undo step on release (Review Focus 3) |
| A fixture picked | Delete confirmed | Nothing picked; the hatched block |
| Any | "Edit" on the strip | The Universes dialog |
| The shown universe removed in the dialog | — | The first universe is shown |
| No universe | — | The strip holds only "Add universe"; the map and list are hatched empty states with today's words |

- [ ] **Step 1: Write the failing tests**: one per row of the table (`universeToShow` for the rows it decides, the screen for the rest). Plays at 1280 × 800: the strip, the map panel, the fixtures panel with the 330 px column at its right, the hint line; the window does not scroll; picking and unpicking a fixture changes no box outside the right column. At 1024 × 768: the picked fixture's panel lays over the right of the fixtures panel and the list scrolls from under it. At 899: the read-only phone list with today's words ("Editing needs a wider screen", universes with output and state, fixtures as "U/001 · type" with a large Flash, patch rows).
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** tests and Storybook — PASS. `df -h /System/Volumes/Data | tail -1`, then `pnpm update:visual --only venue-rig`, adding `venue-rig-light`, `venue-rig-stage`, `venue-rig-picked`, `venue-rig-1024`. Open `venue-rig-picked` and `venue-rig-1024` with the Read tool and compare with `O-Lights-Rig.png`. Owner looks at Rig: well, picked, overlap, six universes, 1024, the phone list, each in dark, light and stage.
- [ ] **Step 5: Commit** (code, then baselines).

### Task 7: The Patch screen

**Files (modify):** `packages/ds/src/venue/PatchPage.tsx`, `PatchPage.module.css`, `Venue.tsx` (its `return` for Patch), `Patch.stories.tsx`, `patchSample.ts`, `__tests__/patch.test.tsx`, `packages/ds/scripts/test-visual.mjs`.

**Interfaces:**
- Consumes: Tasks 1 and 2, `Panel`, `Menu`, `Badge`, `Explain`, `HintLine`.
- Produces: `PatchPage` keeps its props, minus its own "Save patch" button (the bar's `primary` carries it); a pure function `primaryFor(tab: LightsTab, rigDirty: boolean): "Save" | "Save patch"` in `packages/ds/src/venue/model/primary.ts`, with a test for each row of the "One Save per tab" table.

- [ ] **Step 1: Write the failing tests.** Today's patch tests stay green, changed only where they click "Save patch" inside the page (it is now the bar's). New: `primaryFor`'s three rows; each group row has its name, "filled / wanted", one chip per slot and its status; an empty slot is a button named "empty" with `data-empty` that opens today's menu (fixtures that fit, then "<name> · does not fit", then "Empty"); a group that needs a fixture has `data-need` and the `!` badge; a group with an error has `data-fault`; a changed chip keeps `data-changed`; tuple slots read "A + B"; "programs not read", "· fallback: …", "No patch on this venue yet", "Not used by this show: …" and "none" are as today; Propose is an `Explain`-style tooltip with the sentence of the table; with the rig unsaved every control of the rows is disabled and the notice says "Save the rig to patch it" (Review Focus 4). Plays: a row's box is the same well, in need and in fault; a group of eight slots wraps to two lines of chips without moving the status column; the panel scrolls inside itself with twenty groups.
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test -- patch primary` — FAIL.
- [ ] **Step 3: Implement** from `O-Lights-Patch.png`.
- [ ] **Step 4: Run** tests and Storybook — PASS. `pnpm update:visual --only venue-patch`, adding the light and stage ones. Owner looks at Patch: well, unfilled, proposed, rig-dirty, none.
- [ ] **Step 5: Commit** (code, then baselines).

### Task 8: The Library list

**Files (modify):** `packages/ds/src/library/LibraryList.tsx`, `Library.module.css`, `Library.stories.tsx`, `__tests__/list.test.tsx`, `packages/ds/scripts/test-visual.mjs`.

**Interfaces:**
- Consumes: `LightsTabs`, `LIGHTS_WORDS`, `LIGHTS_HINTS`, `Panel`, `Choice`, `Explain`, `NoticeLine`, `Dialog tone="danger"`, `HintLine`.
- Produces: `LibraryList` keeps its props and gains `tabs: ReactNode`.

- [ ] **Step 1: Write the failing tests.** Today's list tests stay green, changed only where the three filters were tabs (now a radiogroup named "Source" with the same three options and counts). New: the columns and each row's actions by source; "simplified" has its reasons in a tooltip; Delete is disabled when used with "Used in …" and its confirm is a danger dialog with today's two texts; actions are disabled while one runs; Enter on a row opens it; "No type matches"; the fault line and the read faults with Retry on the notice line; the footer line with its link; "Used in" is absent under 1100 px; "Conversion" is an `Explain`. Plays: with the 1 240-type sample the list scrolls inside its panel and the bar, the panel's title and the footer stay in view; typing three letters in the search redraws within the time today's does (measure the old screen first; allow 1.5 times) (Review Focus 5); a row's box is the same with and without the fault line. Under 900 px: the phone list as today.
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test -- list` — FAIL on the new ones.
- [ ] **Step 3: Implement** from `O-Lights-Library.png`.
- [ ] **Step 4: Run** tests and Storybook — PASS. `pnpm update:visual --only library-list`, adding the light one.
- [ ] **Step 5: Commit** (code, then baselines).

### Task 9: The type editor

**Files (modify):** `packages/ds/src/library/TypePage.tsx`, `TypePage.module.css`, `TypeHeader.tsx`, `ModeTabs.tsx`, `ChannelTable.tsx`, `RangesDialog.tsx`, `PasteBox.tsx`, `ImpactDialog.tsx`, `Type.stories.tsx`, `__tests__/type.test.tsx`, `__tests__/paste.test.tsx`, `__tests__/impact.test.tsx`, `packages/ds/scripts/test-visual.mjs`.

**Interfaces:**
- Consumes: `LightsTabs`, `LIGHTS_WORDS`, `LIGHTS_HINTS`, `Panel`, `Toggle`, `Explain`, `Brackets`, `NoticeLine`, `HintLine`.
- Produces: `TypePage` keeps its props and gains `tabs: ReactNode`.

- [ ] **Step 1: Write the failing tests.** Today's type, paste and impact tests stay green untouched. New: the bar's items in order ("← Library", name, maker, the mark, then the fault count, Undo, Redo, Duplicate, Save or Import); the fault line's four messages on the notice line; the panel's title "Channels" with "used in …" at its right; the mode tabs with "+ Add mode", "Mode name", the `···` menu (Remove mode disabled on the last mode) and the conversion with its reasons; the mode fault line ("mode has no channels"); each column of the table; the handle is named "Drag to reorder" and Alt + ↑ / ↓ moves the row; a lint message shows under its row's name with `data-fault` on the row; "No channels yet" is the hatched empty state; Role, "Fine of", Inverted and "Value ranges" heads are `Explain`s; the ranges dialog and the paste box with the "Replace this mode's N channels?" question; a bundled entry is read-only text with Import; each dialog of the inventory's "Save flow and states" keeps its title, its lines and its buttons. Plays: picking a channel row changes no row's box; a row with a lint message has the same height as one without (the message takes a reserved line only while a fault shows, laid over the gap under the row); the table scrolls inside the panel with 40 channels; under 900 px the read-only view with today's words.
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test -- type paste impact` — FAIL on the new ones.
- [ ] **Step 3: Implement** from `O-Lights-Type.png`.
- [ ] **Step 4: Run** tests and Storybook — PASS. `pnpm update:visual --only library-type`, adding the light and stage ones. Owner looks at the Library list and the type editor in the three looks.
- [ ] **Step 5: Commit** (code, then baselines).

### Task 10: Wiring in the app

**Files (modify):** `apps/web/src/venue/VenuePage.tsx`, `apps/web/src/library/LibraryPage.tsx`, `apps/web/src/library/TypeEditor.tsx` (what they pass to the screens; their hooks and handlers are not changed), `apps/web/src/redirects.ts` and `routes.ts` (the one new redirect), their tests in `apps/web/src/__tests__/`, `apps/web/e2e/venue.spec.ts`, `apps/web/e2e/library.spec.ts`.

| State | Event | Result |
|---|---|---|
| Any Lights screen | a tab | Its address; the page's leave guard is asked first, as for any navigation |
| Library or a type, no venue yet | Rig or Patch | `/lights`, which says "No venue yet." with "New venue", as today |
| `/lights/venue` | — | `/lights` |
| Rig | a universe's tile | That universe shown; kept while the page stays open |
| Rig | a fault's link or a palette command that names a fixture on another universe | That universe shown and the fixture picked |
| Rig, rig changed | Save | As today (apply, conflict, the save note) |
| Patch, rig unsaved | the primary button, or ⌘S | Saves the rig; then the button reads "Save patch" |
| Patch, rig saved | the primary button, or ⌘S | Saves the patch, as today |
| Any | the notices | One at a time on the line, faults first: read faults with Retry and "This venue could not be read" in `fault`; "saved, not applied: …" and the save note in `sand` |
| Library | search and filter | Kept in the address (`?q=`, `?f=`), as today |
| Type editor | Save, the impact and blocked dialogs, conflict, leave, a missing type | Exactly as today (the page tests for these stay green untouched) |

- [ ] **Step 1: Write the failing tests**: one per row, except the rows that say "as today" or "exactly as today", which are the existing tests; `redirect("/lights/venue", "", "")` is `/lights`.
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds build && pnpm -F @ptah-app/web test` — FAIL.
- [ ] **Step 3: Implement.** The pages build `LightsTabs` and pass it; `VenuePage` passes `primary` from `primaryFor`; remove the "Library" button plan 1 added beside empty-page actions and on the venue header.
- [ ] **Step 4: Update the e2e specs** only where they find a control that moved (a fixture's Type, Mode, Universe and Address are in the panel after picking it; the universes table is behind "Edit"; "Save patch" is the bar's; the Library filters are a radiogroup; the way into the Library is its tab). Add one test: with two universes, pick a fixture of the second from the first's view through a fault link or the list of the second, and see the strip follow.
- [ ] **Step 5: Run** `pnpm -F @ptah-app/web test && pnpm -F @ptah-app/web test:e2e -- venue.spec.ts && pnpm -F @ptah-app/web test:e2e -- library.spec.ts` — PASS.
- [ ] **Step 6: Commit**: `git commit -m "feat(web): Lights in ZENITHALL" <paths>`

### Task 11: Checkpoint

- [ ] **Step 1:** `df -h /System/Volumes/Data | tail -1`; `du -sh target`; clean per AGENTS.md if needed.
- [ ] **Step 2:** `pnpm allcheck` — green. A failure that passes when re-run alone is reported as load, with the output.
- [ ] **Step 3:** Start the app as the e2e rig does (a temporary root copied from `fixtures/`, `--fake-io`, never `~/.ptah`); launch the browser with scrollbars shown. Walk at 1280 × 800, 1024 × 768 and 390 × 844, in the three looks: the three tabs; a new venue; add a universe and edit its output; add fixtures; pick one and change its type, mode and address; drag its block; make two fixtures overlap; Flash; duplicate and delete; Save with the clock stopped and running; Patch: Propose, an empty slot's menu, Revert, Save patch, the rig-unsaved lock; the Library: search, filter, import a bundled type, a new type; the type editor: add a mode and a channel, reorder, value ranges, paste a list, Save with the impact dialog; ⌘K on Rig. Save a screenshot of each to the plan's workspace, open the key ones with the Read tool, and report anything wrong.
- [ ] **Step 4:** In `docs/design-system.md`, under "ZENITHALL (in progress)", add a short "Lights" section: the tabs, the Rig's regions, the strip's rule, the patch row's states, "One Save per tab". In `~/projects/ptah/docs/superpowers/plans/2026-11-19-v2-redesign-deferred.md`, strike out the plan 5 lines that are done.
- [ ] **Step 5:** Owner check of the running app. Commit: `git commit -m "docs(ds): Lights in ZENITHALL" <paths>`.
