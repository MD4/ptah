# Redesign 4 of 7: Effects — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Effects place (today's Builder) its ZENITHALL screens: the programs page as a list or as tiles, and the editor with square wires, three kinds of node, the sand panel for the picked node, the bottom panels that can be minimised to a bar, and the add box that explains each node.

**Architecture:** Every piece of today's Builder in `packages/ds/src/builder` is restyled in place with the same data, roles and words. The graph model, the draft, the preview, the rig and probe hooks and the save flow (`builder/model/*`, `apps/web/src/builder/*.ts`) are not changed. Three small things are new: a table of one sentence per node kind, two browser preferences (list or tiles; panels open or minimised), and the minimised bar, which is a second face of the existing dock built from the same parts.

**Tech Stack:** TypeScript, React, `@xyflow/react` 12.12.0 (already in use), CSS modules with tokens only, Vitest, Storybook, Playwright (visual and e2e), Biome.

**Spec:** `~/projects/ptah/docs/superpowers/specs/2026-11-19-v2-redesign-design.md` (sections "Effects", "Across the app", "The look in numbers", the Effects feature table, "Homes for the items the first tables missed", "Checked against the code"). Inventory: `2026-11-19-v2-redesign-inventory.md`, section 5. Code: `~/projects/ptah-v2`, branch `redesign-effects` from `master`.

**Boards (the drawings to match):** in `~/projects/ptah/docs/superpowers/specs/2026-11-19-v2-redesign-boards/png/`. Open them with the Read tool before styling.

| Board | Shows |
|---|---|
| `L-Effects-Editor.png` | The editor, a node picked, panels open, a node tooltip |
| `M-Effects-Big-Picked.png`, `M-Effects-Big.png` | A large program, the panels minimised to the bar |
| `L-Effects-Add.png` | The add box |
| `L-Effects-Empty.png` | An empty program |
| `L-Effects-List.png`, `L-Effects-Tiles.png` | The programs page as a list and as tiles |
| `V-Effects-OnTheRig.png`, `V-Effects-FromTheShow.png` | The two live states |
| `T-08-builder-list.png`, `T-09-builder.png` | Today's screens, for what must still be there |
| `X-Phones.png` | The phone view |

Markup: `…-boards/html/<name>.dc.html`. Where a board and this plan differ, this plan wins; where a board's words differ from the code's, the code's words win.

**What plans 2 and 3 set, to follow here:** `packages/ds/src/show/` and `packages/ds/src/perform/` for the patterns: a `Panel` per region with `level`; `Digits` for changing numbers; `useWholeWhenCut` with `Tooltip disabled` for cut text; `Explain` for a word with a tooltip; `Choice` for one-click choices; `NoticeLine` with a tone and an action, on one fixed 24 px line under the bar that a refusal shares; `HintLine`; a `Dialog tone="danger"` with `<Button confirm>` for a delete; a browser preference written like `packages/ds/src/notesAs.ts`; Storybook plays for anything measured; light and stage stories beside each story. From `packages/ds`, visual boards are regenerated with `pnpm update:visual --only <name>` (the `--` form fails; `--only` matches by prefix).

## Global Constraints

- Exactly today's features, no less, no more, plus what the spec lists under "New things" for Effects: minimising the bottom panels, and programs as tiles with the list / tiles switch.
- Inside the screens, today's wording is kept: every label, word, refusal, off-reason, toast, dialog text and command title stays as it is in the code. The only new words are the ones this plan lists (the node sentences, the two switches' labels, the empty program's line, the spelled-out preview readout, "Minimise" and "Open").
- Nothing shifts: picking a node, a wire, a refusal, a look change, a value change, turning On the rig or From the show on, never moves or resizes anything. Minimising and opening the panels is the one action that resizes the canvas, and it never moves a node on it.
- Calm when well, loud only when wrong: `fault` appears only for a fault.
- Tokens-only styling. Gaps use `--gap-panel` and `--gap-row`; line heights use `--lh-*`. On a sand fill, text uses only `--on-sand`; on a `--sand-panel`, `--sand`. Biome only.
- The logic is not touched: no change to the existing functions of `packages/ds/src/builder/model/*`, to `apps/web/src/builder/{core,coreWasm,derive,notes,rig,saveProgram,usePreview,useProgram,useShowProbe,words}.ts`, to the server or the engine. New pure functions and new files may be added beside them.
- The canvas stays fast: the existing performance stories and budget tests pass with the same numbers, within their tolerance.
- Story ids keep their names (`builder-canvas--…`, `builder-editing--…`, `builder-dock--…`, `builder-screen--…`, `builder-list--…`); stories for the light look are added beside the existing ones.
- No new dependency. Never start V1 services or pm2; never touch `~/.ptah` or `~/ptah-home`; leave the untracked `docs/design/brief/` and `.ignore` alone; the Storybook servers on 6006–6008 stay up; no push unless the owner asks.
- Disk (AGENTS.md): `df -h /System/Volumes/Data | tail -1` before a heavy run; below 30 GB free, clean first and tell the owner. No extra worktree.
- At most three agents at once. A design-system task runs the visual gate for its own boards only; the full gate runs at the checkpoint. Do not run the ds tests side by side with the web tests (the ds build test removes `dist/`).
- Every task that changes how something looks ends with the owner looking at its Storybook stories before the task is closed.

