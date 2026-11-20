# Redesign 3 of 7: Show — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Show place its ZENITHALL screen: the bar, the Groups panel, the grid of rows and lights, the chain that reads a note, the note strip, the sand Row details panel on the right, and the new "Notes as" switch.

**Architecture:** Every piece of today's Show screen in `packages/ds/src/show` is restyled in place with the same data, roles and words. The layout changes from two columns with the details under the grid to three columns with the details on the right. The draft, the edits, the save and apply flow, the checks and the audition (`show/model/*`, `apps/web/src/show/*.ts`) are not changed; one pure function is added beside them for the chain. "Notes as" is a small browser preference in the design system, used here and by Inspect in plan 6.

**Tech Stack:** TypeScript, React, CSS modules with tokens only, Vitest, Storybook, Playwright (visual and e2e), Biome.

**Spec:** `~/projects/ptah/docs/superpowers/specs/2026-11-19-v2-redesign-design.md` (sections "Show", "Across the app", "The look in numbers", the Show feature table, "Homes for the items the first tables missed", "Calls I made"). Inventory: `2026-11-19-v2-redesign-inventory.md`, section 6. Code: `~/projects/ptah-v2`, branch `redesign-show` from `master`.

**Boards (the drawings to match):** `~/projects/ptah/docs/superpowers/specs/2026-11-19-v2-redesign-boards/png/J-Show.png` (the screen with a row picked), `T-07-show.png` (today's screen, for what must still be there), `X-Phones.png` (the phone view), `U-Pieces.png` (shared pieces). Markup: `…-boards/html/J-Show.dc.html`. Open them with the Read tool before styling. Where a board and this plan differ, this plan wins; where a board's words differ from the code's, the code's words win.

**What plan 2 set, to follow here:** `packages/ds/src/perform/` for the patterns: a `Panel` per region with `level`, `Digits` for changing numbers, `useWholeWhenCut` with `Tooltip disabled` for cut text, `HintLine`, Storybook plays for anything measured, light and stage stories beside each story. From `packages/ds`, visual boards are regenerated with `pnpm update:visual --only <name>` (the `--` form fails).

## Global Constraints

- Exactly today's features, no less, no more, plus "Notes as".
- Inside the screen, today's wording is kept: every label, word, refusal, toast, dialog text and command title stays as it is in the code. The only new words are the ones this plan lists (the "Notes as" switch, the tooltip sentences, the chain's three labels, the strip's legend).
- Nothing shifts: picking a row, a group or a note, a refusal, a look change or a value change never moves or resizes anything.
- Calm when well, loud only when wrong: `fault` appears only for a fault.
- Tokens-only styling. Gaps use `--gap-panel` and `--gap-row`; line heights use `--lh-*`. On a sand fill, text uses only `--on-sand`. Biome only.
- The logic is not touched: no change to the existing functions of `packages/ds/src/show/model/*`, to `apps/web/src/show/{useShow,actions,saveShow,check,audition,derive}.ts`, to the server or the engine. New pure functions may be added beside them.
- Story ids keep their names (`show-grid--…`, `show-notecell--…`, `show-details--…`, `show-dialogs--…`); stories for the light look are added beside the existing ones.
- No new dependency. Never start V1 services or pm2; never touch `~/.ptah` or `~/ptah-home`; leave the untracked `docs/design/brief/` and `.ignore` alone; the Storybook servers on 6006–6008 stay up; no push unless the owner asks.
- Disk (AGENTS.md): `df -h /System/Volumes/Data | tail -1` before a heavy run; below 30 GB free, clean first and tell the owner. No extra worktree.
- At most three agents at once. A design-system task runs the visual gate for its own boards only; the full gate runs at the checkpoint. Do not run the ds tests side by side with the web tests (the ds build test removes `dist/`).
- Every task that changes how something looks ends with the owner looking at its Storybook stories before the task is closed.

## Decisions this plan makes

- **The screen at 1180 px and wider.** The bar under the header; the notice line under the bar (it keeps its place when empty); then three columns with `--gap-panel` between them and a 24 px page margin; the hint line at the bottom.

  | Column | Width | Holds |
  |---|---|---|
  | Groups | 214 px | The Groups panel: the groups, "Not on any group" last and in sand when it has rows, "+ Add group" at the bottom |
  | Grid | the rest | One panel titled with the group's name: the title line, the grid, "+ Add program", the chain, the note strip with its legend |
  | Row details | 290 px | The sand Row details panel for the open row; with no row open, a hatched block labelled "Row details" |

  The right column is always there, so opening and closing a row never resizes the grid.

- **From 900 to 1179 px** there are two columns (Groups, Grid) and the Row details panel sits under the grid panel in a slot of fixed height, as today. Below 900 px the read-only view stays, restyled.

- **The bar.** Left: the show's name, edited in place, in `screen-title`; the "playing" mark; "Shows ▾"; "channel" with its field. Right: the fault count (it opens the issue list, as today), Undo, Redo, Save (the primary button). A long name is cut with its full text in a tooltip; the bar never wraps.

- **The grid panel's title line.** The group's name (edited in place, as today), then at the right: the "Notes as" switch, "× size", "needs …" and "· N parts per light" as today's words, and the `···` menu (Merge with…, Delete group).

- **Rows.** A row is a `--panel` strip with a 4 px `--tint` stripe; `--sand` when it needs you; `--fault` when it has an error. The open row is a `--sand` fill with corner brackets, 4 px outside, and its cells take a `--sand-panel` fill; a fault or a need on the open row keeps its stripe, with a 2 px `--on-sand` gap beside it so the stripe reads on sand. Rows sit `--gap-row` apart. A disabled row is dimmed, as today. An empty cell is a small hatched block (45°, no border) and is still the place you click to add a note.

- **"Notes as".** A `Choice` with two options, `numbers` and `letters`, labelled "Notes as". It changes how a note is written on chips, in the chain, and in the strip's readout: `60` or `C3`; with a channel, `60·ch 2` or `C3·ch 2`. Typing accepts both forms, as today. The choice is kept per browser under `ptah.ds.notesAs` (default `numbers`, today's form) and is read by Inspect in plan 6. Live keeps its letter names.

