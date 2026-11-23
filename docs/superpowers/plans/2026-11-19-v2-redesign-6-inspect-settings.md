# Redesign 6 of 7: Inspect and Settings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Inspect (today's Debug: Live and Look back) and Settings their ZENITHALL screens, with the two new things the spec lists for them: "Find a light" and "Notes as" on Inspect.

**Architecture:** Every piece in `packages/ds/src/debug`, `packages/ds/src/debug/back` and `packages/ds/src/settings` is restyled in place with the same data, roles and words. The models (`debug/model/*`, `debug/back/model/*`, `settings/model/*`) and the app's hooks (`apps/web/src/debug/use*.ts`, `apps/web/src/settings/use*.ts`) keep their behaviour. Three things move: Timing goes from the third column to the second and Problems goes first in it; the why panel becomes a sand panel in a fixed slot under the grids; on Settings, Reaper offset goes first and Engine is folded.

**Tech Stack:** TypeScript, React, CSS modules with tokens only, Vitest, Storybook, Playwright (visual and e2e), Biome.

**Spec:** `~/projects/ptah/docs/superpowers/specs/2026-11-19-v2-redesign-design.md` (sections "Inspect", "Settings", "Across the app", "The look in numbers", the Inspect and Settings feature tables, "Homes for the items the first tables missed", "Calls I made", "Settled with the owner"). Inventory: `2026-11-19-v2-redesign-inventory.md`, section 7. Code: `~/projects/ptah-v2`, branch `redesign-inspect-settings` from `master`.

**Boards (the drawings to match):** in `~/projects/ptah/docs/superpowers/specs/2026-11-19-v2-redesign-boards/png/`. Open them with the Read tool before styling.

| Board | Shows |
|---|---|
| `Q-Inspect-Live.png` | Inspect, Live: the bar, the three columns, a light picked with its why panel, the Pause tooltip |
| `Q-Inspect-Back.png` | Inspect, Look back: the bar, the timeline panel, the three columns |
| `S-Settings.png` | Settings: the bar, Reaper offset as three steps, the panels, Engine folded with a change |
| `T-10-debug-live.png`, `T-11-debug-look-back.png`, `T-12-settings.png` | Today's screens, for what must still be there |
| `X-Phones.png` | The phone views |

Markup: `…-boards/html/<name>.dc.html`. Where a board and this plan differ, this plan wins; where a board's words differ from the code's, the code's words win. Two known differences: the Settings board writes "needs a restart" on the network fields (the code and the spec say "Applies the next time you start PTAH"), and it shows no hint sentence (this plan adds one).

**What plans 2 to 5 set, to follow here:** `packages/ds/src/show/`, `builder/` and `venue/` for the patterns: a `Panel` per region with `level`; `Digits` for changing numbers; `useWholeWhenCut` with `Tooltip disabled` for cut text (not a `title` attribute); `Explain` for a word with a tooltip; `Choice` for one-click choices; the `NoticeLine` `{ tone, text, action? }` on one fixed 24 px line (a refusal ends at the next action; a fault never waits behind a sand notice); `HintLine`; `Dialog tone="danger"` with `<Button confirm>`; main buttons always in view down to 900 px, names give way first; a thin always-visible scrollbar on a panel that scrolls; Storybook plays for anything measured; light and stage stories beside each story. From `packages/ds`, visual boards are regenerated with `pnpm update:visual --only <name>` (the `--` form fails; `--only` matches by prefix).

## Global Constraints

- Exactly today's features, no less, no more, plus the two new things: "Find a light" (Inspect, Live) and "Notes as numbers | letters" on Inspect, sharing Show's choice (`packages/ds/src/notesAs.ts`).
- Inside the screens, today's wording is kept: every label, word, fault, refusal, state, toast, dialog text and command title stays as it is in the code. The only new words are the ones this plan lists.
- Nothing shifts: picking a light, a message arriving, a row ending, a pause, a fault, a band state, folding Engine's neighbours, a look change or a value change never moves or resizes anything else. Engine opening is the one move, and it moves only what is under it in its own column.
- Calm when well, loud only when wrong: `fault` appears only for a fault.
- Tokens-only styling. Gaps use `--gap-panel` and `--gap-row`; line heights use `--lh-*`. On a sand fill, text uses only `--on-sand`; on a `--sand-panel`, `--sand`. Biome only.
- The logic is not touched: no change to what the existing functions of `debug/model/*`, `debug/back/model/*`, `settings/model/*` return, nor to `apps/web/src/debug/{useMonitor,useLookBack}.ts`, `apps/web/src/settings/{useSettings,useRestart,useDevicesNow}.ts`, the server or the engine. New pure functions and new optional parameters whose default gives today's result may be added.
- The cost per frame does not rise: the visual gate's burst check on `debug-screen--burst` stays within its budget, and the 512 cells are still painted in place (no React render per frame).
- Story ids keep their names (`debug-parts--…`, `debug-parts-why--…`, `debug-screen--…`, `debug-back-parts--…`, `debug-back-screen--…`, `settings-sections--…`, `settings-screen--…`, `settings-phone--…`); light and stage stories are added beside them.
- No new dependency. Never start V1 services or pm2; never touch `~/.ptah` or `~/ptah-home`; leave the untracked `docs/design/brief/` and `.ignore` alone; the Storybook servers on 6006–6008 stay up; no push unless the owner asks.
- Disk (AGENTS.md): `df -h /System/Volumes/Data | tail -1` before a heavy run; below 30 GB free, clean first and tell the owner. No extra worktree.
- At most three agents at once. A design-system task runs the visual gate for its own boards, then `pnpm -F @ptah-app/ds test:visual` must pass; the full gate runs at the checkpoint. Do not run the ds tests side by side with the web tests. A task that changes a layout also runs `apps/web/e2e/scroll.spec.ts`.
- Every task that changes how something looks ends with the owner looking at its Storybook stories before the task is closed.