## Decisions this plan makes

- **The editor at 1180 px and wider.** The bar under the header; one fixed 24 px line under it for the notice or a refusal; then the canvas with the picked node's panel at its right; then the bottom panels or the minimised bar; then the hint line.

  | Region | Size | Holds |
  |---|---|---|
  | Bar | 52 px | "← Programs", the program's name (edited in place), the "on the rig" mark, the show's name, "used by N rows"; right: the fault count (opens the issue list), Undo, Redo, Tidy, Save (primary) |
  | Canvas | the rest | Dot grid, nodes, wires, notes, "Fit" at its bottom right |
  | Picked node's panel | 290 px | The sand panel for the picked node or nodes; with nothing picked, a hatched block labelled "Inspector" |
  | Bottom, open | 244 px | Three panels: Test, Preview, On the rig (which holds From the show) |
  | Bottom, minimised | 48 px | The bar |

  The right column is always there, so picking a node never resizes the canvas.

- **From 900 to 1179 px** the picked node's panel lays over the right 290 px of the canvas while a node is picked (the canvas can be panned from under it), and the bottom panels start minimised unless the owner opened them. Below 900 px the read-only view stays, restyled.

- **Three kinds of node**, from the catalogue's `family`:

  | Family | Kind | Title strip |
  |---|---|---|
  | `inputs` | source | Outlined: `--ground` fill, 1 px `--tint` outline, `--tint` text |
  | `shape`, `math`, `other` | shaping and maths | Filled: `--tint` fill, `--on-tint` text |
  | `outputs` | output | Filled, and the whole node has a double frame (a second 1 px `--tint` outline 2 px outside) |

  The node body is `--ground` with a 1 px `--tint` outline. A picked node has a `--sand` title strip with `--on-sand` text, `--sand` outline and values, and corner brackets 4 px outside. A node with an error has a `--fault` outline and its title's left edge in `--fault`; a warning, `--sand`. Fields are `label` on the left, value on the right in `--bright`. Ports are 7 px squares on the node's edge: an input is hollow, an output filled. The live curve stays along the bottom; a colour output keeps its swatch; "—" stays for no value.

- **Square wires.** A wire leaves a port level, turns at right angles, and has no rounding (`getSmoothStepPath` with `borderRadius: 0`). 1.5 px `--tint`; a wire of the picked node `--sand`; an error wire `--fault`; a wire being dragged is dashed. Valid inputs light up and a refused wire says why, as today.

