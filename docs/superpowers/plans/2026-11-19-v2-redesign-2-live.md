# Redesign 2 of 7: Live — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Live place (today's Perform) its ZENITHALL screens: the checklist before a show, the board while it plays, the one-column board for a phone, and the status in the header on every screen.

**Architecture:** Every piece of today's Perform screen is restyled in place inside `packages/ds/src/perform`, with the same data, the same roles and the same words. Only the layout changes: the full board becomes three columns of panels under a status band. The models (`live/perform/model.ts`, `perform/checklist/model.ts`), the hooks and the engine are not touched. The header status is one new pure function plus a small feed component in the web app.

**Tech Stack:** TypeScript, React, CSS modules with tokens only, Vitest, Storybook, Playwright (visual and e2e), Biome.

**Spec:** `~/projects/ptah/docs/superpowers/specs/2026-11-19-v2-redesign-design.md` (sections "Live", "The look in numbers", the Live feature table, "Homes for the items the first tables missed"). Inventory: `2026-11-19-v2-redesign-inventory.md`, section 2. Code: `~/projects/ptah-v2`, branch `redesign-live` from `master`.

**Boards (the drawings to match):** `~/projects/ptah/docs/superpowers/specs/2026-11-19-v2-redesign-boards/png/`. Open them with the Read tool before styling anything.

| Board | Shows |
|---|---|
| `I-Live-Board.png` | The full board, all well |
| `V-Live-Fault.png` | The full board with a fault |
| `V-Live-Restart.png` | The full board while the engine restarts |
| `I-Live-Checklist.png` | The checklist at full width |
| `I-Live-Phone.png` | The one-column board |
| `W-Live-Light.png`, `W-Live-Stage.png` | The board in the light and stage looks |
| `U-Pieces.png`, `X-Phones.png` | Shared pieces; phone views |

The exact markup of each board is in `…-boards/html/<name>.dc.html`. Where a board and this plan differ, this plan wins: the boards left out some of today's items, and the plan puts them back.

## Global Constraints

- Exactly today's features, no less, no more, plus the header status.
- Inside the screen, today's wording is kept: every label, word, toast and command title stays as it is in the code today. Where a board shows other words (for example "Song 04 of 11"), the code's words win ("Song 04 / 11").
- Nothing shifts: a value change, a state change, picking or a look change never moves or resizes anything. Every number that changes while you watch is drawn with `Digits`.
- Calm when well, loud only when wrong: `fault` appears only for a fault.
- Tokens-only styling: no colour, size or font literal in a CSS module. Gaps use `--gap-panel` and `--gap-row`; line heights use `--lh-*`. On a sand fill, text uses only `--on-sand`. Biome only.
- The logic layer is not touched: no change to `live/perform/model.ts`, `perform/checklist/model.ts`, `perform/picker/model.ts`, the stream, the hooks in `apps/web/src/perform/use*.ts`, the server or the engine.
- Story ids keep their names (`perform--…`, `perform-checklist--…`); stories for the light look are added beside the existing ones.
- No new dependency. Never start V1 services or pm2; never touch `~/.ptah` or `~/ptah-home`; leave the untracked `docs/design/brief/` and `.ignore` alone; the Storybook servers on 6006–6008 stay up; no push unless the owner asks.
- Disk (AGENTS.md): `df -h /System/Volumes/Data | tail -1` before a heavy run; below 30 GB free, clean first and tell the owner. No extra worktree.
- At most three agents at once. A design-system task runs `pnpm -F @ptah-app/ds test:visual -- --only <its boards>`; the full gate runs at the checkpoint.
- Every task that changes how something looks ends with the owner looking at its Storybook stories before the task is closed.

## Decisions this plan makes

- **Three faces, chosen as today.** The rule that picks a face does not change (`apps/web/src/perform/layout.ts`: full from 1024 px, or the remembered override).

  | Show playing | Layout | Face |
  |---|---|---|
  | no | full | Checklist at full width: the Checklist panel on the left, the Show and Phone panels on the right |
  | no | column | Checklist in one column, at most 440 px wide |
  | yes | full | The board in three columns, filling the window |
  | yes | column | The board in one column, at most 440 px wide |
  | yes, C pressed | any | The one-column checklist in a dialog over the board |

