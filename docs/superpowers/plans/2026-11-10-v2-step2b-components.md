# V2 Step 2B — Design system components: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The generic component set of the design system (spec §6) built
on Base UI with the C1 look, each with stories in both modes and both
viewports, behaviour tests, the axe gate, a library build Step 3 can
import, and a visual-regression harness.

**Architecture:** Every component is a folder under
`packages/ds/src/components/<Name>/` with the component, a CSS module
styled only from the tokens, a story file (`Normal`/`Stage`), and a test.
Base UI supplies behaviour, focus management and ARIA through its
unstyled parts and data attributes (`data-pressed`, `data-open`,
`data-highlighted`, `data-disabled`); our CSS modules supply every pixel.
A tiny `Icon` wrapper fixes Lucide's size and stroke. The Table is the
one component with real logic of its own (virtualised rows, keyboard
navigation). A "Gallery" story composes everything for the visual
regression harness.

**Tech Stack:** React 19, TypeScript 5.9 strict, Base UI
`@base-ui-components/react@1.0.0-rc.0`, `lucide-react@1.61.0`,
`@tanstack/react-virtual` 3.14.x (a release ≥ 14 days old), CSS Modules
via Vite 6, Storybook 8.6.19, Vitest 3 + Testing Library 16, Playwright
1.59.1 (screenshots), Biome, pnpm 9.15.4, Node ≥ 20.11.

**Spec:** `docs/superpowers/specs/2026-11-09-v2-step2-design-system-design.md`
(§3 rules, §4 tokens, §6 components, §7 smooth/elegant tests, §8 Storybook,
§9 gates, §10 package and tooling, §11 constraints, §14: this is plan 2B).

## Global Constraints

- Repo `~/projects/ptah-v2`, branch `step2b-components` off `master`
  (≥ `step2a-complete`). Package `packages/ds`; Biome only (2 spaces, 80
  columns, double quotes); strict TS; prose ≤ 80 columns.
- Styling only through the tokens of 2A (`var(--…)`): colours limited to
  `--bg --fg --fg-dim --line --accent --accent-hover --accent-active
  --fault --warn --on-bg`; radius 0 everywhere; no `box-shadow` except the
  focus ring `var(--focus)`; no `filter`, no gradients; borders are
  `var(--hair) solid var(--line)`; motion only `var(--m-fast|--m-mid|
  --m-slow)` with `var(--ease)`; every interactive target ≥ `var(--tap)`
  (44 px) under `@media (pointer: coarse)`; type through `.t-*` voices or
  the `--t-*` sizes; numbers tabular.
- Active state of a toggle inverts (`--fg` ground, `--on-bg` text); the
  accent marks focus, selection, the primary action and progress only.
- Every component: a CSS module, a `Normal` and a `Stage` story (phone
  and laptop via the toolbar), a Testing Library test of its behaviour
  (keyboard included), axe-clean in both modes (the 2A gate), exported
  from `src/index.ts`.
- Dependencies pinned exactly; a version must be ≥ 14 days old on the day
  it is added (check `npm view <pkg> time`).