- **One sentence per node kind** (new words). It shows in the add box under the node's name, and as the tooltip of a node's title on the canvas (title: the node's name). A subgraph's tooltip adds its program's name; a setting node's, the setting's name.

  | Type | Sentence |
  |---|---|
  | `constant` | A fixed number you type. |
  | `parameter` | A knob on this program that the show's faders can drive. |
  | `velocity` | How hard the note was hit, from 0 to 1. |
  | `member` | The light's place in its group, so each light can do something different. |
  | `random` | A random number. The same seed always gives the same number. |
  | `time` | The seconds since the note started. |
  | `beat` | The song's beat, counting up with the tempo. |
  | `adsr` | Rises when the note starts and falls when it stops: attack, decay, sustain, release. |
  | `envelope` | The envelope of the first PTAH, kept so imported programs play the same. |
  | `lfo` | A wave that repeats: sine, triangle, saw or square. |
  | `smooth` | Rounds off sudden changes. |
  | `step` | Cuts a smooth signal into steps. |
  | `distortion` | Pushes a signal harder until it flattens, like a guitar pedal. |
  | `add` | Adds A and B. |
  | `subtract` | Takes B away from A. |
  | `multiply` | Multiplies A by B. Use it to make one signal scale another. |
  | `divide` | Divides A by B. |
  | `modulo` | What is left after dividing A by B. Use it to make a count start over. |
  | `power` | A raised to the power B. Use it to bend a curve. |
  | `sin`, `cos`, `tan` | The sine (cosine, tangent) of the input. |
  | `asin`, `acos`, `atan` | The angle whose sine (cosine, tangent) is the input. |
  | `exp` | e raised to the input. It grows faster and faster. |
  | `log` | The natural logarithm of the input. It grows slower and slower. |
  | `sqrt` | The square root of the input. |
  | `abs` | Drops the minus sign. |
  | `round`, `floor`, `ceil` | The nearest whole number (the whole number below, the whole number above). |
  | `clamp` | Keeps a value between a minimum and a maximum. |
  | `map` | Stretches a value from one range to another. |
  | `select` | Passes A or B, depending on a third input. |
  | `out.intensity` | Sends the signal to the lights' dimmer. |
  | `out.color` | Sends a colour to the lights. |
  | `out.strobe` | Sends the signal to the lights' strobe. |
  | `out.position` | Moves the lights: pan and tilt. |
  | `out.beam` | Shapes the beam: zoom and focus. |
  | `out.channel` | Sends the signal to one raw channel of the light. |
  | `subgraph` | Plays another program inside this one. |
  | `z1` | The value from the moment before. Use it for effects that feed on themselves. |
  | `unknown` | A node this version of PTAH does not know. It is kept as it is. |

  Each sentence is checked against the node's behaviour in `docs/vm-instruction-set.md` before it ships; one that is wrong is corrected and reported.

- **The picked node's panel** is a `Panel tone="sand"` titled with the node's name; at the right of the title, its kind in today's family words ("inputs node", "shape node", "math node", "outputs node"). Under the title: the node's live curve, larger. Then one line per field, with today's controls; a field of kind `choice` is a `Choice` of chips. Then one line per input: a wired input reads "← <the node that feeds it>" (for a setting node, "← setting · <name>"); an unwired input keeps its number field. At the bottom: Duplicate and Delete. Read-only nodes (subgraph, previous value, unknown), refusals ("between X and Y"), the setting picker's "none yet", and several nodes picked ("N nodes" with Duplicate and Delete) are as today.

- **The bottom panels, open.** Three `Panel`s side by side: Test (Hold, Loop, Beats, Tempo, Velocity, Plays like, On stop; then Settings with a slider each, the `…` editor and "Add a setting"), Preview (mode, Lights, the swatches, the readout), On the rig (its switch and Row picker with its off and ended reasons and the live DMX list; then From the show with its switch, off-line, status, messages, Row and light pickers and footnote). "Minimise ▾" sits at the right of the On the rig title. While From the show is on, the Test panel is dimmed with "the show drives", as today.

- **The preview readout is spelled out**: under each swatch, "Pan", "Tilt", "Zoom", "Focus", "Intensity" with their values, in place of today's "P T / Z F / I".

- **The bottom panels, minimised.** One bar, left to right: "Test" with Hold and Loop; the program's settings, each a name, a value and a small slider that works; "Preview" with the swatches; "On the rig" with its switch; "From the show" with its switch; "Open ▴" at the right. The settings zone scrolls sideways inside itself when there are many; Hold, Loop, the two switches and Open never leave the bar. While From the show is on, Hold, Loop and the sliders are dimmed with "the show drives". An off reason of a switch shows as its tooltip and, when the switch is refused, on the line under the top bar. Space still holds the test note.

- **Minimise and Open** are the same spot at the right, and the choice is kept per browser under `ptah.ds.effects.dock` (`open` or `min`; default `open`). The palette gains "Minimise the panels" / "Open the panels".

- **The add box** opens over the canvas as today (a letter typed on the canvas, "Add node", or a wire dropped on empty canvas). Each result is one row: a small curve picture of the node, its name, its sentence, and its family at the right. The first result is picked, in sand. "Pick ↵" and "Close esc" at the bottom. "no node matches" and "preview unavailable: nodes cannot be added" as today.

- **An empty program** shows, in the middle of the canvas, a hatched block with "Type a letter to add a node".

- **The programs page.** The title "Programs"; at the right a "View" `Choice`, `list` or `tiles`, kept per browser under `ptah.ds.effects.view` (default `list`, today's form). One `Panel` per show, titled with the show's name; the playing show first, with "playing" at the right of its title; the others with their count.

  | View | A program | New program |
  |---|---|---|
  | list | One row: the curve picture, the name (opens it), "used by N rows", "N nodes · settings", then Duplicate, "Copy to…", Delete | A button in the show's title line |
  | tiles | A tile: the curve picture, the name (opens it), "N nodes · settings", "N rows" in `--bright` when used; `···` opens Duplicate, "Copy to…", Delete. Six across at 1280 px | A dashed tile "+ New program" at the end |

  A refusal ("used by …", "played inside …", an id clash, a server error) shows on one line under its row, or across the bottom of its tile in `fault`, without changing the row's or the tile's size. "No programs yet" is the hatched empty state of a show's panel. Loading and "Programs could not be read: … Retry" use the notice line. Below 900 px the page is the narrow list, as today.

- **The hint line.** Editor, left: "Type a letter to add a node", always. Right: Hold `Space`, Save `⌘S`, Undo `⌘Z`, Commands `⌘K`. Programs page, right: Commands `⌘K`; left, in tiles: "··· on a tile: Duplicate, Copy to, Delete".

- **Dialogs** keep their content and take the restyled `Dialog`. "Delete <name>?" is a danger dialog with its confirm marked.

## Review Focus

1. **A program of 60 nodes** pans and zooms as fast as today: the existing performance stories and budget tests give the same numbers. (Tasks 2, 7)
2. **A keyboard wire** (W on an output, arrows, Enter) and a refused wire still work and still say why with square wires. (Task 2)
3. **Eight settings in the minimised bar at 1280 px**: the settings zone scrolls inside itself; Hold, Loop, both switches and Open stay in the bar. (Task 6)
4. **From the show turned on**, in both faces of the bottom: Test is dimmed with "the show drives", node values come from the engine, and nothing on the screen moves. (Tasks 5, 6)
5. **A refused delete on a tile** ("used by sine (pars), flash (pars), distorded (pars)"): the tile keeps its size and the whole sentence can be read. (Task 8)

---

### Task 1: Shared pieces: the node sentences, the two preferences, one unsteady story

**Files:**
- Create: `packages/ds/src/builder/model/sentences.ts`, `packages/ds/src/builder/model/__tests__/sentences.test.ts`, `packages/ds/src/effectsPrefs.ts`, `packages/ds/src/__tests__/effectsPrefs.test.ts`
- Modify: `packages/ds/src/builder/model/index.ts` (export), `packages/ds/package.json` (the `./effectsPrefs` export, as `./notesAs` is exported), `packages/ds/src/builder/AddBoxFiltered.stories.tsx` (the story "Open" fails now and then under load), `docs/design-system.md`

**Interfaces:**
- Produces:

```ts
// sentences.ts
export function nodeSentence(type: string): string;      // "" for a type with none
// effectsPrefs.ts
export type ProgramsView = "list" | "tiles";
export type DockFace = "open" | "min";
export const VIEW_STORAGE = "ptah.ds.effects.view";
export const DOCK_STORAGE = "ptah.ds.effects.dock";
export function useProgramsView(): [ProgramsView, (v: ProgramsView) => void];
export function useDockFace(initial?: DockFace): [DockFace, (v: DockFace) => void];
```

- [ ] **Step 1: Write the failing tests.**

```ts
test("every node type of the catalogue has a sentence", () => {
  for (const type of Object.keys(ports)) expect(nodeSentence(type), type).not.toBe("");
});
test("a sentence is one or two short sentences, ending with a full stop", () => {
  for (const type of Object.keys(ports)) {
    const s = nodeSentence(type);
    expect(s.endsWith("."), type).toBe(true);
    expect(s.length, type).toBeLessThanOrEqual(110);
  }
});
test("an unknown type has none", () => expect(nodeSentence("nope")).toBe(""));
test("list by default; tiles once chosen, kept", () => {
  const { result } = renderHook(() => useProgramsView());
  expect(result.current[0]).toBe("list");
  act(() => result.current[1]("tiles"));
  expect(localStorage.getItem(VIEW_STORAGE)).toBe("tiles");
});
test("the dock opens by default, or as the caller says when nothing is stored", () => {
  expect(renderHook(() => useDockFace()).result.current[0]).toBe("open");
  expect(renderHook(() => useDockFace("min")).result.current[0]).toBe("min");
  localStorage.setItem(DOCK_STORAGE, "open");
  expect(renderHook(() => useDockFace("min")).result.current[0]).toBe("open");
});
test("an unknown stored word, or storage that throws, falls back and still switches", () => { /* as notesAs.test.ts does */ });
```

  `ports` is `fixtures/oracles/model/ports.json`, as `canvasSample.ts` imports it.
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test -- sentences effectsPrefs` — FAIL.
- [ ] **Step 3: Implement.** Take the sentences from the table above; check each against `docs/vm-instruction-set.md` and correct any that is wrong (list the changes in the report).
- [ ] **Step 4: The unsteady story.** Use superpowers:systematic-debugging on `builder-editing-add-box-filtered--open`: run it 10 times beside another gate, find the wait on time, replace it with a wait on a condition, run it 10 times again — 10 of 10. If it never fails, say what was ruled out and leave it.
- [ ] **Step 5: Run** the tests and `pnpm -F @ptah-app/ds test:storybook` — PASS.
- [ ] **Step 6: Commit**: `git commit -m "feat(ds): node sentences, Effects view and dock preferences" <paths>`

### Task 2: Nodes, wires and notes

**Files (modify):** `packages/ds/src/builder/NodeBox.tsx`, `NodeBox.module.css`, `Wire.tsx`, `NoteBox.tsx`, `NoteBox.module.css`, `Curve.tsx` (colours only), `Canvas.module.css` (the rules for nodes, ports and wires), `Canvas.stories.tsx`, `canvasSample.ts` (a 60-node program, if absent), `__tests__/canvas.test.tsx`.

**Interfaces:**
- Consumes: `nodeSentence` (Task 1), `Tooltip`, `Brackets`.
- Produces: `NodeBox`, `Wire`, `NoteBox` unchanged in props. `NodeBox` sets `data-kind="source" | "shape" | "output"` from the family and keeps `data-node-box`.

- [ ] **Step 1: Write the failing tests.** Today's canvas tests stay green untouched. New:
  - `data-kind` for one node of each family (`inputs` → source; `shape`, `math`, `other` → shape; `outputs` → output).
  - A node's title has a tooltip whose title is the node's name and whose text is `nodeSentence(type)`; a subgraph's adds its program's name; a setting node's, the setting's name; it opens on hover and on keyboard focus of the node, and never takes the pointer (a wire can be dragged from under it).
  - A wire's path is made of horizontal and vertical segments only (parse its `d`: every segment changes x or y, never both).
  - Plays: picking a node changes no node's box; an error node and a warning node keep their boxes; the keyboard wire (W, arrows, Enter, Esc) connects and cancels as today; a refused wire shows its reason (Review Focus 2); a note is dragged, edited with Enter and removed with Delete as today.
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test -- canvas` — FAIL on the new ones.
- [ ] **Step 3: Implement** the "Three kinds of node" and "Square wires" decisions from the boards. A note is a `--panel` box with a 4 px `--tint` stripe and sentence-case text.
- [ ] **Step 4: Performance** (Review Focus 1). Run the existing perf stories and budget tests for the canvas before and after (`pnpm -F @ptah-app/ds test -- perf`, the `builder-canvas--*` perf plays); report both sets of numbers. They must be within the gate's tolerance.
- [ ] **Step 5: Run** tests and Storybook — PASS. Boards: `pnpm update:visual --only builder-canvas`. Open `builder-canvas` boards with the Read tool and compare with `L-Effects-Editor.png` and `M-Effects-Big.png`.
- [ ] **Step 6: Commit** (code, then baselines).

### Task 3: The canvas: grid, Fit, the empty program, the add box

**Files (modify):** `packages/ds/src/builder/Canvas.tsx` (the drawn chrome only: the grid, Fit, the empty state; no change to its handlers), `Canvas.module.css`, `AddBox.tsx`, `AddBox.module.css`, `AddBox.stories.tsx`, `AddBoxFiltered.stories.tsx`, `Editing.stories.tsx`, `__tests__/editing.test.tsx`, `packages/ds/scripts/test-visual.mjs`.

**Interfaces:**
- Consumes: `nodeSentence`, `EmptyState`, `Curve`, `Kbd`.
- Produces: `AddBox` unchanged in props. Each result row carries the node's curve picture, name, sentence and family.

- [ ] **Step 1: Write the failing tests.** Today's editing tests stay green untouched (typing a letter opens the box; the search's order; Enter adds; Esc closes; a wire dropped on empty canvas filters to nodes that take it; "no node matches"; "preview unavailable: nodes cannot be added"). New: each row has the name, `nodeSentence(type)` and the family word; the first row is the picked one (`aria-selected`) and the arrows move it; the bottom shows "Pick" with ↵ and "Close" with esc; a program with no node shows the hatched block "Type a letter to add a node", and the block is gone once a node exists; plays: the box is fully inside the canvas at 1280 × 800 and at 1024 × 768, and it scrolls inside itself when there are more results than fit.
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test -- editing` — FAIL on the new ones.
- [ ] **Step 3: Implement** from `L-Effects-Add.png` and `L-Effects-Empty.png`. The dot grid is `--line` dots on `--ground`; the canvas has a 1 px `--line` outline; "Fit" is a small plain button at its bottom right.
- [ ] **Step 4: Run** tests and Storybook — PASS. Boards: `pnpm update:visual --only builder-editing`, adding `builder-editing-empty`.
- [ ] **Step 5: Commit** (code, then baselines).

### Task 4: The picked node's panel

**Files (modify):** `packages/ds/src/builder/Inspector.tsx`, `Inspector.module.css`, `Editing.stories.tsx`, `__tests__/editing.test.tsx`.

**Interfaces:**
- Consumes: `Panel tone="sand"`, `Choice`, `Curve`, `NumberField`, `Select`, `Button`.
- Produces: `Inspector`'s props gain `feeds?: Record<string, string>` (an input's name → the words for what feeds it, worked out by the caller from the graph with a new pure function `feedsOf(graph, nodeId, catalogue): Record<string, string>` in `packages/ds/src/builder/model/feeds.ts`, with its test) and `curve?: ReactNode`. Everything else is unchanged.

- [ ] **Step 1: Write the failing tests.** Today's inspector tests stay green, changed only where they open a `Select` for a field of kind `choice`: they choose the same value in the radiogroup named after the field. New:

```ts
test("a wired input names what feeds it", () => {
  expect(feedsOf(graph, "lfo1", cat)).toEqual({ rate: "setting · speed", phase: "beat" });
});
test("an unwired input has no entry", () => {
  expect(feedsOf(graph, "mul1", cat).b).toBeUndefined();
});
```

  and in the component: a wired input shows "← setting · speed" and no number field; an unwired one keeps its field; the title's right end reads the kind ("shape node"); a `choice` field is a radiogroup with exactly one `aria-checked`; subgraph, previous value and unknown are read-only as today; a refusal ("between 0 and 1") shows under its field without changing the panel's height; several nodes picked shows "N nodes" with Duplicate and Delete; plays: every text colour on the panel computes to `--sand` or `--on-sand` in the three looks; the panel scrolls inside itself when a node has many fields (distortion).
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test -- editing feeds` — FAIL.
- [ ] **Step 3: Implement** from the right panel of `L-Effects-Editor.png`.
- [ ] **Step 4: Run** tests and Storybook — PASS. Boards: the `builder-editing-inspector-*` ones.
- [ ] **Step 5: Commit** (code, then baselines).

### Task 5: The bottom panels, open

**Files (modify):** `packages/ds/src/builder/Dock.tsx`, `Dock.module.css`, `TestPanel.tsx`, `SettingsList.tsx`, `PreviewLights.tsx`, `RigPanel.tsx`, `ShowProbePanel.tsx`, `Dock.stories.tsx`, `dockSample.ts`, `__tests__/dock.test.tsx`, `__tests__/probe.test.tsx`.

**Interfaces:**
- Consumes: `Panel`, `Toggle`, `Slider`, `NumberField`, `Select`, `Explain`, `Digits`.
- Produces: `Dock`'s props gain `face?: DockFace` (default `open`) and `onFace?: (f: DockFace) => void`; in this task only `open` is drawn. The five parts keep their props.

- [ ] **Step 1: Write the failing tests.** Today's dock and probe tests stay green, changed only where they read the preview readout's old letters. New:
  - Three regions named "Test", "Preview", "On the rig"; From the show is inside On the rig, under it.
  - The readout under a swatch reads "Pan", "Tilt", "Zoom", "Focus", "Intensity" with their values, drawn with `Digits`.
  - "Minimise" is a button at the right of the On the rig title and calls `onFace("min")`.
  - Every off reason and ended reason of the inventory is still shown, each in its own story or test case (use the existing cases).
  - Plays: turning From the show on dims Test with "the show drives" and moves nothing (every panel's box is the same on and off) (Review Focus 4); the live DMX list scrolls inside the panel; a changing value does not move the label beside it; the settings list scrolls inside the Test panel with eight settings.
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test -- dock probe` — FAIL on the new ones.
- [ ] **Step 3: Implement** from the bottom of `L-Effects-Editor.png`, `V-Effects-OnTheRig.png` and `V-Effects-FromTheShow.png`. Hold is the primary button with its `Space` cap; a switch is the square `Toggle`; a reason line is `label` voice in `tint-dim`, in `sand` when it is why a switch was just refused.
- [ ] **Step 4: Run** tests and Storybook — PASS. Boards: `pnpm update:visual --only builder-dock`.
- [ ] **Step 5: Commit** (code, then baselines).

### Task 6: The bottom panels, minimised

**Files:**
- Create: `packages/ds/src/builder/DockBar.tsx`, `packages/ds/src/builder/__tests__/dockbar.test.tsx`
- Modify: `packages/ds/src/builder/Dock.tsx` (it draws `DockBar` when `face` is `min`), `Dock.module.css`, `Dock.stories.tsx`, `packages/ds/scripts/test-visual.mjs`

**Interfaces:**
- Consumes: the same props `Dock` gets; `Slider`, `Toggle`, `Tooltip`, `Digits`.
- Produces: `<DockBar {...dockProps} />`, used only by `Dock`.

- [ ] **Step 1: Write the failing tests.**
  - The bar holds, in order: "Test" with Hold and Loop; one small slider per setting with its name and value; "Preview" with the swatches; the "On the rig" switch; the "From the show" switch; "Open".
  - Hold, Loop, each slider and each switch call the same handlers as in the open panels (drive both faces from one set of mock handlers and compare the calls).
  - "Open" calls `onFace("open")`.
  - A switch that cannot be turned on is disabled and its off reason is its tooltip, in today's words.
  - With From the show on: Hold, Loop and the sliders are disabled and the bar says "the show drives".
  - Plays: with eight settings at 1280 px the settings zone scrolls sideways inside itself and Hold, Loop, both switches and Open are fully inside the bar (Review Focus 3); the bar is 48 px high in every state; a slider's value changing does not move its neighbours.
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test -- dockbar dock` — FAIL.
- [ ] **Step 3: Implement** from the bar of `M-Effects-Big-Picked.png`.
- [ ] **Step 4: Run** tests and Storybook — PASS. Stories `Min`, `MinManySettings`, `MinFromTheShow`, `MinOnTheRig`, each in the three looks. Boards: add `builder-dock-min`, `builder-dock-min-many`, `builder-dock-min-from-the-show`.
- [ ] **Step 5: Commit** (code, then baselines).

### Task 7: The editor screen

**Files (modify):** `packages/ds/src/builder/BuilderScreen.tsx` (the `return` only, plus the two new props below), `BuilderScreen.module.css`, `BuilderHeader.tsx`, `BuilderPhone.tsx`, `dialogs/ImpactDialog.tsx`, `dialogs/ProgramDialogs.tsx`, `Screen.stories.tsx`, `ScreenConflict.stories.tsx`, `ScreenImpact.stories.tsx`, `ScreenHost.tsx`, `EditingHost.tsx`, `DockHost.tsx`, `__tests__/screen.test.tsx`, `packages/ds/scripts/test-visual.mjs`.

**Interfaces:**
- Consumes: every piece of Tasks 2 to 6, `feedsOf` (Task 4), `useDockFace` (Task 1), `NoticeLine`, `HintLine`.
- Produces: `BuilderScreenProps` gains `dockFace?: DockFace` and `onDockFace?: (f: DockFace) => void`; left out, the screen keeps the face itself with `useDockFace` (starting `min` below 1180 px). The notice it is given may be the structured form `{ tone, text, action? }` used by the Show screen, or a node as today. New stories: `Light`, `Stage`, `Min`, `MinLight`, `MinStage`, `Big` (60 nodes), `BigPicked`, `Empty`, `At1024`, `OnTheRig`, `FromTheShow`, and light variants of the dialog stories. New boards: `builder-screen-light`, `builder-screen-min`, `builder-screen-big-picked`, `builder-screen-empty`, `builder-screen-1024`, `builder-screen-from-the-show`.

- [ ] **Step 1: Write the failing tests** (plays).
  - At 1280 × 800, panels open: the bar, the 24 px line, the canvas with the 290 px column at its right, the three panels, the hint line; the page does not scroll.
  - Minimise: the canvas grows by the height the panels give up; no node's position on the canvas changes; "Open" is where "Minimise" was, at the right; the choice is stored.
  - With no node picked the right column holds the hatched "Inspector" block; picking a node changes no box outside that column.
  - At 1024 × 768: the bottom starts minimised; a picked node's panel lays over the right 290 px of the canvas; the window does not scroll.
  - At 899: the read-only view with today's words ("Editing needs a wider screen", the settings list, the graph with pan, zoom and Fit).
  - The bar: a 60-character program name is cut with its tooltip and the bar does not wrap; Save is the only primary button; a name refusal shows on the 24 px line in place of the notice and ends at the next action.
  - Dialogs: today's dialog tests stay green untouched; "This save changes the show", "This save breaks other programs", "Apply to the running show?", the conflict and "Leave without saving?" keep their words and buttons.
  - `Big`: the performance play of Task 2 still passes on the whole screen (Review Focus 1).
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test:storybook` — FAIL on the new ones.
- [ ] **Step 3: Implement.** The state and handlers above `BuilderScreen`'s `return` stay as they are.
- [ ] **Step 4: Run** tests and Storybook — PASS. `df -h /System/Volumes/Data | tail -1`, then `pnpm update:visual --only builder-screen`. Open `builder-screen-well`, `builder-screen-min` and `builder-screen-1024` with the Read tool and compare with the boards. Owner looks at the editor: Well, Min, BigPicked, Empty, OnTheRig, FromTheShow, At1024 and the phone view, each in dark, light and stage.
- [ ] **Step 5: Commit** (code, then baselines).

### Task 8: The programs page

**Files (modify):** `packages/ds/src/builder/ProgramList.tsx`, `BuilderScreen.module.css` or a new `ProgramList.module.css`, `List.stories.tsx`, `dialogs/ProgramDialogs.tsx` (the delete confirm), `__tests__/screen.test.tsx` (or the list's own test file), `packages/ds/scripts/test-visual.mjs`.

**Interfaces:**
- Consumes: `useProgramsView` (Task 1), `Panel`, `Choice`, `Menu`, `IconButton`, `EmptyState`, `NoticeLine`, `HintLine`, `Curve`.
- Produces: `ProgramListProps` gain `view?: ProgramsView` and `onView?: (v: ProgramsView) => void`; left out, the page keeps the view itself with `useProgramsView`. Everything else is unchanged.

- [ ] **Step 1: Write the failing tests.** Today's list tests stay green untouched under `list`. New:
  - The "View" radiogroup has `list` and `tiles`, shows the stored choice, and switching redraws without a reload.
  - Tiles: each program is a tile with its picture, its name as the link that opens it, "N nodes · settings" and "N rows"; `···` opens a menu with Duplicate, "Copy to…" (disabled when there is no other show) and Delete; "+ New program" is the last tile of each show; the same handlers are called as in the list.
  - The playing show's panel is first and says "playing".
  - "Delete <name>?" is a danger dialog with exactly one `fault` button, and its text is today's.
  - Each refusal of the inventory shows for its program in both views.
  - Plays: six tiles across at 1280 px; a tile has the same box with and without a refusal, and the refusal's whole sentence is reachable when cut (Review Focus 5); a 40-character program name is cut with its tooltip in both views; "No programs yet" is the hatched empty state; below 900 px the narrow list shows whatever the stored view.
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test -- screen list` — FAIL on the new ones.
- [ ] **Step 3: Implement** from `L-Effects-List.png` and `L-Effects-Tiles.png`.
- [ ] **Step 4: Run** tests and Storybook — PASS. Stories `Tiles`, `TilesLight`, `TilesStage`, `TilesRefused`, `ListLight`. Boards: `pnpm update:visual --only builder-list`, adding `builder-list-tiles`, `builder-list-tiles-light`, `builder-list-tiles-refused`. Owner looks at the programs page in both views and the three looks.
- [ ] **Step 5: Commit** (code, then baselines).

### Task 9: Wiring in the app

**Files (modify):** `apps/web/src/builder/BuilderPage.tsx` and `ListPage.tsx` (what they pass to the screens; their hooks and handlers are not changed), their tests in `apps/web/src/builder/__tests__/`, `apps/web/e2e/builder.spec.ts`, `apps/web/e2e/probe.spec.ts`.

| State | Event | Result |
|---|---|---|
| Editor, 1280 wide | — | Panels open, or as stored |
| Editor | "Minimise" | The bar; stored; a reload keeps it |
| Editor, bar | Hold, a setting's slider, a switch | The same call as from the open panels |
| Editor | On the rig turned on | As today; the "on the rig" mark in the bar; the DMX list in the panel, or nothing more in the bar |
| Editor | On the rig refused | Its off reason on the line under the bar, and as the switch's tooltip |
| Editor | From the show turned on | As today; Test dimmed in both faces |
| Editor | Save, apply, conflict, impact, leave | Exactly as today (the page tests for these stay green untouched) |
| Editor | the window narrows under 1180 | The picked node's panel lays over the canvas; the stored face is kept |
| Editor | the palette: "Minimise the panels" / "Open the panels" | Switches the face |
| Programs page | "View" changed | Redrawn; stored; a reload keeps it |
| Programs page | Duplicate, Copy to…, Delete, New program from a tile | Exactly as from the list |

- [ ] **Step 1: Write the failing tests**: one per row of the table, except the rows that say "exactly as today", which are the existing tests.
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds build && pnpm -F @ptah-app/web test -- builder` — FAIL.
- [ ] **Step 3: Implement.** The page's notices go to the screens in the structured form: the "saved, not applied: … Open the patch" notice in `sand` with its link; "the show does not list this program: … Retry", "On the rig could not be turned off…", "This program could not be read" (with "← Programs") and "Programs could not be read: … Retry" in `fault` with their action. Today's words, unchanged. Add the two palette commands.
- [ ] **Step 4: Update the e2e specs** only where they open a `Select` that is now a radiogroup, read the preview's old letters, or find a control that moved into a menu. Add one test: minimise, hold the test note from the bar, a light's swatch changes; reload, the bar is still there. Add one: choose tiles, open a program from its tile.
- [ ] **Step 5: Run** `pnpm -F @ptah-app/web test && pnpm -F @ptah-app/web test:e2e -- builder.spec.ts && pnpm -F @ptah-app/web test:e2e -- probe.spec.ts` — PASS.
- [ ] **Step 6: Commit**: `git commit -m "feat(web): Effects in ZENITHALL" <paths>`

### Task 10: Checkpoint

- [ ] **Step 1:** `df -h /System/Volumes/Data | tail -1`; `du -sh target`; clean per AGENTS.md if needed.
- [ ] **Step 2:** `pnpm allcheck` — green. A failure that passes when re-run alone is reported as load, with the output.
- [ ] **Step 3:** Start the app as the e2e rig does (a temporary root copied from `fixtures/`, `--fake-io`, never `~/.ptah`). Walk at 1280 × 800, 1024 × 768 and 390 × 844, in the three looks: the programs page in both views; new, duplicate, copy to, a refused delete; open a program; add a node with a letter and from a dropped wire; wire by mouse and by keyboard; pick one node and several; edit a field; a refusal; a note; Tidy, Undo, Redo, Fit; Hold, Loop, a setting's slider and its editor; Preview modes; On the rig on and off; From the show on and off; minimise and open; Save with the impact dialog; ⌘K. Save a screenshot of each to the plan's workspace, open the key ones with the Read tool, and report anything wrong.
- [ ] **Step 4:** In `docs/design-system.md`, under "ZENITHALL (in progress)", add a short "Effects" section: the three kinds of node, the wires, the editor's regions and sizes, the two faces of the bottom, the two preferences. In `~/projects/ptah/docs/superpowers/plans/2026-11-19-v2-redesign-deferred.md`, strike out the plan 4 line (the unsteady story) if done.
- [ ] **Step 5:** Owner check of the running app. Commit: `git commit -m "docs(ds): Effects in ZENITHALL" <paths>`.