- **The full board.** A status band across the top; under it a grid of three columns with `--gap-panel` between panels and a 24 px page margin; a hint line at the bottom.

  | Column | Panels, top to bottom |
  |---|---|
  | Left | Song (title: the song's name; right: "Song 04 / 11"; the bar number; the beat ticks or the restart steps; the Transport) |
  | Middle | Active programs; DMX; Fixtures and dimmer; MIDI (with Last inputs) |
  | Right | Emergency (sand); Faults; Latency |

  Columns: `minmax(320px, 400px) minmax(0, 1fr) minmax(260px, 300px)`. If the window is too short, the middle and right columns scroll inside themselves; the band, the Song panel and Emergency never scroll away.

- **The one-column board** keeps everything today's column has, in today's order: band, the words (Clock, Outputs, BPM), Song, Active programs, the MIDI line, DMX, the Latency row, then Emergency (two by two) and the Transport fixed at the bottom. Only the middle scrolls.

- **The status band holds the words in the full layout.** Left: the tone square, the label, the word, then the right label and its value ("For 14 min", "Active faults 1"). Right, always present and fixed in width: the show's name (with the "previewing" mark), "N songs", the Clock word, BPM, Outputs. They stay in a fault too: `V-Live-Fault.png` drops them, and this plan keeps them. A word too long for its space is cut with an ellipsis and its full text opens in a tooltip on hover and on focus.

- **The bar number.** `BarProgress` at `size="display"` draws `049.2` in Chakra Petch 600: the bar padded to three digits in `--bright`, the dot and the beat in `--sand`. It is 124 px high in the full layout (`--fs-number-xl`) and 96 px in the column (a new `--fs-number-lg`, line height 96). From bar 1000 the number has four digits and its size steps down so the width it takes does not grow (full: 96 px; column: 76 px, `--fs-number-sm`).

- **Explanations.** "Devices n / N" in the MIDI panel is an `Explain`: its tooltip lists the device names and ends with "checked every second" (today's detail column text). "p99 over 10 s" is the right end of the Latency title.

- **The hint line** (full layout only) shows keys that exist today. Board: Checklist `C`, Mark this moment `M`, Commands `⌘K`, Stage mode `F2`. Checklist: Load show `L`, Mark this moment `M`, Commands `⌘K`, Stage mode `F2`. The old "⌘K Commands" mark in the detail column goes.

- **The header status** is worked out by one pure function from data the app already reads, and shown on every screen.

  | Situation | Tone | Text |
  |---|---|---|
  | The link has never opened | wait | `Connecting` |
  | The link dropped, or the engine is restarting | wait | `Restarting` |
  | No show playing; the checklist has rows in fault | fault | `1 fault`, `N faults` |
  | No show playing; rows waiting | wait | `N waiting` |
  | No show playing; all ready | well | `All well` |
  | Show playing; the band is a fault | fault | `1 fault`, `N faults` (the active faults; `Fault` when the count is 0) |
  | Show playing; the band is a warning | wait | the band's word, first letter capital |
  | Show playing; the band is ok | well | `All well` |

  The feed that supplies it opens its own engine socket, separate from the page's, and subscribes only to `state`, `clock`, `metrics` and `faults`. Reason: two stream providers on one socket lose the faults snapshot (see the comment on `streamProvided` in `Perform.tsx`). Cost: one more socket per browser tab and a second poll of the devices list.

- **The look switch.** Arrow keys move the focus between Dark, Light and Stage without choosing; Space or Enter chooses. So going from Dark to Stage by keyboard never flashes the light look on a dark stage.

- **Panel titles** are weight 400 (the spec's value), and a Panel can be given its heading level.

## Review Focus

1. **A bar number of 1000 or more** (a whole set in one Reaper project) fits in the Song panel in both layouts and nothing beside it moves. (Task 4)
2. **A long fault sentence in the band** (for example "universes 1, 2, 3, 4 not sending, not in the venue") never pushes the words off the band, and its full text can be read. (Task 4)
3. **A rig with 4 universes and 60 fixtures at 1024 × 768** keeps the band, the Song panel and Emergency in view; only the middle and right columns scroll. (Task 7)
4. **The engine restarting while the board is up** keeps every panel in place: the ticks become the three steps in the same box, program rows dim, universes say "holding", the header says `Restarting`. (Tasks 4, 5, 9)
5. **A look change while a hold is in progress** (F2 during a Blackout hold) keeps the hold running and the fill where it was. (Task 6)

---

### Task 1: Steady the five tests that fail under load

**Files:** `apps/web/e2e/perform.spec.ts` (the test at line 116), `apps/web/e2e/scroll.spec.ts` (line 175), `apps/web/src/debug/__tests__/` (useLookBack, case L6), `apps/web/src/show/__tests__/page.test.tsx` (case I3), `packages/ds/src/show/` stories for Dialogs (the merge stories' axe check).

Use superpowers:systematic-debugging for each. These pass alone and fail when the machine is busy.

- [ ] **Step 1: Reproduce each under load.** Run the test 10 times while a second gate runs beside it (for example `pnpm -F @ptah-app/ds test` in another shell). Record which of the five fail and the failing line.
- [ ] **Step 2: Find the cause of each.** The expected shape is a wait on time (a fixed timeout, a `sleep`, a default 5 s expect) where a wait on a condition is needed. Write the cause down before changing anything.
- [ ] **Step 3: Fix the test** (never the product code, unless the cause is a real race in it, in which case stop and report). Replace the timed wait with a wait on the condition.
- [ ] **Step 4: Run each 10 times under the same load** — 10 of 10 green. A test whose cause was not found after one investigation is listed in the report with what was ruled out; it is not retried blindly.
- [ ] **Step 5: Commit**: `git commit -am "test: wait on conditions in the five tests that failed under load"`

### Task 2: Shared pieces the Live screen needs

**Files:**
- Modify: `packages/ds/src/components/Panel/` (`Panel.tsx`, `.module.css`, its test and stories), `packages/ds/src/primitives/Digits/`, `packages/ds/src/components/NoticeLine/`, `packages/ds/src/components/Choice/`, `packages/ds/src/shell/LookSwitch.tsx`, `packages/ds/src/mode.ts`, `packages/ds/src/__tests__/mode.test.ts`, `packages/ds/src/tokens/tokens.ts`, `build.ts`, `tokens.css` (generated), `docs/design-system.md`

**Interfaces:**
- Produces: `<Panel level?: 2 | 3 | 4>` (default 2; the title's heading level); a `Panel tone="sand"` in the stage look keeps a 1 px `--sand-line` outline, since its fill is dropped (Emergency is the first sand panel); `setDigits(el, text)` unchanged in signature, writing only the cells whose character changed; `<NoticeLine>` unchanged in props, its full text in a tooltip when cut; `<Choice activation?: "auto" | "manual">` (default `auto`, today's behaviour; `manual`: arrows move focus only, Space or Enter chooses); tokens `--fs-number-lg: 96px`, `--lh-number-lg: 96px`, `--fs-number-sm: 76px`, `--lh-number-sm: 76px`.

- [ ] **Step 1: Write the failing tests.**

```ts
test("a Panel's title is the given heading level", () => {
  render(<Panel title="Song" level={3} />);
  expect(screen.getByRole("heading", { level: 3, name: "Song" })).toBeTruthy();
});
test("setDigits leaves an unchanged cell's node alone", () => {
  setDigits(el, "049.2");
  const first = el.querySelectorAll("[data-cell]")[0];
  setDigits(el, "049.3");
  expect(el.querySelectorAll("[data-cell]")[0]).toBe(first);
  expect(el.textContent).toContain("049.3");
});
test("a manual Choice moves focus with the arrows and chooses with Space", async () => {
  const onChange = vi.fn();
  render(<Choice aria-label="Look" activation="manual" value="dark" onChange={onChange}
    options={[{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }, { value: "stage", label: "Stage" }]} />);
  screen.getByRole("radio", { name: "Dark" }).focus();
  await user.keyboard("{ArrowRight}{ArrowRight}");
  expect(onChange).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(screen.getByRole("radio", { name: "Stage" }));
  await user.keyboard(" ");
  expect(onChange).toHaveBeenCalledWith("stage");
});
test("stored light and no stored base: stage, then F2, returns to light", () => {
  localStorage.setItem(MODE_STORAGE, "light");
  initMode(root);
  setMode("stage", root);
  expect(toggleStage(root)).toBe("light");
});
test("a base set in this session wins over a stale stored one", () => {
  setMode("light", root);
  localStorage.setItem(BASE_STORAGE, "dark"); // another tab wrote it
  setMode("stage", root);
  expect(toggleStage(root)).toBe("light");
});
```

Also: in a Storybook play with `data-mode="stage"`, a sand Panel's computed outline or border is 1 px and not transparent; a cut `NoticeLine` exposes its whole sentence (the tooltip has `role="tooltip"` and the line is reachable by Tab only when it is cut); the Panel title's computed `font-weight` is 400 (a Storybook play, since jsdom has no layout).

- [ ] **Step 2: Run**: `pnpm -F @ptah-app/ds test -- Panel Digits NoticeLine Choice mode` — FAIL.
- [ ] **Step 3: Implement.** `LookSwitch` passes `activation="manual"`. Document the four tokens and the two new props in `docs/design-system.md`.
- [ ] **Step 4: Run** the tests, `pnpm -F @ptah-app/ds tokens:build`, `pnpm -F @ptah-app/ds test:storybook` — PASS.
- [ ] **Step 5: Baselines.** The title weight moves every board with a Panel: `df -h /System/Volumes/Data | tail -1`, then `pnpm -F @ptah-app/ds update:visual`. Owner looks at Panel and the look switch.
- [ ] **Step 6: Commit** (code, then baselines separately).

### Task 3: The header status, in the design system

**Files:**
- Create: `packages/ds/src/shell/status.ts`, `packages/ds/src/shell/__tests__/status.test.ts`
- Modify: `packages/ds/src/shell/HeaderStatus.tsx`, `Shell.tsx`, `Shell.module.css`, `packages/ds/src/shell/index.ts`, `packages/ds/src/stories/Shell.stories.tsx`

**Interfaces:**
- Consumes: `ChecklistModel` (`perform/checklist/model.ts`), `PerformModel["band"]` and `activeFaults` (`live/perform/model.ts`), `LinkStatus`.
- Produces:

```ts
export type HeaderStatusValue = { tone: "well" | "wait" | "fault"; text: string };
export function deriveHeaderStatus(i: {
  link: LinkStatus;
  /** The engine says it is restarting (the checklist's engine row word, or the band's). */
  restarting: boolean;
  /** No show is playing: the checklist's model. */
  checklist: ChecklistModel | null;
  /** A show is playing: the board's band and its active faults. */
  board: { band: PerformModel["band"]; activeFaults: number } | null;
}): HeaderStatusValue | undefined; // undefined: nothing known yet, the slot stays empty
```

- [ ] **Step 1: Write the failing tests**: one per row of the header status table above, named after the row; `1 fault` and `3 faults` (plural); a checklist with both waiting and fault rows gives the fault; `checklist` and `board` both null with an open link gives `undefined`. For `HeaderStatus`: in square mode a change of text is announced (the text is present as visually hidden text inside the `role="status"` region, not only as an `aria-label`); in text mode a text wider than the slot is cut and its full text is in a tooltip, reachable by Tab only then.
- [ ] **Step 2: Run**: `pnpm -F @ptah-app/ds test -- shell` — FAIL.
- [ ] **Step 3: Implement.** A checklist row counts as a fault when its `tone` is `"fault"`, and as waiting when its `readiness` is not `"ready"` and its tone is not `"fault"`.
- [ ] **Step 4: Squeeze plays.** In `Shell.stories.tsx` add a story per status text of the table (`All well`, `12 waiting`, `Restarting`, `Connecting`, `12 faults`) at each `SQUEEZE` edge and one pixel under it (1240, 1239, 1140, 1139, 1110, 1109) and at 1024. Each play asserts: no place or tool is cut or wrapped, the look switch's `left` is the same for every text at that width, and the header is 52 px high. Change the thresholds if a play fails.
- [ ] **Step 5: Run** `pnpm -F @ptah-app/ds test -- shell && pnpm -F @ptah-app/ds test:storybook` — PASS; `pnpm -F @ptah-app/ds update:visual -- --only shell`. Owner looks at the header with each status.
- [ ] **Step 6: Commit**: `git commit -am "feat(ds): the header status, worked out from the checklist and the board"`

### Task 4: The band, the Song panel and the Transport

**Files (modify):** `packages/ds/src/perform/StatusBand.tsx`, `StatusWords.tsx`, `SongBlock.tsx`, `Transport.tsx`, `Transport.module.css`, `Perform.module.css`; `packages/ds/src/primitives/BarProgress/`; `packages/ds/src/stories/Transport.stories.tsx`; tests beside each.

**Interfaces:**
- Consumes: `Panel` with `level`, `Digits`, `Tooltip`, `Button`, `Kbd`, the number tokens (Task 2).
- Produces: `<StatusBand band layout m? d?>` (`layout: "column" | "full"`; in `full` it is given the board's model `m` and the detail model `d` from `deriveDetail`, and draws the words at its right end: the show's name and "previewing" mark and the songs count from `d`, the Clock word, BPM and Outputs from `m`); `<SongBlock m layout>` (a `Panel`; in `full` it takes `children` for the Transport under the ticks); `<BarProgress size="display" digits?: 3 | 4>` is unchanged for callers: it works out three or four digits from the bar itself and sets `data-digits` on its root; `<Transport>` unchanged in props.

- [ ] **Step 1: Write the failing tests.**
  - Band: for each of the three tones the region keeps `role="status"`, its label and word as today; a 120-character word is cut (`scrollWidth > clientWidth` in a Storybook play) and its full text is in a tooltip; in `full` the words zone has the same `left` and `width` for the tone `ok` and the tone `fault` (Review Focus 2).
  - Changing numbers in the band use `Digits`: BPM, Outputs, the "For" duration, the active faults count. In a play, BPM going from `99.9` to `100.0` moves nothing beside it.
  - Song: the bar reads `049.2` for bar 49 beat 2; `data-digits="4"` from bar 1000; in a play, the number's box is the same width for bar 999 and bar 1000 in each layout (Review Focus 1); the ticks and the restart steps occupy a box of the same height and top (Review Focus 4); the three steps show their states (`active`, `done`, `pending`, `ok`, `fault`) as data attributes.
  - Transport: today's tests stay green untouched (keys P, S held, H; "no transport" and its tooltip).
- [ ] **Step 2: Run**: `pnpm -F @ptah-app/ds test -- perform BarProgress` — FAIL.
- [ ] **Step 3: Implement** from the boards. Band: a 4 px left stripe and an 8 px square in the tone; `ok` on `--panel`; `warn` on `--sand-panel` with `--sand` text; `fault` a `--fault` fill with `--on-fault` text (in stage, an outline in `--fault`). Ticks: past beats `--tint`, the current beat `--sand`, the rest outlined. Transport: Start is the primary button, Stop and Go to start are plain, each with its key cap; under them the words that are there today.
- [ ] **Step 4: Run** the tests and `test:storybook` for `perform` — PASS. `pnpm -F @ptah-app/ds update:visual -- --only perform-transport`.
- [ ] **Step 5: Commit**: `git commit -am "feat(ds): Live band, Song panel and Transport in ZENITHALL"`

### Task 5: Active programs, DMX, Fixtures and dimmer

**Files (modify):** `packages/ds/src/perform/Programs.tsx`, `DmxStrip.tsx`, `DetailColumn.tsx` (the Fixtures and dimmer section moves out into `packages/ds/src/perform/Fixtures.tsx`), `Perform.module.css`; tests beside each.

**Interfaces:**
- Produces: `<Programs m layout>`, `<DmxStrip m universes width layout>`, `<Fixtures universes />` (exported from `Fixtures.tsx` with `levelOf`, which keeps its signature). In `full` each is a `Panel` (`level={2}`) titled "Active programs" (right: the count text the model gives), "DMX", "Fixtures and dimmer". In `column` they keep today's bare form, restyled.

- [ ] **Step 1: Write the failing tests**: each keeps its region name and its content as today (reuse the current assertions); a program row has the trigger chip, the name and the group badge, and "+ N more" when the model says so; rows carry `data-dim` while `m.programsDim`; a universe line ends with its word, and "not sending" has `data-fault`; `levelOf` cases unchanged; in a play, a row's height and top are the same dimmed and not dimmed.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** from the boards. Program rows: `--panel` fill, 4 px `--tint` stripe, `--gap-row` apart. "not sending": a `--fault` outline around the word. Fixture levels: the name in `label`, a 3 px track in `--line` with the level in `--tint`.
- [ ] **Step 4: Run** tests and `test:storybook` for `perform` — PASS.
- [ ] **Step 5: Commit**: `git commit -am "feat(ds): Live programs, DMX and fixture levels in ZENITHALL"`

### Task 6: MIDI, Latency, Faults, Emergency

**Files (modify):** `packages/ds/src/perform/MidiBlock.tsx`, `LatencyRow.tsx`, `DetailColumn.tsx` (its Faults, Last inputs, device names and sparklines move into `Faults.tsx`, `MidiPanel.tsx`, `LatencyPanel.tsx`; `DetailColumn.tsx` is deleted when empty), `Emergency.tsx`, `HoldButton.tsx`, `Perform.module.css`, `packages/ds/src/perform/__tests__/detail.test.tsx` (follows the moves), `packages/ds/src/primitives/FaultLine/`.

**Interfaces:**
- Consumes: `DetailModel` from `deriveDetail` (unchanged), `Explain`, `EmptyState`, `Sparkline`, `Digits`.
- Produces: `<MidiPanel m d />` (full: title "MIDI", right: "Devices n / N" as an `Explain` and "Unmapped N" in `--sand` when N > 0; body: the Last inputs table); `<MidiBlock m />` (column, today's line); `<LatencyPanel m d />` (title "Latency", right "p99 over 10 s"; three rows: name, sparkline, value); `<LatencyRow m />` (column); `<Faults d />` (title "Faults", right "active first"; rows; the empty state); `<Emergency>` unchanged in props, plus `layout`.

- [ ] **Step 1: Write the failing tests.**
  - Every text of today's detail column is still found: the faults head line and counts, a fault row's code, subject, count and age, "cleared 3 s ago", the Last inputs heads and "unmapped", each device's name, "checked every second" (inside the `Explain` tooltip).
  - Changing numbers use `Digits`: the latency values, the ages, the unmapped count. In a play, a value going from `9 ms` to `10 ms` does not move the label beside it.
  - Emergency: today's tests stay green untouched (hold 600 ms, early release cancels, keys R, L, B, F, the disabled Restart with "Restart needs ptah supervise", dimmed while the link is down). New: Blackout on and Freeze on set `aria-pressed="true"` and `data-on`; in a play, changing `data-mode` on `<html>` during a hold leaves the hold running and completes it (Review Focus 5).
  - `FaultLine` reserves its widths with `Digits`, not `ch`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** from the boards. Emergency is a `Panel tone="sand"`; each action is a row with a 4 px `--sand` stripe on `--sand-panel`, its key cap at the right, and "hold" or "on / off" as today's words give them; the hold's filling line is 2 px of `--sand` along the row's bottom edge; an action that is on is a `--sand` fill with `--on-sand` text; the disabled Restart is hatched. An active fault row: 4 px `--fault` stripe on `--fault-panel`; a cleared one: `--tint-dim` on `--panel`. No faults: the hatched `EmptyState` with the words the code has today.
- [ ] **Step 4: Run** tests and `test:storybook` for `perform` — PASS.
- [ ] **Step 5: Commit**: `git commit -am "feat(ds): Live MIDI, latency, faults and Emergency in ZENITHALL"`

### Task 7: The board's two layouts

**Files:**
- Modify: `packages/ds/src/perform/Perform.tsx` (the `return` of `Page` only; nothing above it), `Perform.module.css`, `packages/ds/src/stories/Perform.stories.tsx`, `packages/ds/src/stories/perform/scenario.ts` (a 4-universe, 60-fixture rig if none exists), `packages/ds/scripts/test-visual.mjs`

**Interfaces:**
- Consumes: every piece of Tasks 4 to 6, `HintLine`.
- Produces: `PerformProps` unchanged, except that `width` is the column's width in `column` only; in `full` the board fills its parent. New stories: `Light`, `FullLight`, `PhoneLight`, `FullFault` (from `OutputLost`'s scenario), `FullRestart` (from `EngineRestart`'s), `FullLargeRig` at 1024 × 768, `FullBar1000`. New visual boards: `perform-full-light`, `perform-light`, `perform-phone-light`, `perform-full-fault`, `perform-full-restart`, `perform-full-large`.

- [ ] **Step 1: Write the failing tests** (Storybook plays, since they measure layout).
  - `Full` at 1280 × 800: the band, then three columns holding the panels of the table in "Decisions", in that order; the hint line at the bottom with its four keys; the page does not scroll.
  - `FullLargeRig` at 1024 × 768: the band, the Song panel and Emergency are fully inside the viewport; the middle column scrolls and takes focus (Review Focus 3).
  - `Phone` at 390 × 844: one column in today's order; Emergency and the Transport are inside the viewport; only the middle scrolls.
  - `FullRestart`: every panel has the same box (`getBoundingClientRect`) as in `Full` (Review Focus 4).
  - The existing plays of `Flips`, `FlipsFull`, `Large`, `PageCommands`, `PhoneInShell`, `FullInShell` stay green; change them only where they name the old detail column.
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test:storybook` — FAIL on the new ones.
- [ ] **Step 3: Implement** the two layouts. The region keeps `aria-label="Perform"` and "Show state"; the old `aside` named "Details" goes (its content now sits in named panels).
- [ ] **Step 4: Performance.** Run the existing perf stories and budget tests (`pnpm -F @ptah-app/ds test -- perf`, the `live-perf--*` plays): the board still renders at most ten times a second from engine time, and a frame never re-renders a panel. Report the numbers before and after.
- [ ] **Step 5: Run** tests and Storybook — PASS. `df -h /System/Volumes/Data | tail -1`, then `pnpm -F @ptah-app/ds update:visual -- --only perform`. Owner looks at Perform: Normal, Phone, Full, FullFault, FullRestart, each in dark, light and stage.
- [ ] **Step 6: Commit** (code, then baselines).

### Task 8: The checklist, the show picker, the phone link

**Files (modify):** `packages/ds/src/perform/checklist/Checklist.tsx`, `Checklist.module.css`; `packages/ds/src/perform/picker/ShowPicker.tsx`, `ShowPicker.module.css`; `packages/ds/src/perform/phone/PhoneLink.tsx`, `PhoneLink.module.css`; `packages/ds/src/stories/Checklist.stories.tsx`, `ShowPicker.stories.tsx`, `PhoneLink.stories.tsx`; `packages/ds/scripts/test-visual.mjs`; tests beside each.

**Interfaces:**
- Produces: `ChecklistProps` gains `layout?: "column" | "full"` (default `column`) and `show?: { name: string; venue: string | null; patch: number | null; songs: number | null } | null`. In `full`: a `Panel` "Checklist" (the band, then the eight rows) on the left; on the right a `Panel` "Show" (a stat grid of Name, Venue, Patch, and Songs only when `songs` is not null; then the Load show button; then the show row's reason, for example "L to load") and a `Panel` "Phone" (the QR and the address, or "local only" on a hatched block); the hint line at the bottom. `ShowPickerProps` and `PhoneLinkProps` are unchanged.

- [ ] **Step 1: Write the failing tests.**
  - Each row keeps its label, word and reason (today's assertions). A ready row has a tick, a waiting row the sand `!` `Badge`, a fault row a red `×`; each mark is `aria-hidden` and the row says its state in words: `data-readiness` stays, and the row's accessible name is "label, word, reason".
  - In a play: a row's box is the same in the three states; the word column starts at the same `left` in every row.
  - `full`: three panels and the hint line with Load show `L`; `show={null}` draws the Show panel with "no show" as the row gives it and the button still there; `songs: null` draws no Songs cell.
  - The Load show button is 44 px high or more and has `aria-keyshortcuts="L"`.
  - ShowPicker and PhoneLink: today's tests stay green untouched.
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test -- checklist picker phone` — FAIL.
- [ ] **Step 3: Implement** from `I-Live-Checklist.png`. Rows: `--panel` fill and a 4 px `--tint` stripe when ready; `--sand-panel` and a `--sand` stripe when waiting; `--fault-panel` and a `--fault` stripe in fault. The band: as the board's band (Task 4), reading the model's text. The picker and the phone link need only their own spacing and type brought to the tokens; the Dialog is already restyled.
- [ ] **Step 4: Stories.** Add `Full`, `FullReady`, `FullMissing`, each also in light and stage; light variants of `Cold`, `Waiting`, `Missing`, `Ready`; light variants of the picker's `OneVenue`, `SeveralVenues`, `Empty`. Add boards `checklist-full`, `checklist-full-light`, `checklist-full-stage`, `checklist-full-missing`.
- [ ] **Step 5: Run** tests and Storybook — PASS; `pnpm -F @ptah-app/ds update:visual -- --only checklist` and `--only picker`, `--only phonelink`. Owner looks at the checklist (full and column) and the picker in the three looks.
- [ ] **Step 6: Commit** (code, then baselines).

### Task 9: Wiring in the app

**Files:**
- Modify: `apps/web/src/perform/PerformPage.tsx`, `apps/web/src/App.tsx`, `apps/web/src/__tests__/app.test.tsx`, the Perform page tests in `apps/web/src/perform/__tests__/` (or where they live today), `apps/web/e2e/perform.spec.ts`
- Create: `apps/web/src/status/HeaderStatusFeed.tsx`, `apps/web/src/status/__tests__/feed.test.tsx`

**Interfaces:**
- Consumes: `deriveHeaderStatus` (Task 3), `Checklist` with `layout` and `show` (Task 8), `Perform` (Task 7), `usePageSource`, `useEngineData`, `useRig`, `deriveChecklist`, `derivePerform` (all existing, unchanged).
- Produces: `<HeaderStatusFeed onStatus={(s: HeaderStatusValue | undefined) => void} source?: StreamSource />`, rendering nothing; `App` keeps the last value in state and passes it to `<Shell status>`.

| State | Event | Result |
|---|---|---|
| App starts, no socket yet | — | no status; the slot is empty |
| Socket opening | — | `Connecting` |
| Open, no show | data arrives | the checklist's count, or `All well` |
| Open, show playing | data arrives | the band's tone and text |
| Open | the socket drops | `Restarting` within one second |
| Dropped | the socket opens again | back to the derived value |
| Any | the place changes (Live to Show) | the feed stays mounted; the status does not blink or reset |
| Any | the same value is derived again | `onStatus` is not called again (no re-render of the Shell) |
| Live, full, no show | — | `Checklist layout="full"` filling the page, with `show` from the remembered show |
| Live, column, no show | — | `Checklist layout="column"`, at most 440 px |
| Live, show playing, C | — | the dialog holds `Checklist layout="column"` |

- [ ] **Step 1: Write the failing tests**: one per row of the table (the feed with a fake source, as the page tests do); the feed subscribes to `state`, `clock`, `metrics`, `faults` and to nothing else, and never to frames; `App` passes the feed's value to the header on `/show` as well as on `/live`.
- [ ] **Step 2: Run** `pnpm -F @ptah-app/web test` — FAIL.
- [ ] **Step 3: Implement.** The feed owns one socket through `usePageSource(given)` and its own `StreamProvider`; `engineNow` is passed as `null` to `derivePerform`. In `PerformPage`, `show` for the checklist comes from `remembered`, `shows` and `data.venues`; `songs` is passed only if the show list item already carries a count, else `null`. In `full` the page gives the board and the checklist the whole width; the `width: lay.width` wrapper stays for `column` only. Replace `var(--bg)` in the page's inline style with `var(--ground)`.
- [ ] **Step 4: Update the e2e spec** where it looks for things by the old layout only (the detail column, the old place of the ⌘K mark). Add to the long test at line 116: the header says `N waiting` on the cold checklist and `All well` once the show plays with the clock locked; after the restart step it has said `Restarting`. Add one assertion to the phone test: Emergency and the Transport are in the viewport.
- [ ] **Step 5: Run** `pnpm -F @ptah-app/web test && pnpm -F @ptah-app/web test:e2e` — PASS.
- [ ] **Step 6: Commit**: `git commit -am "feat(web): Live in ZENITHALL, the header status on every screen"`

### Task 10: Checkpoint

- [ ] **Step 1:** `df -h /System/Volumes/Data | tail -1`; `du -sh target`; clean per AGENTS.md if needed.
- [ ] **Step 2:** `pnpm allcheck` — green. A failure that passes when re-run alone is reported as load, with the output, and checked against Task 1's list.
- [ ] **Step 3:** Start the app as the e2e rig does (a temporary root copied from `fixtures/`, `--fake-io`, never `~/.ptah`). Walk: the cold checklist, Load show, the board, C, M, ⌘K, the layout override, Blackout hold, Freeze, a restart, F2 and the look switch by keyboard, a 390 px window, the header status on each of the six places. Save a screenshot of each to the plan's workspace.
- [ ] **Step 4:** In `docs/design-system.md`, under "ZENITHALL (in progress)", add a short "Live" section: the faces, the band's three tones, the bar number sizes, the header status table. In `~/projects/ptah/docs/superpowers/plans/2026-11-19-v2-redesign-deferred.md`, strike out the plan 2 lines that are done and leave any that are not, with a note.
- [ ] **Step 5:** Owner check of the running app: the checklist, the board in the three looks, the phone board, the header status. Commit: `git commit -am "docs(ds): Live in ZENITHALL"`.