- **The chain.** Under the grid, a box of fixed height that replaces today's one-line readout.

  | What is pointed at | The box shows |
  |---|---|
  | A note chip (focus or hover) | Three linked blocks: **Note** (the piano-roll icon; "ch 1" or "any channel"; the number and the letter name, the chosen form first, the other in a small box) → **Program** (the row's name) → **Light** (the light's name, or "all together" / "spread" for a wide cell). Under them one line: "also starts …" when the note starts something else, then the cell's issues. |
  | A note of the strip (hover) | The Note block alone, and the line: "free" or "starts …" |
  | A refusal, or the message of a held chip | The blocks of the cell it is about, and the line carries the message (in `fault` for a refusal) |
  | Nothing | The three blocks as empty outlines; no words |

  The order of precedence is today's: a refused edit, then a press, then the strip's hover, then the focused note. The box keeps `role="status"` and the name "Readout", and its text content, read in order, is today's sentence (`note 60 · C3 · ch 1 · also starts …`).

- **The note strip** keeps its 128 cells and its hover. A legend sits at its right: "this group", "used", "free", each with its swatch. Its title is today's label ("Notes on channel N").

- **Row details.** A `Panel tone="sand"` titled with the row's name; "Details ×" at the right of the title closes it (Esc too, as today). Then, top to bottom, every section always visible:

  | Section | Control |
  |---|---|
  | Name | Text field |
  | Program (or the scene's name, fixed) | `Select` |
  | Plays | `Choice` list: one note per light / one note for all / one note, spread |
  | Notes hold | `Choice` list: while held / press on, press off / once |
  | When it stops | `Choice` list: fade out / cut / keep |
  | Faders | One line per setting: name, range, Source, CC, Channel as today's controls |
  | Outputs | One line per slot: kind, Drives, Part as today's controls; "custom" read-only |
  | Refusal | One line at the bottom, in `--on-sand` with a `fault` stripe; it keeps its place when empty |

  The three `Choice` lists replace three `Select`s: the same values, the same words, one click instead of two.

- **Explanations** (new words, in `Explain` tooltips; the word carries the dotted underline):

  | Word | Tooltip |
  |---|---|
  | one note per light | Each light of the group has its own note. |
  | one note for all | One note starts the program, and every light does the same thing. |
  | one note, spread | One note starts the program, and each light knows its place in the group, so the program can travel across the lights (a chase, a wave). |
  | while held | It plays for as long as the note is held. |
  | press on, press off | A first note starts it, the next one stops it. |
  | once | A note starts it and it runs to its end. |
  | fade out / cut / keep | It fades out as the program says. / It goes dark at once. / The lights keep their last values. |
  | natural | The program's dimmer drives the light's own dimmer. Pick Channel to drive one raw channel, or Not used to leave this output out. |
  | every part | A light made of several parts gets this output on each part. Pick one part to drive only that one. |
  | needs … | What a light must have for this group's programs to play on it. |

- **The hint line.** Left: "Hold a note to play it". Right: Save `⌘S`, Undo `⌘Z`, Redo `⇧⌘Z`, Commands `⌘K`.

- **Dialogs** keep their content and take the restyled `Dialog`. In a dialog with `tone="danger"`, only the button that confirms is a `fault` fill; any other primary button in it stays as it is.

## Review Focus

1. **A group of 12 lights at 1280 px** scrolls sideways inside the grid panel; the row heads stay in view, and the Groups and Row details columns do not move. (Task 4)
2. **A cell with more chips than fit** shows "+N" and keeps its size; picking the row does not change it. (Task 4)
3. **The open row has an error**: its fault stripe and its red chips still read on the sand fill, in the three looks. (Tasks 1, 4)
4. **A browser whose storage throws** still switches "Notes as" for the session, and a stored unknown word reads as `numbers`. (Task 1)
5. **A show name of 60 characters and a row named with 40** are cut with their full text reachable; the bar does not wrap and the row head does not grow. (Tasks 2, 4)

---

### Task 1: Shared pieces: "Notes as", the picked row's stripes, the danger confirm

**Files:**
- Create: `packages/ds/src/notesAs.ts`, `packages/ds/src/__tests__/notesAs.test.ts`
- Modify: `packages/ds/src/primitives/_shared/format.ts` and its test; `packages/ds/src/components/Table/Table.module.css` and its test and stories; `packages/ds/src/components/Dialog/Dialog.tsx`, `packages/ds/src/components/Button/Button.tsx` and their tests; `packages/ds/package.json` (the `./notesAs` export, as `./mode` is exported); `docs/design-system.md`

**Interfaces:**
- Produces:

```ts
export type NotesAs = "numbers" | "letters";
export const NOTES_AS_STORAGE = "ptah.ds.notesAs";
export function getNotesAs(): NotesAs;               // stored value, else "numbers"
export function setNotesAs(value: NotesAs): void;     // stores, and tells every useNotesAs
export function useNotesAs(): [NotesAs, (v: NotesAs) => void];
// format.ts
export function formatNote(note: number, as: NotesAs): string; // "60" | "C3"
```

  `Dialog` exposes the danger tone only to the button it is told confirms: `<Button confirm>` inside a `Dialog tone="danger"` takes the `fault` fill; no other button does.

- [ ] **Step 1: Write the failing tests.**

```ts
test("numbers by default, letters once chosen, kept", () => {
  expect(getNotesAs()).toBe("numbers");
  setNotesAs("letters");
  expect(localStorage.getItem(NOTES_AS_STORAGE)).toBe("letters");
  expect(getNotesAs()).toBe("letters");
});
test("an unknown stored word reads as numbers", () => {
  localStorage.setItem(NOTES_AS_STORAGE, "solfege");
  expect(getNotesAs()).toBe("numbers");
});
test("storage that throws: the choice holds for the session", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("no"); });
  setNotesAs("letters");
  expect(getNotesAs()).toBe("letters");
});
test("two components follow one change", () => {
  const a = renderHook(() => useNotesAs());
  const b = renderHook(() => useNotesAs());
  act(() => a.result.current[1]("letters"));
  expect(b.result.current[0]).toBe("letters");
});
test("formatNote", () => {
  expect(formatNote(60, "numbers")).toBe("60");
  expect(formatNote(60, "letters")).toBe(noteName(60));
});
test("in a danger dialog only the confirming button is the fault fill", () => {
  render(<Dialog open title="Delete show" tone="danger" onOpenChange={() => {}}>
    <Button variant="primary">Keep</Button><Button variant="primary" confirm>Delete</Button>
  </Dialog>);
  expect(screen.getByRole("button", { name: "Keep" }).dataset.confirmTone).toBeUndefined();
  expect(screen.getByRole("button", { name: "Delete" }).dataset.confirmTone).toBe("danger");
});
```

  Also, as Storybook plays on the Table stories: a picked row with `data-fault` shows its stripe in `--fault` with a 2 px `--on-sand` gap beside it; a picked row with `data-need` shows its stripe (today it is lost); in both, the row's box is the same as when not picked.

- [ ] **Step 2: Run**: `pnpm -F @ptah-app/ds test -- notesAs format Dialog Button Table` — FAIL.
- [ ] **Step 3: Implement.** Find every caller that relies on the old danger behaviour (`grep -rn 'tone="danger"' packages/ds/src apps/web/src`) and mark its confirming button with `confirm`; their tests must still pass.
- [ ] **Step 4: Run** the tests and `pnpm -F @ptah-app/ds test:storybook` — PASS. Boards: `pnpm update:visual --only table` and `--only dialog`, plus any dialog board that moved.
- [ ] **Step 5: Commit** (code, then baselines).

### Task 2: The bar and the notice line

**Files (modify):** `packages/ds/src/show/ShowHeader.tsx`, `ShowScreen.module.css` (the header's rules), `packages/ds/src/show/Show.stories.tsx`, tests in `packages/ds/src/show/__tests__/` that cover the header (`grid.test.tsx` holds them today).

**Interfaces:**
- Consumes: `Button`, `Menu`, `NumberField`, `NoticeLine`, `Tooltip`, `useWholeWhenCut`.
- Produces: `ShowHeader` unchanged in props. The notice is drawn with `NoticeLine` in a slot of fixed height under the bar.

- [ ] **Step 1: Write the failing tests.** Today's header tests stay green untouched: the name's edit and its two refusals, "playing", every item of "Shows ▾" with its disabled reasons, the channel field, the fault count with "not checked", the issue list and its venue links, Undo, Redo, Save. New, as plays: with a 60-character name the bar is one line 52 px high or less and the name's full text is in a tooltip (Review Focus 5); the notice slot has the same height empty and filled; Save is the only primary button of the bar.
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test -- show` — FAIL on the new ones.
- [ ] **Step 3: Implement** from the board: the name in `screen-title` with a `--line` rule under it while it is not being edited; "Shows ▾" and Undo / Redo as plain buttons; "channel" as a label over its field; the fault count in `tint-dim` when zero, `sand` for warnings, `fault` for errors, as its tone is today.
- [ ] **Step 4: Run** tests and the `show` stories — PASS.
- [ ] **Step 5: Commit**: `git commit -am "feat(ds): the Show bar and notice line in ZENITHALL"`

### Task 3: The Groups panel and the grid panel's title line

**Files (modify):** `packages/ds/src/show/GroupList.tsx`, `GroupLine.tsx`, `ShowScreen.module.css`, `Show.stories.tsx`, their tests.

**Interfaces:**
- Consumes: `Panel`, `Brackets`, `Badge`, `Choice`, `Explain`, `useNotesAs` (Task 1).
- Produces: `GroupList` and `GroupLine` unchanged in props. `GroupList` is a `Panel` titled "Groups" with the count at the right of its title. `GroupLine` is the title line of the grid panel and holds the "Notes as" `Choice`.

- [ ] **Step 1: Write the failing tests.** Today's tests stay green untouched (a group's name, "× size", needs, "N parts", "N rows", the issue icon, "+ Add group", "Not on any group", the group line's edits and refusals, the menu's two items and the delete confirm). New: the picked group has `aria-current="true"` and corner brackets, and its box equals the unpicked one (a play); "Not on any group" is last and carries `data-need` when it has rows; the "Notes as" radiogroup has `numbers` and `letters`, shows the stored choice, and choosing one calls `setNotesAs`; "needs …" is an `Explain` with the tooltip of the table above.
- [ ] **Step 2: Run** — FAIL on the new ones.
- [ ] **Step 3: Implement** from the board: a group tile is a `--panel` strip with a 4 px `--tint` stripe, the name in `row` voice, "× size" beside it, and one `label` line under it (needs, rows); picked, it is a `--tint` fill with `--on-tint` text and brackets.
- [ ] **Step 4: Run** tests and the `show` stories — PASS.
- [ ] **Step 5: Commit**: `git commit -am "feat(ds): Show groups panel and the grid's title line, Notes as"`

### Task 4: The grid: rows, cells, chips

**Files (modify):** `packages/ds/src/show/Grid.tsx`, `Grid.module.css`, `RowHead.tsx`, `NoteCell.tsx`, `NoteCell.module.css`, `HeldField.tsx`, `NoteCell.stories.tsx`, `Show.stories.tsx`, `packages/ds/src/show/sample.ts` (a 12-light group and a crowded cell, if absent), `__tests__/grid.test.tsx`, `__tests__/notecell.test.tsx`.

**Interfaces:**
- Consumes: `formatNote`, `useNotesAs` (Task 1), `Brackets`, `Menu`, `IconButton`.
- Produces: `Grid`, `RowHead`, `NoteCell` unchanged in props. Chips write their note with `formatNote`.

- [ ] **Step 1: Write the failing tests.** Today's grid and note cell tests stay green untouched, with one allowed change: where a test reads a chip's text, it reads it under `numbers` (today's form). New:
  - Under `letters`, a chip reads `C3`, `C3·ch 2`, `C3·any`; a range reads both ends in letters; typing `60` and typing `C3` both add the same note in either form.
  - The open row has `data-picked`, brackets, and `aria-current`; with an error it also has `data-fault` (Review Focus 3).
  - Plays: opening a row changes no row's or cell's box; the 12-light story scrolls sideways inside the grid, with the row heads fixed at the left and the Faders column reachable (Review Focus 1); the crowded cell shows "+N" and has the same box picked and not (Review Focus 2); a 40-character row name is cut with a tooltip (Review Focus 5); an empty cell is hatched and a click on it opens the note field.
  - Keyboard: the arrow keys move around the grid as today; Enter adds, Esc closes, Backspace in an empty field removes the last chip, Delete removes a chip, Space holds (today's tests cover these; they must not change).
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test -- show` — FAIL on the new ones.
- [ ] **Step 3: Implement** the "Rows" decision from the board. A chip is a 24 px box with a 1 px `--tint` outline; the focused chip is a `--sand` fill with `--on-sand` text; a chip with an error is outlined in `--fault`; a held chip shows today's held state. The Faders cell uses `label` voice in `tint-dim`.
- [ ] **Step 4: Run** tests and Storybook — PASS. Boards: `pnpm update:visual --only show-notecell`.
- [ ] **Step 5: Commit** (code, then baselines).

### Task 5: The chain and the note strip

**Files:**
- Create: `packages/ds/src/show/model/chain.ts`, `packages/ds/src/show/model/__tests__/chain.test.ts`, `packages/ds/src/show/Chain.tsx`
- Modify: `packages/ds/src/show/model/index.ts` (export), `Readout.tsx` (it renders `Chain`), `ShowScreen.tsx` (the readout's props only), `ShowScreen.module.css`, `packages/ds/src/primitives/NoteStrip/` (the legend), `Show.stories.tsx`, tests.

**Interfaces:**
- Consumes: `readoutOf`, `noteUses`, `stripText`, `readoutText` (existing, unchanged), `formatNote`, the `note`, `effects` and `lights` icons.
- Produces:

```ts
export type Chain = {
  /** Absent: the block is drawn as an empty outline. */
  note?: { number: number; channel: number | "any" };
  program?: string;          // the row's name
  light?: string;            // a light's name, "all together" or "spread"
  /** The line under the blocks: "also starts …", "free", "starts …", issues, or a message. */
  line: string;
  fault: boolean;
};
export function chainOf(show: Show, at: NoteAt, marks: IssueMarks): Chain;      // a focused or hovered chip
export function chainOfStrip(show: Show, note: number): Chain;                   // a note of the strip
export function chainOfMessage(show: Show, at: NoteAt | null, text: string, fault: boolean): Chain;
// Readout.tsx
export function Readout(props: { chain: Chain | null; notesAs: NotesAs }): JSX.Element;
// NoteStrip gains: legend?: boolean (default false)
```

- [ ] **Step 1: Write the failing tests.**

```ts
test("a chip: note, the row, the light, and what else it starts", () => {
  const c = chainOf(show, { instanceId: "sine", light: 1, ref: { note: 10, channel: 1 } }, marks);
  expect(c).toMatchObject({ note: { number: 10, channel: 1 }, program: "sine (pars)", light: "Par 2", fault: false });
  expect(c.line).toBe("also starts hit (strobes) on Strobe 1");
});
test("the chain reads as today's sentence", () => {
  render(<Readout chain={c} notesAs="numbers" />);
  expect(screen.getByRole("status", { name: "Readout" }).textContent?.replace(/\s+/g, " "))
    .toContain(readoutOf(show, ref, at));
});
test("a wide cell names how it plays", () => {
  expect(chainOf(show, { instanceId: "red", light: null, ref }, marks).light).toBe("all together");
});
test("a free note of the strip", () => {
  expect(chainOfStrip(show, 99)).toMatchObject({ note: { number: 99 }, program: undefined, line: "free" });
});
test("a refusal carries its message in fault", () => {
  expect(chainOfMessage(show, at, "save first", true)).toMatchObject({ line: "save first", fault: true });
});
```

  Use the names of `packages/ds/src/show/sample.ts` for the fixtures. Also: with no chain the box holds three empty outlines and no text; under `letters` the Note block leads with `A#-2` and shows `10` in the small box; plays: the box has the same height for every kind of chain and for none, and the grid above it and the strip below it do not move when it changes; the strip's legend has three entries and the strip keeps its 128 cells and its two rows of 64 under 900 px.
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test -- chain show NoteStrip` — FAIL.
- [ ] **Step 3: Implement.** `ShowScreen` keeps its four sources and their order and turns each into a `Chain` with the function that fits. Blocks: `--panel` fill, a `label` line over a `row` line, linked by a `»` mark in `tint-dim`; the Light block is a `--sand` fill when a chip is focused; an empty block is a 1 px `--line` outline.
- [ ] **Step 4: Run** tests and Storybook — PASS. Boards: `pnpm update:visual --only notestrip`.
- [ ] **Step 5: Commit**: `git commit -am "feat(ds): the Show chain and the strip's legend"`

### Task 6: Row details as the sand panel

**Files (modify):** `packages/ds/src/show/RowDetails.tsx`, `RowDetails.module.css`, `Details.stories.tsx`, `detailsSample.ts`, `__tests__/details.test.tsx`.

**Interfaces:**
- Consumes: `Panel tone="sand"`, `Choice layout="list"`, `Explain`, `Select`, `TextField`, `NumberField`.
- Produces: `RowDetailsProps` gains `layout?: "side" | "under"` (default `under`, today's place). Everything else is unchanged.

- [ ] **Step 1: Write the failing tests.** Today's details tests stay green, changed only where they open a `Select` for Plays, Notes hold or When it stops: they choose the same value in the radiogroup of that name. New: the three radiogroups are named "Plays", "Notes hold", "When it stops" and each has exactly one `aria-checked`; choosing sends the same edit as the `Select` did; every section is in the document for a program row, a scene row ("A scene has no faders.", "A scene has no outputs."), and a program with no settings ("This program has no settings."); each tooltip of the table above is reachable by Tab; "Details ×" and Esc call the close; the refusal line has the same height empty and filled; in `side` the panel is one column 290 px wide and scrolls inside itself when the window is short; on the sand fill every text colour computes to `--on-sand` or `--sand` on `--sand-panel` (a play, in the three looks).
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test -- details` — FAIL.
- [ ] **Step 3: Implement** from the board.
- [ ] **Step 4: Run** tests and Storybook — PASS. Boards: `pnpm update:visual --only show-details`.
- [ ] **Step 5: Commit** (code, then baselines).

### Task 7: The screen: three columns, the hint line, the phone view, the dialogs

**Files (modify):** `packages/ds/src/show/ShowScreen.tsx` (the `return` only, plus the `Chain` wiring of Task 5), `ShowScreen.module.css`, `ShowPhone.tsx`, `ShowPhone.module.css`, `packages/ds/src/show/dialogs/*.tsx`, `Dialogs.module.css`, `Show.stories.tsx`, `Dialogs.stories.tsx`, `packages/ds/scripts/test-visual.mjs`, tests.

**Interfaces:**
- Consumes: every piece of Tasks 2 to 6, `HintLine`, `EmptyState`.
- Produces: `ShowScreenProps` unchanged. `ShowScreen` passes `layout="side"` to the details it is given at 1180 px and wider (the `details` prop becomes `ReactNode | ((layout: "side" | "under") => ReactNode)`; a plain node still works and is placed as today's). New stories: `Light`, `Stage` for the main story, `RowOpen`, `RowOpenLight`, `RowOpenStage`, `RowOpenFault`, `Wide12`, `At1024` (two columns, details under), `NoGroups`, and light variants of the dialog stories. New boards: `show-grid-light`, `show-grid-row-open`, `show-grid-row-open-stage`, `show-grid-row-open-fault`, `show-grid-wide12`, `show-grid-1024`.

- [ ] **Step 1: Write the failing tests** (plays).
  - At 1280 × 800: the bar, the notice slot, three columns in order, the hint line with its keys; the page does not scroll; with no row open the right column holds the hatched "Row details" block.
  - Opening and closing a row leaves the grid panel's box and every row's box unchanged.
  - At 1024 × 768: two columns, the details slot under the grid panel with a fixed height.
  - At 899: the read-only view with today's words ("Editing needs a wider screen", each row as text, "No rows").
  - `NoGroups`: "This show has no groups yet." with its button, as a hatched empty state.
  - The states with no show keep today's words on the hatched empty state: "No show yet." with "New show", "This show could not be read", and "Shows could not be read" with "Retry" (stories `NoShow`, `Unreadable`, in the three looks).
  - Dialogs: today's dialog tests stay green untouched; each danger dialog has exactly one button with the `fault` fill.
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test:storybook` — FAIL on the new ones.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** tests and Storybook — PASS. `df -h /System/Volumes/Data | tail -1`, then `pnpm update:visual --only show`. Open `show-grid-row-open` and `show-grid-1024` with the Read tool and compare with `J-Show.png` before reporting. Owner looks at Show: the main story, RowOpen, RowOpenFault, Wide12, At1024, the phone view, each in dark, light and stage.
- [ ] **Step 5: Commit** (code, then baselines).

### Task 8: Wiring in the app

**Files (modify):** `apps/web/src/show/ShowPage.tsx` (how `details` is passed; nothing else), `apps/web/src/show/__tests__/page.test.tsx`, `apps/web/e2e/show.spec.ts`.

| State | Event | Result |
|---|---|---|
| 1280 wide, no row open | — | The right column shows the hatched block |
| 1280 wide | Details from a row's menu | The sand panel on the right; the grid keeps its box |
| Row open | Esc, or "Details ×" | Closed; the hatched block again |
| Row open | another group picked | Closed, as today |
| Row open | the window narrows under 1180 | The same row's details, under the grid |
| Any | "Notes as" changed | Every chip, the chain and the strip's readout change form; reload keeps the choice |
| Any | Save, apply, conflict, leave, channel change | Exactly as today (the page tests for these stay green untouched) |

- [ ] **Step 1: Write the failing tests**: one per row of the table above the last row; the last row is the existing tests.
- [ ] **Step 2: Run** `pnpm -F @ptah-app/web test -- show` — FAIL.
- [ ] **Step 3: Implement.** Pass `details` as the function form so the screen picks the layout.
- [ ] **Step 4: Update the e2e spec** only where it opens a `Select` for Plays, Notes hold or When it stops, or reads the one-line readout: use the radiogroup, and read the Readout region's text. Add one test: choose `letters`, a chip reads its letter name, reload, it still does.
- [ ] **Step 5: Run** `pnpm -F @ptah-app/web test && pnpm -F @ptah-app/web test:e2e -- show.spec.ts` — PASS.
- [ ] **Step 6: Commit**: `git commit -am "feat(web): Show in ZENITHALL, Notes as"`

### Task 9: Checkpoint

- [ ] **Step 1:** `df -h /System/Volumes/Data | tail -1`; `du -sh target`; clean per AGENTS.md if needed.
- [ ] **Step 2:** `pnpm allcheck` — green. A failure that passes when re-run alone is reported as load, with the output.
- [ ] **Step 3:** Start the app as the e2e rig does (a temporary root copied from `fixtures/`, `--fake-io`, never `~/.ptah`). Walk at 1280 × 800, 1024 × 768 and 390 × 844, in the three looks: open a show, pick each group, add a note by number and by letter, hold a chip, open a row's details, change Plays, change the channel (the dialog), Save, the issue list, merge two groups, "Notes as" both ways, Undo and Redo, ⌘K. Save a screenshot of each to the plan's workspace, open the key ones with the Read tool, and report anything wrong.
- [ ] **Step 4:** In `docs/design-system.md`, under "ZENITHALL (in progress)", add a short "Show" section: the three columns and their widths, the row's states, "Notes as", the chain's four cases. In `~/projects/ptah/docs/superpowers/plans/2026-11-19-v2-redesign-deferred.md`, strike out the plan 3 lines that are done.
- [ ] **Step 5:** Owner check of the running app. Commit: `git commit -am "docs(ds): Show in ZENITHALL"`.