- Gates stay in `pnpm allcheck` (2A's plus `build` and `test:visual`).

## Review Focus

1. A thumb on a phone: every interactive element reaches 44×44 px at
   `pointer: coarse`, including Table rows, Tabs and the Slider thumb.
   Pinned in Task 1 (a shared `tap.css` test) and Tasks 2, 4, 8.
2. Keyboard-only use: each component is reachable and operable without a
   pointer; Esc closes every overlay; focus returns to the opener. Pinned
   per component in Tasks 2–9.
3. A 10 000-row Table must not freeze the page: only visible rows are in
   the DOM; arrow keys move one row and scroll it into view. Task 8.
4. A fault storm: twenty toasts in a second must not cover the screen;
   at most three are visible with "+N more", oldest first to go. Task 7.
5. Overlays on black: a Dialog or Popover must be separable from the
   page without a shadow: a hairline and a 60 % black backdrop for
   modal surfaces; the Stage story proves it stays legible at the dimmer
   greys. Task 6.

---

### Task 1: Component scaffolding, shared helpers, Icon, Kbd, Label, Panel, EmptyState

**Files:**
- Create: `packages/ds/src/components/_shared/cx.ts`,
  `packages/ds/src/components/_shared/tap.css`,
  `packages/ds/src/components/_shared/__tests__/{cx,tap}.test.ts(x)`,
  `packages/ds/src/icons/Icon.tsx`, `packages/ds/src/icons/index.ts`,
  `packages/ds/src/components/{Kbd,Label,Panel,EmptyState}/{<Name>.tsx,
  <Name>.module.css,<Name>.stories.tsx,<Name>.test.tsx,index.ts}`
- Modify: `packages/ds/vitest.config.ts` (`css: { modules: {
  classNameStrategy: "non-scoped" } }`), `packages/ds/src/index.ts`,
  `packages/ds/package.json` (dependencies `@base-ui-components/react`
  `1.0.0-rc.0`, `lucide-react` `1.61.0`; `peerDependencies` react/react-dom
  `^19`), `packages/ds/src/gates/motion.ts` (2A deferred: also inspect
  `transition-delay` and `animation-delay`, allowed values `0ms` or the
  three durations)

**Interfaces:**
- Produces: `cx(...parts: Array<string | false | null | undefined>):
  string`; `tap.css` exports the class `.tap` (`min-width/min-height:
  var(--tap)` under `pointer: coarse`); `<Icon name="…" size={16 | 20} />`
  (Lucide, `strokeWidth={1.5}`, `aria-hidden` unless `label` given); the
  curated icon list in `icons/index.ts` (`check x chevron-down chevron-
  right search alert-triangle alert-circle info play square zap lock
  unlock eye eye-off plus minus more-horizontal`); `Kbd` (`<kbd>` in
  `.t-mono`, hairline), `Label` (Base UI `Field.Label` wrapper, `.t-label`),
  `Panel` (a grid region: `section` with hairline edges chosen by props
  `top|right|bottom|left`, padding `--s4`), `EmptyState` (icon + one line
  in `--fg-dim` + optional action slot).

- [ ] **Step 1: Write the failing tests** — `cx` joins and drops falsy;
  `tap.css` contains the `pointer: coarse` media rule with `var(--tap)`;
  `Icon` renders an `svg` with `stroke-width="1.5"`, `width`/`height` of
  the size, `aria-hidden="true"` by default and `role="img"` + `aria-label`
  when `label` is given; `Kbd` renders `<kbd>`; `Panel` applies the edge
  classes requested and none other; `EmptyState` renders the action slot.
- [ ] **Step 2: Run to verify they fail**; **Step 3: Implement** (CSS
  modules use only tokens; no radius); stories `Normal`/`Stage` for the
  four components and an `Icons` story listing the curated set; **Step 4:
  Verify** `pnpm -F @ptah-app/ds test`, `test:storybook`, `typecheck`,
  `check`; **Step 5: Commit** — `feat(ds): component scaffolding, Icon,
  Kbd, Label, Panel, EmptyState`

### Task 2: Button, IconButton, Toggle

**Files:** `src/components/{Button,IconButton,Toggle}/…` (Base UI
`button` and `toggle`).

**Interfaces:**
- Produces: `Button` props `variant: "default" | "primary" | "danger"`
  (default hairline + `--fg`; primary `--accent` ground + white; danger
  hairline in `--fault` with `--fault` text), `size: "md" | "lg"` (36 /
  44 px height, both `.tap`), `disabled`, `loading` (a text ellipsis, no
  spinner animation); `IconButton` (square, `label` required → `aria-
  label`); `Toggle` (`pressed`/`onPressedChange`; pressed = inverted
  `--fg` ground with `--on-bg` text; exposes `data-pressed`).

- [ ] **Step 1: Write the failing tests** — variant/size classes; `Toggle`
  flips on click and on Space/Enter and sets `aria-pressed`; disabled
  buttons are not activatable; `IconButton` without `label` is a type
  error (a `// @ts-expect-error` test) and renders `aria-label`; focus
  ring via `:focus-visible` is the only `box-shadow` in the modules
  (a CSS text test over `src/components/**/*.module.css` — put it in
  `_shared/__tests__/rules.test.ts` and let every later task extend
  nothing: it scans all modules: no `border-radius` other than 0, no
  `box-shadow` other than `var(--focus)`, no hex colours, no `filter`,
  no `gradient`).
- [ ] **Steps 2–5** as Task 1; commit — `feat(ds): Button, IconButton,
  Toggle`

### Task 3: TextField and NumberField

**Files:** `src/components/{TextField,NumberField}/…` (Base UI `field`,
`input`, `number-field`).

**Interfaces:**
- Produces: `TextField` (`label`, `description?`, `error?` in `--fault`,
  `mono?` for ids/hex; hairline bottom only, no box: the field is a line
  on the grid), `NumberField` (`min max step`, keyboard ±step, Shift ×10,
  `scrub` drag on the label as Base UI's ScrubArea, tabular value,
  `unit?` suffix).

- [ ] **Step 1: Write the failing tests** — label association
  (`getByLabelText`), typing updates value, `error` sets `aria-invalid`
  and renders the message, ArrowUp/Down step and Shift+Arrow ×10 within
  bounds, invalid text does not commit.
- [ ] **Steps 2–5**; commit — `feat(ds): TextField, NumberField`

### Task 4: Slider and Tabs

**Files:** `src/components/{Slider,Tabs}/…` (Base UI `slider`, `tabs`).

**Interfaces:**
- Produces: `Slider` (`orientation: "horizontal" | "vertical"` — the
  fader; track = hairline, filled part = `--fg`, thumb = a 2 px `--fg`
  line with a `.tap` hit area; `showValue` tabular; `onValueCommitted`),
  `Tabs` (`Tabs.Root/List/Tab/Panel`; the active tab underlined by a 2 px
  `--accent` line; roving tabindex from Base UI).

- [ ] **Step 1: Write the failing tests** — arrow keys move the slider by
  `step`, Home/End to bounds, `aria-valuenow`; vertical orientation sets
  `aria-orientation`; Tabs switch on click and ArrowLeft/Right, panels
  hidden/shown; both components' hit areas are `.tap`.
- [ ] **Steps 2–5**; commit — `feat(ds): Slider, Tabs`

### Task 5: Select and Combobox

**Files:** `src/components/{Select,Combobox}/…` (Base UI `select`,
`combobox`).

**Interfaces:**
- Produces: `Select<T>` (`items: { value: T; label: string }[]`,
  `value/onValueChange`, popup is a hairline surface on `--bg`,
  highlighted item = `--accent` left bar 2 px, selected = check icon),
  `Combobox<T>` (same items, typed filtering, `emptyText`).

- [ ] **Step 1: Write the failing tests** — opens on click and on
  ArrowDown, keyboard navigation highlights (`data-highlighted`), Enter
  selects, Esc closes and restores focus; Combobox filters on typing and
  shows `emptyText` when nothing matches.
- [ ] **Steps 2–5**; commit — `feat(ds): Select, Combobox`

### Task 6: Dialog, Popover, Tooltip, Menu

**Files:** `src/components/{Dialog,Popover,Tooltip,Menu}/…` (Base UI
`dialog`, `popover`, `tooltip`, `menu`).

**Interfaces:**
- Produces: `Dialog` (`title`, `description?`, `actions` slot; surface
  `--bg` with a hairline, backdrop `rgb(0 0 0 / 0.6)`; opens/closes with
  `var(--m-mid) var(--ease)` opacity only; focus trapped and returned),
  `Popover` (anchored hairline surface, arrowless), `Tooltip` (`.t-label`
  on `--bg` with hairline, delay 400 ms open / 0 close — a Base UI prop,
  not a CSS animation), `Menu` (items with optional `Kbd` hint and
  `Icon`; danger items in `--fault`; submenu via Base UI).

- [ ] **Step 1: Write the failing tests** — Dialog opens, traps Tab,
  closes on Esc and returns focus to the trigger, `aria-modal`; Popover
  closes on outside click; Tooltip appears on focus (keyboard) and on
  hover, has `role="tooltip"`; Menu opens with ArrowDown, items navigable,
  Enter activates, Esc closes; the rules test (Task 2) still passes with
  the backdrop (an `rgb()` with alpha is allowed by the rule for the
  backdrop class only — encode this one exception explicitly).
- [ ] **Steps 2–5**; the Stage stories prove legibility; commit —
  `feat(ds): Dialog, Popover, Tooltip, Menu`

### Task 7: Toast

**Files:** `src/components/Toast/…` (Base UI `toast`).

**Interfaces:**
- Produces: `ToastProvider` + `useToast()` → `{ notify({ title,
  description?, severity: "info" | "warning" | "fault", timeout?: number
  }) }`; a stack bottom-right (laptop) / bottom full-width (phone); at
  most **3** visible, the rest counted in a "+N more" line; severity dot
  in `--fg-dim` / `--warn` / `--fault`; `aria-live="polite"` for info,
  `"assertive"` for fault; dismiss on click, Esc dismisses the newest.

- [ ] **Step 1: Write the failing tests** — twenty notifications leave
  three toasts and a "+17 more" line; dismissing the oldest reveals the
  next; a fault toast is announced assertively; timeout removes a toast
  (fake timers).
- [ ] **Steps 2–5**; commit — `feat(ds): Toast with a visible cap`

### Task 8: Table

**Files:** `src/components/Table/{Table.tsx, Table.module.css, useRowNav.ts,
Table.stories.tsx, Table.test.tsx, index.ts}`; dependency
`@tanstack/react-virtual` (3.14.x, ≥ 14 days old).

**Interfaces:**
- Produces: `Table<Row>` props `columns: { key: keyof Row & string;
  header: string; width?: number; align?: "start" | "end"; mono?: boolean;
  render?: (row: Row) => ReactNode }[]`, `rows: Row[]`, `rowKey: (row) =>
  string`, `selectedKey?`, `onSelect?(key)`, `onActivate?(row)` (Enter /
  double click), `rowHeight` = 40 (one grid unit; `.tap` on coarse),
  `virtualize` (default true above 100 rows), `emptyState?: ReactNode`.
  Hairline grid (row separators and column rules), sticky `thead`,
  selected row = `--accent` left bar 2 px and `--fg` text, focused row =
  focus ring; keyboard: ArrowUp/Down one row, PageUp/Down ten, Home/End,
  Enter activates, typeahead on the first column; ARIA `grid`/`row`/
  `gridcell` with `aria-rowindex`, `aria-selected`.

- [ ] **Step 1: Write the failing tests** — 10 000 rows render fewer than
  60 `row` elements (jsdom with a mocked `getBoundingClientRect` of 400 px
  height); ArrowDown moves selection and `aria-selected`; Home/End;
  Enter calls `onActivate`; typeahead jumps to the first matching row;
  the header is a sticky element (CSS text test); empty rows render
  `emptyState`.
- [ ] **Steps 2–5**; stories: 12 rows, 10 000 rows, empty; commit —
  `feat(ds): Table with virtualised rows and keyboard navigation`

### Task 9: CommandPalette

**Files:** `src/components/CommandPalette/{CommandPalette.tsx, match.ts,
CommandPalette.module.css, CommandPalette.stories.tsx,
CommandPalette.test.tsx, match.test.ts, index.ts}`.

**Interfaces:**
- Produces: `CommandPalette` props `commands: { id; title; group?;
  keywords?: string[]; shortcut?: string[]; run(): void }[]`,
  `open/onOpenChange`, `hotkey` default `"Mod+K"` (installed by
  `useCommandPaletteHotkey(onOpen)`: ⌘K on macOS, Ctrl+K elsewhere,
  ignored while typing in inputs as 2A's F2 handler does); built on
  `Dialog` + a listbox; `match(query, command): number | null` scores
  case-insensitive subsequence matches on title then keywords (higher =
  better, `null` = no match), results grouped by `group`, top 50.

- [ ] **Step 1: Write the failing tests** — `match` ranks a prefix above
  a scattered subsequence and returns `null` for no match; the hotkey
  opens the palette and is ignored inside an input; typing filters;
  ArrowDown/Enter runs the command and closes; Esc closes and returns
  focus; shortcuts render as `Kbd`.
- [ ] **Steps 2–5**; commit — `feat(ds): CommandPalette with Mod+K`

### Task 10: StatusRegion and the Gallery story

**Files:** `src/components/StatusRegion/…`, `src/stories/Gallery.stories.tsx`.

**Interfaces:**
- Produces: `StatusRegion` (the 56 px top bar skeleton: `start`, `center`,
  `end` slots on the grid with a hairline bottom; children are plain
  nodes — the live words come in 2C), the `Gallery` story: every component
  of Tasks 1–10 on one page in its resting state and one active state,
  laid out on the grid, in `Normal` and `Stage`.

- [ ] **Step 1: Write the failing tests** — StatusRegion renders the three
  slots and the hairline class; the Gallery story renders without act()
  warnings (render smoke through `composeStories`) and contains one
  instance of each component (a `data-component` attribute on each root,
  asserted by name list).
- [ ] **Steps 2–5**; commit — `feat(ds): StatusRegion and the Gallery
  story`

### Task 11: Library build

**Files:**
- Create: `packages/ds/vite.config.ts` (library mode, ESM only, entries
  `index` + one per component folder + `tokens` + `mode`, externals
  `react`, `react-dom`, `@base-ui-components/react/*`, `lucide-react`,
  `@tanstack/react-virtual`; CSS emitted as `dist/ds.css` plus the fonts
  copied), `packages/ds/src/__tests__/build.test.ts`
- Modify: `packages/ds/package.json` (`build` = `vite build`, `exports`
  map with `types`; `files`), `tsconfig.build.json` (declarations to
  `dist/types`), root `package.json` (`allcheck` gains `pnpm -r
  --if-present build` after `typecheck`), `.gitignore` (`dist/`)

- [ ] **Step 1: Write the failing test** — after `pnpm -F @ptah-app/ds
  build` (run by the test with `execFileSync`, node environment),
  `dist/index.js` exists and exports every public name of `src/index.ts`
  (compare the sorted lists), `dist/ds.css` exists and contains `--bg:`,
  `dist/fonts/Inter-Regular.woff2` exists, no `dist/**/*.js` contains the
  string `"react/jsx-runtime"` bundled (externals respected: it must be an
  import, check `import` of it is present and no `createElement`
  duplication — assert the file imports from `react/jsx-runtime`).
- [ ] **Steps 2–5**; commit — `build(ds): Vite library build with per-
  component entries`

### Task 12: Visual regression harness

**Files:**
- Create: `packages/ds/scripts/test-visual.mjs`,
  `packages/ds/visual/baselines/darwin/*.png` (committed from this Mac),
  `packages/ds/visual/README.md`, `packages/ds/src/__tests__/test-visual.test.ts`,
  `.github/workflows/visual-baselines.yml` (`workflow_dispatch`: builds
  Storybook on `ubuntu-24.04`, writes `visual/baselines/linux/*.png`,
  uploads them as an artifact)
- Modify: `packages/ds/package.json` (`test:visual`, `update:visual`),
  root `allcheck` (`pnpm -r --if-present test:visual` after
  `test:storybook`), `.github/workflows/ci.yml` (nothing new: the step is
  inside allcheck), `docs/design-system.md` (how baselines are refreshed)

**Interfaces:**
- Produces: `test-visual.mjs` reuses the axe gate's build+serve helper
  (extract `scripts/storybook-server.mjs` from `test-storybook.mjs`:
  `startStorybook(): Promise<{ url, stop }>`), screenshots the `Gallery`
  story (`Normal` and `Stage`) at 1280×800 and 390×844 with Playwright
  Chromium (`deviceScaleFactor: 1`, fonts loaded: wait for
  `document.fonts.ready`), compares against `visual/baselines/<platform>/
  <story>-<viewport>.png` with Playwright's `toHaveScreenshot`-style pixel
  comparison via `pixelmatch` (threshold 0.1, max 0.2 % differing pixels);
  when no baseline directory exists for `process.platform` it prints
  `Visual gate: no baselines for <platform>; run "pnpm -F @ptah-app/ds
  update:visual" on that platform` and exits 0 (documented as a skip);
  `update:visual` rewrites the baselines; diffs are written to
  `visual/diff/` (gitignored) on failure.

- [ ] **Step 1: Write the failing test** — the script with
  `PLAYWRIGHT_BROWSERS_PATH=/nonexistent` exits 2 with the axe gate's
  install message (shared helper), and with a temp `--baselines <empty
  dir>` exits 0 printing the no-baselines skip line.
- [ ] **Steps 2–5**: implement; generate and commit the darwin baselines;
  run `test:visual` twice to prove it is stable; **Ruling recorded in the
  plan:** Linux baselines are produced by the `visual-baselines` workflow
  and committed by the controller after its first run, so Linux CI skips
  the visual gate until then; commit — `test(ds): visual regression
  harness with per-platform baselines`

### Task 13: Documentation and 2A deferred items

**Files:**
- Modify: `docs/design-system.md` (a "Components" section: the list with
  one line each, the data attributes a consumer may style on, the Table's
  keyboard map, the CommandPalette hotkey, the Toast cap, the Gallery and
  visual gate, how to add a component: folder, module, stories, test),
  `README.md` (build and visual gate lines), `packages/ds/src/stories/
  __tests__/stories.test.tsx` (2A deferred: a `Stage` case asserting the
  stage `fg` hex and a positive `✓` check), `packages/ds/src/stories/
  Tokens.stories.tsx` (2A deferred: show the CSS variable name next to
  the TS key)
- Create: `packages/ds/src/__tests__/docs-components.test.ts` — the doc
  names every exported component of `src/index.ts`.

- [ ] **Step 1: Write the failing test**; **Step 2: Write the docs and the
  two deferred fixes**; **Step 3: Verify** `pnpm -F @ptah-app/ds test`,
  `test:storybook`, `check`; **Step 4: Commit** — `docs(ds): components,
  gates and how to add one`