## Decisions this plan makes

### Inspect

- **The bar** (both views), one line. Left: the `Live | Look back` switch, a thin rule, the four chips (`notes`, `CC`, `other`, `only what nothing listens to`), then "Notes as" with its `numbers | letters` choice (Show's control and words). Right, on Live: "Paused at bar 12.3" (in `sand`, its slot always held), "<show> on <venue>" or "No show is playing", and Pause / Resume with its key cap. Right, on Look back: ◀ `[`, ▶ `]`, Play / Stop `Space`, "Mark now" `M`. Down to 900 px the switch and the right-hand buttons stay whole; "<show> on <venue>" is cut first (whole text in a tooltip), then "only what nothing listens to" is cut, then "Notes as" loses its label.

- **Live, at 1080 px of the screen's own width and wider**: three columns of panels, each column scrolling inside itself; the window does not scroll.

  | Column | Panels, top to bottom |
  |---|---|
  | 1 | **Coming in** (fills the column): the device lines, the clock line, the messages table |
  | 2 | **Problems**, **Playing now**, **Overrides**, **Timing** ("last 10 s" at the right of its title) |
  | 3 | **Going out** (takes the rest, scrolls inside), then the why slot, 300 px high, always there |

  Below 1080 px: one column in the order Coming in, Problems, Playing now, Overrides, Timing, Going out, the why panel; natural heights; the page scrolls. This is also the phone view.

- **Coming in.** Device lines: a square mark, the name in `bright`, its word in `tint-dim` (the deferred "current line reads dim words as full ink" is fixed here: only the name and a number that matters are full ink). The clock line is `tint-dim`. The table's heads are `label`; a note-off row is dim; "nothing listens" is `sand`; the gap line ("— paused 14 s —") is a centred `label` line. Ages and bar numbers are `Digits`.

- **Problems** is first in its column. With none: a 24 px hatched block labelled "none". With some: one row each with a `fault` stripe (a warning: `sand`), "code subject" and its age at the right. "engine restarting" and "no data from the engine" are a `sand` row. The panel grows downward with its rows and scrolls inside itself past six, so a new problem moves Playing now down: this is the one loud move on the screen, and it is wanted.

- **Playing now.** A row has a `tint` stripe, its name and its age (`Digits`); an ended row is dim with "ended" for the 2 s it lingers. The panel holds a fixed height of six rows and scrolls inside past that, so rows starting and ending move nothing outside it. The footnote and the two states ("No show is playing", "not available on a replay", as hatched empty states) are today's words.

- **Overrides**: four cells, two by two (Master, Blackout, Freeze, House lights), label left and value right. A value that is on (Blackout on, Freeze on, House lights on, Master under 100 %) is `sand`.

- **Timing**: today's table (usual, worst), numbers in `Digits`, an `attention` line in `sand`; "Dropped" keeps its breakdown in a tooltip.

- **Going out.** For each universe, in venue order: its line (name in `bright`, output, state — `fault` when it needs attention — and "N frames/s" in `Digits`), its grid, and the readout line under it. "No venue yet." is the hatched empty state.

- **The grid.** Every cell is the same square, lit by value as today, 32 to a row. A light is a 1 px `line` outline tight around its cells, with no fill; a light that runs over a row's end is outlined on each row. The picked light has a doubled `sand` line and its name on a small `sand` tag laid over the grid just above its first cell (below it when the light is on the top row); the tag takes no room. Cells, arrows, Enter / Space, the hover readout and the paint-in-place are unchanged. Look back draws the same outlines when its frame is named, and no pick.

- **Find a light** (new). At the right of the Going out title: a field named "Find a light". Typing lists the venue's lights whose name contains the text, each as "name · <universe> a–b"; two lights with one name are both listed. Choosing one picks it exactly as a click on its first cell does (`?light=` follows) and scrolls its universe into view. "No light matches" when none does. While paused it is disabled, with the tooltip "Resume to pick a light". Hidden when there is no venue or no `why`.

- **The why panel** is a `Panel tone="sand"` in the slot under Going out, scrolling inside itself. Its title is the light's name; at the right "channels a–b · Esc clears". Each attribute row: the label and merged value at the left, the writers at the right (a filled square on the winner, an empty one on the others), the winner's reason at the far right. Then the override lines, then one tile per channel ("ch N name", its byte in `Digits`, its source). A cut name or value shows an ellipsis and gives its whole text in a tooltip (the deferred "values lose the ellipsis"). The loud lines ("frozen: this is the last frame") are `fault`. States: nothing picked → a hatched block labelled "Light"; a cell with no light, no usable type, no show → today's words in the panel; link lost → the panel dims as today.

- **Paused.** The bar says "Paused at bar…", the button reads Resume and is filled `sand`; every column holds as today; cells and Find a light do not pick; Esc still clears. The messages table scrolls while paused, as today.

- **Look back.** Under the bar, one **timeline panel**: its title is the moment ("21:42:07 · bar 49.3" in `bright`, `Digits`), at the right "14 min ago · <show> on <venue>" and the legend (▼ "your marks", ▼ in `sand` "problems", a hatched swatch "PTAH was not running"). In it: the session strip (activity bars in `tint-dim`, flags above, hatched gaps, the zoomed minute as a `sand` frame) with its two end labels, and the zoom strip (a tick per message, the cursor as a `sand` line, bar labels under it). Then three columns: **Came in** ("around this moment" at the right of its title; the message at the cursor is the picked row, `sand` with brackets); **Problems then**, **Was playing**, **Overrides**; **Went out** (per universe: name, "frame of hh:mm:ss" or "not recorded", grid, readout). "nothing recorded here" is a hatched empty state over the columns; "The recorder is off (Settings)." is the notice line, with Settings as its link. Keys, the URL and the one-column rule are unchanged.

- **Explanations** (new words, in tooltips):

  | Word | Tooltip |
  |---|---|
  | Pause | Pauses this page only. The lights keep running. |
  | only what nothing listens to | Shows only the messages no row of the show reacts to. |
  | Playing now | The rows of the show that are making light at this moment. |
  | Overrides | What is forced over the show: the master level, blackout, freeze and the house lights. |
  | Timing | How long PTAH takes from a note coming in to the light going out, over the last 10 seconds. |
  | Mark now | Puts a mark on the timeline at this moment, so you can find it again. |

- **The hint lines** (new words). Live: "Click a light, or find it by name, to see why it does what it does"; keys Pause `Space`, Clear the light `Esc`, Commands `⌘K` where the page has a palette today. Look back: "Top strip: the whole session. Below it: the minute around the cursor"; keys A frame `← →`, A bar `⇧ ← →`, Mark or problem `[ ]`.

### Settings

- **The bar**, one fixed line: "Settings" in `screen-title`; then the band's words (today's `bandWords`, cut with a tooltip when long); at the right its buttons, each in a held slot. Tones: `calm` → `tint`; a draft's count → `sand`; `dim` → `tint-dim`; `attention` → `sand`; `fault` → `fault`. Save / "Save and restart" / "Restart now" / "Keep mine" are the primary button. The header status already counts the changes (plan 1).

- **Layout at 900 px and wider**, two columns; the window scrolls as one page (Settings is a form, not a board).

  | Left | Right |
  |---|---|
  | Reaper offset | When PTAH starts |
  | MIDI inputs | Engine |
  | On the network | About |

  Below 900 px: one column, left first. Under 600 px: the read-only phone view, restyled.

- **Reaper offset, as three steps** in a row, joined by `»`:

  | Step | Holds |
  |---|---|
  | 1 | "On the LIGHTS track: Routing → Track playback offset" (today's sentence) |
  | 2 | "Set Track playback offset to" and the number, heavy (`−53 ms`, `Digits`) |
  | 3 | "Then tell PTAH" (new words) and the button "I typed it into Reaper" |

  At the right of the panel's title: "For <venue>, the venue PTAH is on." Under the steps, one line: the measure line at the left (measured / partly measured / estimated, as today) and the state at the right ("Not set in Reaper yet." in `sand`; "Reaper is set to X."; "…The advice is now Y." in `sand`). Then the per-universe breakdown, as today's terms. "Choose a venue on Perform first." and "This venue sends to no output." replace the three steps with a hatched block carrying the sentence (the words stay as the code has them). While the draft's frames per second differs from the file's, step 3's button is disabled with today's reason.

- **MIDI inputs.** At the right of the title: "Add a device" (its menu as today). A row per device with a `tint` stripe: Device (edited in place for PTAH's own port), Port, On (the square switch), Clock (a radio), Now, `···` (Remove). A refused device ("used by <show>") has a `sand` stripe. Under the rows: "Reaper transport port", its field and its status. One "Needs a restart" label sits by the panel's title (it covers the devices) and one by "Reaper transport port".

- **On the network**: "Other devices can open PTAH" with its switch; Port; Address; the QR at the right. Both fields carry the label "Applies the next time you start PTAH" (today's words).

- **When PTAH starts**: the two fields, no label (they apply at once).

- **Engine, folded by default.** Folded: the title, "rarely changed", an "Open ▾" button, and one line: "6 settings" at the left and, when a field inside differs from the saved file, a `!` badge and "N changed" in `sand` at the right. Open: the six fields, each with "Needs a restart", then "Back to defaults"; the button reads "Close ▴". A field inside with an error opens the panel and keeps it open (a fault is never folded away); the line then reads "N errors" in `fault`. The fold is not remembered: every visit starts folded unless an error or a change is inside.

- **The restart label** is a 16 px outlined chip in `tint-dim`, `label` style, after the field's name. It never wraps the name; when room is short the label wraps under the name.

- **About**: today's line.

- **Errors**: under the field, a line in `fault`, in a reserved line so the field below does not move. Read failures: the notice line under the bar. The leave guard and the restart question are the shared dialogs, with today's words.

- **Explanations** (new words, in tooltips):

  | Word | Tooltip |
  |---|---|
  | Clock | The device PTAH takes its tempo from. Only one can be the clock. |
  | Reaper offset | Lights are a little slower than sound. This moves the lights track earlier in Reaper so both land together. |
  | Reaper transport port | The port PTAH uses to start and stop Reaper from the Live screen. |
  | Needs a restart | This change takes effect after PTAH restarts. Save and restart does both. |
  | Realtime priority | Asks the computer to run the lights before anything else. |
  | Engine | How the part of PTAH that makes the light is tuned. Leave it unless something is wrong. |

- **The hint line** (new words): "Settings: how PTAH meets Reaper, your devices and the network"; keys Save `⌘S`, Commands `⌘K`.

### Leftovers taken here (the deferred file's "Plan 6" and "riding to plan 6")

Changing numbers on Inspect use `Digits` (Tasks 3, 4); the current line's dim words (Task 3); the why panel's ellipsis (Task 5); Show's "natural" and "every part" tooltips move from a wrapper `div` onto the control so they are announced, and Show's phone view follows "Notes as" (Task 1).

## Review Focus

1. **A burst of messages** (the gate's `debug-screen--burst`): the frame cost stays in its budget with panels, `Digits` and the light outlines; the outlines are drawn once per venue, not per frame. (Tasks 3, 4, 6)
2. **Lights that are awkward on the grid**: one that wraps over a row's end, one on channel 512, two that share channels, two with one name. Each is outlined, can be found by name and picked; the tag never leaves the grid. (Task 4)
3. **Paused**: no cell and no "Find a light" entry picks; Esc still clears; a chip change still re-filters the held lines; Resume shows the newest state at once. (Tasks 4, 6)
4. **An error inside the folded Engine** (a refused save naming an engine field): the panel opens, the field shows its line, the bar shows the first unplaced message as today, and the panel cannot be closed until the error is gone. (Task 9)
5. **Long names at 900 to 1280 px**: a 40-character show and venue, four universes, twelve MIDI devices. Pause, Save and "Add a device" stay whole and in view; nothing overlaps. (Tasks 2, 6, 8, 10)

---

### Task 1: Words, "Notes as" in the messages, and the Show leftovers

**Files:**
- Create: `packages/ds/src/debug/copy.ts`, `packages/ds/src/settings/copy.ts`, `packages/ds/src/debug/__tests__/copy.test.ts`
- Modify: `packages/ds/src/debug/model/words.ts`, `packages/ds/src/debug/back/model/moment.ts`, their tests, `packages/ds/src/debug/index.ts`, `packages/ds/src/settings/index.ts`; `packages/ds/src/show/` (the two tooltips and the phone view, with their tests)

**Interfaces:**
- Produces:

```ts
// debug/copy.ts
export const INSPECT_WORDS: Record<
  "pause" | "unheard" | "playingNow" | "overrides" | "timing" | "markNow", string>;
export const INSPECT_HINTS: Record<"live" | "back", string>;
// settings/copy.ts
export const SETTINGS_WORDS: Record<
  "clock" | "reaperOffset" | "transportPort" | "needsRestart" | "realtime" | "engine", string>;
export const SETTINGS_HINT: string;
export const THEN_TELL_PTAH = "Then tell PTAH";
// debug/model/words.ts — a new optional parameter; "letters" is today's result
export function messageWords(e: Judged, as?: NotesAs): string;
```

  Every function that builds a `Line` or compares by `messageWords` (in `words.ts`, `moment.ts` and the app's hooks) gains the same optional `as` and passes it on, so both sides of the comparison in `moment.ts` use one form.

- [ ] **Step 1: Write the failing tests**: every key of the four word tables equals its sentence above; `messageWords(noteOn60)` is today's string, `messageWords(noteOn60, "numbers")` reads `note 60  vel 100`; note-off and aftertouch follow; a `Moment` built with `"numbers"` still finds the line at the cursor (the `moment.ts` comparison). Show: "natural" and "every part" are named and described on the control itself (`getByRole` with its description); the phone view shows `60` with "numbers" and `C3` with "letters".
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test -- copy words moment show` — FAIL on the new ones.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same — PASS; every existing test of `words` and `moment` is green untouched.
- [ ] **Step 5: Commit**.

### Task 2: The Inspect bar

**Files (modify):** `packages/ds/src/debug/MonitorBar.tsx`, `packages/ds/src/debug/back/BackBar.tsx`, `Debug.module.css` and `back/Back.module.css` (the bars' rules), both `Parts.stories.tsx`, both `__tests__/parts.test.tsx`.

**Interfaces:**
- Consumes: `Choice`, `Explain`, `Tooltip`, `useWholeWhenCut`, `useNotesAs`, `INSPECT_WORDS`.
- Produces: `MonitorBarProps` and `BackBarProps` unchanged, plus an optional `notesAs?: { value: NotesAs; onChange(v: NotesAs): void }` on both (left out, the bar reads and writes `useNotesAs` itself).

- [ ] **Step 1: Write the failing tests.** Today's bar tests stay green, changed only where a chip's role changed. New: the items in the order of the decision; "Notes as" is a radiogroup with `numbers` and `letters` that calls `onChange`; Pause has the tooltip of the table and `aria-keyshortcuts="Space"`; paused, the button reads Resume and carries `data-paused`; the paused word's slot has the same box empty and filled; on Look back, ◀ ▶ are disabled from `canPrev` / `canNext`, Play reads Stop while playing, "Mark now" has its tooltip, and `off` (the recorder is off) disables the four. Plays at 1280, 1024 and 900 px with a 40-character "<show> on <venue>": the bar is one line; the switch and the right-hand buttons are whole and inside the bar; the name is cut and gives its whole text (Review Focus 5).
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test -- parts` — FAIL on the new ones.
- [ ] **Step 3: Implement** from the top of the two Inspect boards.
- [ ] **Step 4: Run** tests and Storybook — PASS. Boards: `debug-parts-bar`, `debug-back-parts-bar`, each in the three looks and at 900.
- [ ] **Step 5: Commit** (code, then baselines).

### Task 3: Coming in and the middle column

**Files (modify):** `packages/ds/src/debug/{DeviceLines,MessageList,Problems,PlayingRows,Overrides,TimingTable}.tsx`, `Debug.module.css`, `Parts.stories.tsx`, `sample.ts`, `__tests__/parts.test.tsx`.

**Interfaces:**
- Consumes: `Panel`, `Digits`, `Explain`, `Tooltip`, `useWholeWhenCut`, `INSPECT_WORDS`.
- Produces: each part keeps its props and now draws its own `Panel` with its title (`Problems`, `Playing now`, `Overrides`, `Timing`); a new `ComingIn` in `packages/ds/src/debug/ComingIn.tsx`: `{ devices, clock, lines, scrollable }` → the Coming in panel holding `DeviceLines` and `MessageList`. `Problems`, `PlayingRows` and `Overrides` gain an optional `title?: string` so Look back can say "Problems then" and "Was playing".

- [ ] **Step 1: Write the failing tests.** Today's parts tests stay green, changed only where a heading moved into a `Panel`. New: each panel is a region named by its title; the device line's name is full ink and its word carries `data-dim`; a note-off line is dim, "nothing listens" carries `data-tone="attention"`; the gap line's words; Problems with none shows the hatched "none", an error row has `data-tone="fault"`, a warning `sand`, "engine restarting" `sand`; Playing now's two empty states and its footnote; Overrides marks an on value with `data-on` (Master only under 100 %); Timing's `attention` line and Dropped's tooltip; "Playing now", "Overrides" and "Timing" are `Explain`s. Plays: Playing now has the same box with zero, three and nine rows (it scrolls inside past six); a row ending changes no other box; an age going from `9 b` to `10 b` moves nothing (`Digits`); with 200 lines the message list scrolls inside Coming in and the device lines stay in view; the burst story's frame cost is within today's budget (Review Focus 1).
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test -- parts` — FAIL on the new ones.
- [ ] **Step 3: Implement** from the left and middle of `Q-Inspect-Live.png`.
- [ ] **Step 4: Run** tests and Storybook — PASS. Boards: the `debug-parts-…` ones for these parts, adding light and stage for `coming-in` and `problems`.
- [ ] **Step 5: Commit** (code, then baselines).

### Task 4: Going out: the grid, the lights, "Find a light"

**Files:**
- Create: `packages/ds/src/debug/FindLight.tsx`, `packages/ds/src/debug/model/spans.ts`, `packages/ds/src/debug/model/__tests__/spans.test.ts`, `packages/ds/src/debug/__tests__/find.test.tsx`
- Modify: `packages/ds/src/debug/UniverseBlock.tsx`, `packages/ds/src/primitives/UniverseGrid/` (its look: equal squares; its props and handle stay), `Debug.module.css`, `Parts.stories.tsx`, `sample.ts` (the awkward lights of Review Focus 2), `__tests__/parts.test.tsx`

**Interfaces:**
- Consumes: `Digits`, `Tooltip`, `useWholeWhenCut`.
- Produces:

```ts
// model/spans.ts
export type LightSpan = { id: string; name: string; first: number; last: number }; // 1-based, one universe
/** One box per row the light touches: row 0-15, columns 0-31, inclusive. */
export function boxesOf(span: LightSpan): { row: number; from: number; to: number }[];
/** Lights whose name contains the text (case and accents ignored), in venue order; all when the text is empty. */
export function findLights<T extends { name: string }>(lights: T[], text: string): T[];
// UniverseBlock: a new optional prop on both forms
lights?: LightSpan[];
// selected (existing) gains the tag's words
selected?: { first: number; last: number; name?: string } | null;
// FindLight.tsx
export function FindLight(props: {
  lights: { id: string; name: string; universe: string; first: number; last: number }[];
  onPick(id: string): void;
  /** Paused: disabled, with its reason. */
  disabled?: boolean;
}): JSX.Element;
```

- [ ] **Step 1: Write the failing tests.**
  - `boxesOf`: a light on 1–4 is one box; 30–35 is two (row 0 columns 29–31, row 1 columns 0–2); 509–512 ends at row 15 column 31; a 40-channel light is two or three boxes. `findLights`: contains, case, accents, the empty text, two lights with one name both returned.
  - The block: today's tests stay green untouched (the cells, the arrows, Enter / Space, the readout's four forms, the past forms). New: every cell has the same width and height; one outline element per box of each light, `aria-hidden`, drawn from `lights`; the picked light's boxes carry `data-picked` and the tag shows its name; two lights sharing channels are both outlined; without `lights` the block is as before; frames/s is `Digits`; the state carries `data-tone="fault"` when it needs attention.
  - `FindLight`: a combobox named "Find a light"; typing lists "name · universe a–b"; Enter or a click calls `onPick` with the id and empties the field; "No light matches"; disabled, it has the tooltip "Resume to pick a light" and opens nothing.
  - Plays: picking a light changes no cell's box and no box outside the grid; the tag of a light on the top row is below it and inside the panel; the tag of a light at the right edge ends inside the grid; setting a new frame through the grid's handle adds or removes no node (Review Focus 1, 2).
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test -- spans find parts UniverseGrid` — FAIL on the new ones.
- [ ] **Step 3: Implement** "The grid" and "Find a light". The outlines are one absolutely placed layer over the grid, built from `boxesOf` when `lights` changes.
- [ ] **Step 4: Run** tests and Storybook — PASS. Boards: `debug-parts-universe`, `debug-parts-universe-picked`, `debug-parts-universe-awkward`, `debug-parts-find`, the first two in the three looks; the UniverseGrid boards.
- [ ] **Step 5: Commit** (code, then baselines).

### Task 5: The why panel

**Files (modify):** `packages/ds/src/debug/WhyPanel.tsx`, `Debug.module.css` (its rules), `WhyPanel.stories.tsx`, `__tests__/parts.test.tsx` (its cases).

**Interfaces:**
- Consumes: `Panel tone="sand"`, `Digits`, `Tooltip`, `useWholeWhenCut`.
- Produces: `WhyPanelProps` unchanged. The panel fills the slot it is given and scrolls inside itself.

- [ ] **Step 1: Write the failing tests.** Today's why tests stay green untouched (every row, writer, reason, tag, override line, channel line, footer and state of the inventory; the held boxes; the dimming). New: `light` is a sand panel titled with the light's name, "channels a–b · Esc clears" at the right; the winner's mark is a filled square with `data-won`, the others empty; the loud lines carry `data-tone="fault"`; the channels are tiles reading "ch N name", the byte and the source; `hint` is a hatched block labelled "Light"; `empty-cell`, `no-type` and `no-show` show today's sentences in the panel. Plays: a 40-character writer name and a long colour value are cut with an ellipsis and give their whole text in a tooltip; every text colour on the panel is `--sand`, `--on-sand` or `--fault` in the three looks; in a 300 px slot a light with eight rows scrolls inside with its scrollbar showing and the title stays; a value changing from `78 %` to `100 %` moves nothing.
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test -- parts why` — FAIL on the new ones.
- [ ] **Step 3: Implement** from the bottom right of `Q-Inspect-Live.png`.
- [ ] **Step 4: Run** tests and Storybook — PASS. Boards: the `debug-why-…` ones, adding light and stage for the main state.
- [ ] **Step 5: Commit** (code, then baselines).

### Task 6: The Live screen

**Files (modify):** `packages/ds/src/debug/MonitorScreen.tsx`, `MonitorScreen.module.css`, `ScreenHost.tsx`, `Screen.stories.tsx`, `sample.ts` (four universes; long names), `__tests__/screen.test.tsx`, `packages/ds/scripts/test-visual.mjs`.

**Interfaces:**
- Consumes: Tasks 2 to 5, `HintLine`, `INSPECT_HINTS`.
- Produces: `MonitorScreenProps` unchanged, plus on `MonitorWhy`: `lights?: WhyLight[]` (the venue's lights, for the outlines and "Find a light") and `onFind?: (fixtureId: string) => void` (left out, the screen calls `onSelect(light.universe, light.first)`).

| State | Event | Result |
|---|---|---|
| Nothing picked | a cell of a light, or a "Find a light" entry | `onSelect` / `onFind`; the why slot shows the light; its universe is scrolled into view; nothing else moves |
| A light picked | a cell of that light, or Esc | `onClear`; the slot shows the hatched "Light" |
| A light picked | another light (cell or find) | The slot shows the new one |
| Any | a cell with no light | The slot says today's words for an empty cell |
| Live | Space or Pause | Paused: the bar's word, Resume in `sand`; every column holds; the messages table scrolls |
| Paused | a cell of another light, a find entry | Nothing (find is disabled) |
| Paused, a light picked | Esc or a cell of that light | Cleared |
| Paused | a chip | The held lines are re-filtered; nothing else changes |
| Paused | Space or Resume | The newest props at once; a gap line in the list |
| No venue | — | Going out is the hatched "No venue yet."; no find field; the slot stays |
| `why` absent | — | No outlines pick, no find field, no slot |
| Link lost | — | The why panel dims, as today |

- [ ] **Step 1: Write the failing tests.** Today's screen tests stay green, changed only where Timing and Problems moved. New: one test per row of the table; the column contents in the order of the decision. Plays at 1280 × 800: three columns, the window does not scroll; Going out with four universes scrolls inside its panel and the 300 px slot stays at the bottom; picking and clearing a light changes no box outside the slot; a problem arriving moves only the panels under Problems in its column. At 1079 px of its own width: one column in the stated order. At 390 × 844: the same column, nothing wider than the screen. The burst story: within the frame budget (Review Focus 1).
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test -- screen` — FAIL on the new ones.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** tests and Storybook — PASS. `df -h /System/Volumes/Data | tail -1`, then `pnpm update:visual --only debug-screen`, adding `-light`, `-stage`, `-picked`, `-paused`, `-four-universes`, `-1024`. Open `debug-screen-picked` with the Read tool and compare with `Q-Inspect-Live.png`. Run `apps/web/e2e/scroll.spec.ts`. Owner looks at Live: well, picked, paused, problems, four universes, no venue, one column, each in dark, light and stage.
- [ ] **Step 5: Commit** (code, then baselines).

### Task 7: Look back

**Files (modify):** `packages/ds/src/debug/back/{LookBackScreen,MomentHeader,SessionStrip,ZoomStrip,Hatch,ScreenHost}.tsx`, `LookBackScreen.module.css`, `Back.module.css`, `Parts.stories.tsx`, `Screen.stories.tsx`, `sample.ts`, both `__tests__`, `packages/ds/scripts/test-visual.mjs`.

**Interfaces:**
- Consumes: Tasks 2 to 4 (`ComingIn` with a `title`, the parts' `title`, `UniverseBlock` with `lights`), `Panel`, `Digits`, `NoticeLine`, `HintLine`, `INSPECT_HINTS`.
- Produces: `LookBackScreenProps` unchanged, plus an optional `lights?: LightSpan[][]` (per universe, in venue order; used only where the frame is named).

- [ ] **Step 1: Write the failing tests.** Today's Look back tests stay green untouched (the strips' clicks, drags and arrows; ←/→ a frame, ⇧←/→ a bar, `[` `]`, Space, M; Play stopping at a gap; the moment's words; "not recorded"; unnamed frames). New: the timeline panel's title is the moment and its right end holds the "ago" words and the three legend entries; the zoomed minute's frame and the cursor carry `data-picked`; the line at the cursor is the picked row of "Came in"; the column contents in the order of the decision with the titles "Came in", "Problems then", "Was playing", "Overrides", "Went out"; "nothing recorded here" is the hatched empty state; "The recorder is off (Settings)." is on the notice line with a link to Settings and the bar's four buttons are disabled. Plays at 1280 × 800: the timeline panel has the same height with and without marks, gaps and problems; moving the cursor changes no box; the window does not scroll; one column below 1080 px of its own width.
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test -- back` — FAIL on the new ones.
- [ ] **Step 3: Implement** from `Q-Inspect-Back.png`.
- [ ] **Step 4: Run** tests and Storybook — PASS. `pnpm update:visual --only debug-back`, adding light and stage for the well screen. Owner looks at Look back: well, a gap, nothing recorded, the recorder off, one column.
- [ ] **Step 5: Commit** (code, then baselines).

### Task 8: The Settings bar, layout and the simple panels

**Files (modify):** `packages/ds/src/settings/{SettingsBand,SettingsScreen,NetworkPanel,StartPanel,About,RestartDialog}.tsx`, `SettingsScreen.module.css`, `Settings.module.css`, `Sections.module.css`, `Sections.stories.tsx`, `Screen.stories.tsx`, `__tests__/screen.test.tsx`, `__tests__/sections.test.tsx`.
**Create:** `packages/ds/src/settings/RestartLabel.tsx`.

**Interfaces:**
- Consumes: `Panel`, `Explain`, `Toggle`, `NumberField`, `Tooltip`, `useWholeWhenCut`, `HintLine`, `NoticeLine`, `SETTINGS_WORDS`, `SETTINGS_HINT`.
- Produces: `SettingsScreenProps` unchanged, plus an optional `notice?: Notice | null` (a read failure, on the line under the bar). `<RestartLabel applies="restart" | "next-start" />` draws "Needs a restart" (an `Explain`) or "Applies the next time you start PTAH".

- [ ] **Step 1: Write the failing tests.** Today's band and screen tests stay green untouched (every `BandState`'s words and buttons, `canSave`, ⌘S with the blur first, the restart question's three buttons). New: the bar holds a heading "Settings", then the status, then the buttons; each `BandState` carries the tone of the decision as `data-tone`; the columns' order (Reaper offset, MIDI inputs, On the network; When PTAH starts, Engine, About); the two network fields each carry the next-start label and the two start fields none; `notice` shows on the line under the bar. Plays: the bar has the same box in the seven band states; a draft naming six labels is cut with an ellipsis and gives its whole text, and Discard and Save stay whole at 900 px (Review Focus 5); two columns at 900 px, one at 899; the QR never pushes the fields under 240 px wide.
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test -- screen sections` — FAIL on the new ones.
- [ ] **Step 3: Implement** from `S-Settings.png` (the bar, On the network, When PTAH starts, About).
- [ ] **Step 4: Run** tests and Storybook — PASS. Boards: `settings-sections-network`, `-start`, `-about`, and a `settings-sections-band-<kind>` per band state.
- [ ] **Step 5: Commit** (code, then baselines).

### Task 9: Reaper offset and Engine

**Files (modify):** `packages/ds/src/settings/OffsetAdvice.tsx`, `EngineFields.tsx`, `Settings.module.css`, `Sections.module.css`, `Sections.stories.tsx`, `sample.ts`, `__tests__/sections.test.tsx`.

**Interfaces:**
- Consumes: `Panel`, `Digits`, `Badge`, `Explain`, `RestartLabel`, `THEN_TELL_PTAH`, `SETTINGS_WORDS`.
- Produces: `OffsetAdviceProps` unchanged. `EngineFieldsProps` gains `changed?: number` (the fields inside that differ from the saved file; the screen counts them from the band's `changes` whose key is an engine key) and `defaultOpen?: boolean` (for stories).

| Engine is | Event | Result |
|---|---|---|
| Folded, nothing changed | — | "6 settings"; no badge |
| Folded | "Open ▾" | Open; the fields; "Close ▴" |
| Open, a field edited | "Close ▴" | Folded; `!` and "1 changed" |
| Folded, changed | Discard, or Save done | No badge |
| Folded | an error arrives for a field inside | Opens; "1 error" in `fault`; Close is disabled with the tooltip "Fix the error first" |
| Open with an error | the error goes | Stays open; Close works again |
| Open | "Back to defaults" | As today; the count follows |

- [ ] **Step 1: Write the failing tests.** Today's offset and engine tests stay green, changed only where the engine's fields are now behind "Open" (the tests open it first). New, offset: three numbered steps with the words of the table; the number in step 2 is today's `ms()` string; the venue sentence at the title's right; the measure line's three forms; the three "set" states and their tones; the breakdown's terms; the two no-advice cases replace the steps with a hatched block holding today's sentence; `canStore` false disables the button with today's reason; `storing` shows it busy; "Reaper offset" is an `Explain`. New, engine: one test per row of the table; each of the six fields carries "Needs a restart"; "Realtime priority" and "Engine" are `Explain`s (Review Focus 4). Plays: the offset panel has the same height in its set, not-set and changed states, and with a two-digit and a three-digit number; folded, Engine has the same box with and without the badge; at 900 px the three steps stay on one row and at 600 to 899 they stack without overlap.
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test -- sections` — FAIL on the new ones.
- [ ] **Step 3: Implement** from `S-Settings.png`.
- [ ] **Step 4: Run** tests and Storybook — PASS. Boards: `settings-sections-offset-…` (each state), `settings-sections-engine-folded`, `-folded-changed`, `-open`, `-error`.
- [ ] **Step 5: Commit** (code, then baselines).

### Task 10: MIDI inputs, the phone view and the Settings screen

**Files (modify):** `packages/ds/src/settings/{DeviceTable,SettingsPhone,SettingsScreen,ScreenHost}.tsx`, `Settings.module.css`, `Sections.stories.tsx`, `Screen.stories.tsx`, `Phone.stories.tsx`, `sample.ts` (twelve devices), `__tests__/sections.test.tsx`, `__tests__/screen.test.tsx`, `packages/ds/scripts/test-visual.mjs`.

**Interfaces:**
- Consumes: Tasks 8 and 9, `Panel`, `Menu`, `Toggle`, `Explain`, `RestartLabel`.
- Produces: `DeviceTableProps` unchanged.

- [ ] **Step 1: Write the failing tests.** Today's device-table and phone tests stay green untouched (rename only for PTAH's own port, the port choices, On, the Clock radio's one-only rule, Now and its refusal, Remove, the three forms of "Add a device", the transport port's field and status, every field error). New: "Add a device" is in the panel's title line; a refused device's row carries `data-tone="sand"`; "Clock" and "Reaper transport port" are `Explain`s; one "Needs a restart" by the title and one by the transport port. The screen: with an engine change in the band's `changes`, the folded Engine shows the count. Plays: a row has the same box with and without a field error; twelve devices at 900 px: every column is readable, "Add a device" is whole, nothing overlaps (Review Focus 5); at 1280 × 800 with the well sample the page's first screen shows Reaper offset whole; under 600 px the phone view shows every section's words read-only and no button.
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test -- sections screen` — FAIL on the new ones.
- [ ] **Step 3: Implement** from `S-Settings.png` and `X-Phones.png`.
- [ ] **Step 4: Run** tests and Storybook — PASS. `pnpm update:visual --only settings`, adding light and stage for `settings-screen-well`. Open `settings-screen-well` with the Read tool and compare with `S-Settings.png`. Run `apps/web/e2e/scroll.spec.ts`. Owner looks at Settings: well, a draft, each band state, Engine open and with an error, the offset's states, twelve devices, the phone, in the three looks.
- [ ] **Step 5: Commit** (code, then baselines).

### Task 11: Wiring in the app

**Files (modify):** `apps/web/src/debug/MonitorPage.tsx`, `apps/web/src/debug/LookBackPage.tsx`, `apps/web/src/settings/SettingsPage.tsx` (what they pass to the screens; where a line's words are built, the `as` of Task 1), their tests in `apps/web/src/debug/__tests__/` and `apps/web/src/settings/__tests__/`, `apps/web/e2e/{debug,lookback,why,settings,scroll}.spec.ts`.

| State | Event | Result |
|---|---|---|
| Inspect, either view | "Notes as" | The messages re-word at once, here and on Show (one stored choice); held lines re-word while paused |
| Live, a venue playing | — | The grids show each light's outline; "Find a light" lists the venue's lights |
| Live | a find entry | `?light=<id>` set, as a click on the light does; shared with the other screens as today |
| Live, paused | a find entry | Not possible |
| Live | `?light=` of a light that no longer exists | As today |
| Look back, the frame named | — | Outlines from the venue's lights; none when the patch changed since |
| Look back, the recorder off | — | The notice line with its link to `/settings` |
| Settings | a read failure | The notice line, with Retry where today has it |
| Settings | an engine field changed, Engine folded | The count on the folded panel; the header status as today |
| Settings | a refused save naming an engine field | Engine opens with the error |
| Settings | Save, Save and restart, the restart question, conflict, lost, the leave guard, ⌘S, the palette | Exactly as today (the page tests for these stay green untouched) |

- [ ] **Step 1: Write the failing tests**: one per row, except the rows that say "as today" or "exactly as today", which are the existing tests.
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds build && pnpm -F @ptah-app/web test` — FAIL.
- [ ] **Step 3: Implement.** `MonitorPage` passes `why.lights` from the lights it already holds by id and `notesAs` to the words; `LookBackPage` passes `lights` per universe; `SettingsPage` passes `notice`.
- [ ] **Step 4: Update the e2e specs** only where they find a control that moved (Timing and Problems in the second column; the why panel's slot; Engine's fields behind "Open"; the offset's steps; the band's words in the bar). Add two tests: find a light by name and see its why panel and `?light=`; switch "Notes as" on Inspect and see a note message change form, then the same form on Show.
- [ ] **Step 5: Run** `pnpm -F @ptah-app/web test`, then each of `debug.spec.ts`, `lookback.spec.ts`, `why.spec.ts`, `settings.spec.ts`, `scroll.spec.ts` with `pnpm -F @ptah-app/web test:e2e -- <file>` — PASS.
- [ ] **Step 6: Commit**: `git commit -m "feat(web): Inspect and Settings in ZENITHALL" <paths>`

### Task 12: Checkpoint

- [ ] **Step 1:** `df -h /System/Volumes/Data | tail -1`; `du -sh target`; clean per AGENTS.md if needed.
- [ ] **Step 2:** `pnpm allcheck` — green. A failure that passes when re-run alone is reported as load, with the output.
- [ ] **Step 3:** Start the app as the e2e rig does (a temporary root copied from `fixtures/`, `--fake-io`, never `~/.ptah`); launch the browser with scrollbars shown. Walk at 1280 × 800, 1024 × 768 and 390 × 844, in the three looks. Inspect, Live: messages coming in; each chip; "Notes as"; pause and resume; pick a light by a cell and by name; clear it; a cell with no light; a problem (unplug the fake output); no show; no venue. Look back: click and drag both strips; the keys; Play to a gap; Mark now; a moment with a problem. Settings: change a network field, a start field and an engine field; fold and open Engine; Discard; Save; Save and restart with the clock stopped and running; add, rename and remove a device; the offset's button; an invalid port; ⌘K. Save a screenshot of each to the plan's workspace, open the key ones with the Read tool, and report anything wrong.
- [ ] **Step 4:** In `docs/design-system.md`, under "ZENITHALL (in progress)", add short "Inspect" and "Settings" sections: the columns, the grid's rule for lights, the why slot, "Find a light", the folded Engine's rule, the restart label. In `~/projects/ptah/docs/superpowers/plans/2026-11-19-v2-redesign-deferred.md`, strike out the plan 6 lines that are done.
- [ ] **Step 5:** Owner check of the running app. Commit: `git commit -m "docs(ds): Inspect and Settings in ZENITHALL" <paths>`.
