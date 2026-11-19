# Redesign 1 of 7: ZENITHALL foundation and shell — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give PTAH V2 the ZENITHALL look at the level every screen shares: tokens for three looks, the type, the shared components, the header with the new places and addresses.

**Architecture:** The tokens source (`packages/ds/src/tokens/tokens.ts`) gains the ZENITHALL colour set for three looks and keeps today's token names as aliases of the new ones, so every existing screen keeps working and takes the new colours at once. Shared components are restyled in place (same props, same roles, same labels). The shell is rebuilt as a header band. Screens are re-laid-out by the later plans, which also retire the aliases.

**Tech Stack:** TypeScript, React, CSS modules with tokens only, Vitest, Storybook, Playwright (visual and e2e), Biome.

**Spec:** `~/projects/ptah/docs/superpowers/specs/2026-11-19-v2-redesign-design.md` (the values are in "The look in numbers"; the inventory is `2026-11-19-v2-redesign-inventory.md`). Code: `~/projects/ptah-v2`, branch `redesign-foundation`.

## The series

| Plan | Delivers | Depends on |
|---|---|---|
| **1 Foundation and shell** (this one) | tokens, looks, type, shared components, header, addresses | — |
| 2 Live | checklist, board, phone board, the header status | 1 |
| 3 Show | grid, row panel, chain, "Notes as" | 1 |
| 4 Effects | canvas (square wires, node kinds), panels and the minimised bar, add box, programs list and tiles | 1 |
| 5 Lights | Rig (strip, map, list and panel), Patch, Library, type editor | 1 |
| 6 Inspect and Settings | grouped grid, why panel, look back, settings | 1, 3 ("Notes as") |
| 7 Close | narrow and phone views, remaining states, alias removal, `docs/design-system.md` rewritten, final review | 2–6 |

Each plan ends with the app working and `pnpm allcheck` green.

## Global Constraints

- Exactly today's features, no less, no more, plus the additions the spec lists under "New things".
- Inside screens, today's wording is kept. Only the six header names change: Lights, Effects, Show, Live, Inspect, Settings.
- Nothing shifts: picking, hovering, a state change or a look change never moves or resizes anything.
- Calm when well, loud only when wrong: `fault` appears only for a fault.
- Tokens-only styling: no colour, size or font literal in a CSS module; Biome only.
- No new dependency younger than 14 days; every dependency pinned exactly.
- Never start V1 services or pm2; never touch `~/.ptah` or `~/ptah-home`; leave the untracked `docs/design/brief/` and `.ignore` alone; the Storybook servers on 6006–6008 stay up; no push unless the owner asks.
- Disk (AGENTS.md): `df -h /System/Volumes/Data | tail -1` before a heavy build; below 30 GB free, clean first and tell the owner. No extra worktree.
- At most three agents at once. A design-system task runs `pnpm -F @ptah-app/ds test:visual -- --only <its boards>`; the full gate runs at the checkpoints.
- Every task that changes how something looks ends with the owner looking at its Storybook stories before the task is closed.

## Decisions this plan makes

- **Addresses.** `/live` (and `/` redirects to it), `/lights` (opens the venue in use, as `/venue` does today), `/lights/venue/<id>`, `/lights/venue/<id>/patch`, `/lights/library`, `/lights/library/<id>`, `/effects`, `/effects/<showId>/<programId>`, `/show`, `/show/<id>`, `/inspect`, `/inspect/back`, `/settings`. Old addresses redirect, keeping the query string and the hash. Venue ids sit under `/lights/venue/` so no id can collide with `library`.
- **Looks.** `Mode = "dark" | "light" | "stage"`. The page attribute stays `data-mode`: absent for dark, `light`, `stage`. A stored `normal` reads as dark. F2 switches stage on and off and returns to the last of dark or light, kept under `ptah.ds.mode.base`.
- **Aliases.** Today's names keep working in this plan: `bg`→`ground`, `fg`→`tint`, `fgDim`→`tintDim`, `line`→`line`, `lineControl`→`lineStrong`, `fillOff`→`panel`, `accent`→`sand`, `accentHover`/`accentActive`→`sand`, `onAccent`→`onSand`, `onBg`→`onTint`, `warn`→`sand`, `fault`→`fault`, `onLight` unchanged.
- **Fonts.** `@fontsource/chakra-petch` and `@fontsource/jost`, each at the newest version published at least 14 days before the task runs, pinned exactly; their files are bundled by the build, so nothing loads from the network. Inter is removed at the end of plan 7.
- **The header status** is drawn by the shell from a `status` prop; plan 2 supplies the real value. In this plan the app passes nothing and the header shows no status.

## Review Focus

1. **A browser that already holds `ptah.ds.mode = "normal"` or `"stage"`** opens in dark or stage, never in an unknown look. (Task 2)
2. **An old bookmark with a query**, such as `/debug/back?at=123&show=notes` or `/library?q=par&f=mine`, lands on the new address with the query intact. (Task 7)
3. **A look change while a dialog or menu is open** restyles it in place; nothing closes, moves or loses focus. (Task 5)
4. **The light look passes the same contrast gates as dark** for every text token on every ground it is used on. (Task 1)
5. **Below 600 px the header keeps today's behaviour**: the logo and the Commands button, no places, no look switch. (Task 6)

---

### Task 1: Tokens for three looks, with aliases

**Files:**
- Modify: `packages/ds/src/tokens/tokens.ts`, `packages/ds/src/tokens/gates.ts`, `packages/ds/src/tokens/build.ts`, `packages/ds/src/tokens/tokens.css` (generated)
- Test: `packages/ds/src/tokens/__tests__/` (extend the existing token and gate tests)

**Interfaces:**
- Produces: `type Mode = "dark" | "light" | "stage"`; `type ColorSet` with the ZENITHALL names (`ground`, `panel`, `band`, `line`, `lineStrong`, `tint`, `tintDim`, `bright`, `onTint`, `sand`, `sandPanel`, `sandLine`, `onSand`, `fault`, `faultPanel`, `onFault`, `stripe1..4`, `onLight`) plus the alias names listed above; `tokens.color: Record<Mode, ColorSet>`; `tokens.type` with `fontLabel`, `fontNumber`, the sizes `label 11`, `chip 12`, `row 14`, `panelTitle 17`, `value 20`, `screenTitle 22`, `logo 26`, `numberMd 26`, `numberXl 124`, weights 300–700, tracking per style; `tokens.radius = 0`; `tokens.cut = 16`; `tokens.rule = 2`; `tokens.size = { chip: 24, button: 30, row: 36, header: 52, tap: 44 }`. CSS variables are the kebab-case of each name.

- [ ] **Step 1: Write the failing tests**

```ts
test("three looks, each a full set", () => {
  expect(Object.keys(tokens.color)).toEqual(["dark", "light", "stage"]);
  for (const m of ["dark", "light", "stage"] as const)
    expect(Object.keys(tokens.color[m]).sort()).toEqual(Object.keys(tokens.color.dark).sort());
});
test("the dark values are the spec's", () => {
  expect(tokens.color.dark).toMatchObject({ ground: "#0b1117", tint: "#a9d6d0", tintDim: "#7fa39f", bright: "#e9f4f2", sand: "#e6c88f", fault: "#ff6b5e", onTint: "#0b1117" });
});
test("the light and stage values are the spec's", () => {
  expect(tokens.color.light).toMatchObject({ ground: "#dfe6e3", tint: "#3d5257", tintDim: "#4f6468", bright: "#1c2a2d", sand: "#7d500c", fault: "#b3261e", onTint: "#eef3f1" });
  expect(tokens.color.stage).toMatchObject({ ground: "#000000", tint: "#5f8f8a", tintDim: "#588580", bright: "#8fb5b0", sand: "#a88f4e", fault: "#d9483c" });
});
test("old names alias the new ones in every look", () => {
  for (const c of Object.values(tokens.color)) {
    expect([c.bg, c.fg, c.fgDim, c.accent, c.warn, c.onBg]).toEqual([c.ground, c.tint, c.tintDim, c.sand, c.sand, c.onTint]);
  }
});
test("every look passes its contrast rules", () => {
  for (const m of ["dark", "light", "stage"] as const)
    for (const r of checkContrast(m, tokens.color[m])) expect(r.ok, `${m}: ${r.name} ${r.ratio.toFixed(2)}`).toBe(true);
});
test("the css has a root block and one block per other look", () => {
  const css = renderTokensCss(tokens);
  expect(css).toContain(':root[data-mode="light"]');
  expect(css).toContain(':root[data-mode="stage"]');
  expect(css).toContain("--radius: 0px");
});
```

- [ ] **Step 2: Run them**: `pnpm -F @ptah-app/ds test -- tokens` — FAIL (no `dark` look).

- [ ] **Step 3: Write the tokens.** All colour values come from the spec's Colours table. Translucent ones are written as 8-digit hex (`panel` dark `#a9d6d014`, light `#3d525717`, stage `#5f8f8a1a`; `band` `…29`/`…26`/`…24`; `line` `…4d`/`…50`/`…4d`; `lineStrong` the same ink at `8c`; `sandPanel` `…1a`/`…1a`/`…1f`; `sandLine` `…66`; `faultPanel` the fault ink at `24`). Contrast rules, for each look: `tint`, `tintDim`, `bright`, `sand`, `fault` on `ground` at 4.5 (stage `tintDim` 3); `onTint` on `tint`, `onSand` on `sand`, `onFault` on `fault` at 4.5. `contrast.ts` must composite a translucent colour over `ground` before measuring. `build.ts` emits `:root` from dark and a `:root[data-mode="…"]` block for light and for stage; `--focus` becomes `0 0 0 2px var(--bright)`.

- [ ] **Step 4: Rebuild and run**: `pnpm -F @ptah-app/ds tokens:build && pnpm -F @ptah-app/ds test -- tokens` — PASS. Then `pnpm -F @ptah-app/ds typecheck` — PASS (fix every `"normal"` literal the compiler finds by mapping it to `"dark"`).

- [ ] **Step 5: Regenerate every visual baseline once**: `df -h /System/Volumes/Data | tail -1`, then `pnpm -F @ptah-app/ds update:visual`. This is the one task where all baselines change together. Open the `gallery` stories in Storybook (port 6006) in dark and stage and confirm nothing is unreadable.

- [ ] **Step 6: Commit**: `git add packages/ds && git commit -m "feat(ds): ZENITHALL tokens for three looks, with aliases"`

### Task 2: The look switch logic

**Files:**
- Modify: `packages/ds/src/mode.ts`
- Test: `packages/ds/src/__tests__/mode.test.ts` (extend)

**Interfaces:**
- Produces: `getMode(root?): Mode`; `setMode(mode: Mode, root?): void`; `toggleStage(root?): Mode` (replaces `toggleMode`, which stays exported as an alias until Task 6); `MODE_STORAGE = "ptah.ds.mode"`, `BASE_STORAGE = "ptah.ds.mode.base"`; `initMode` unchanged in signature.

| State | Event | Result |
|---|---|---|
| dark | F2 | stage; base stays dark |
| light | F2 | stage; base light |
| stage, base light | F2 | light |
| stage, no base stored | F2 | dark |
| any | `setMode("light")` | light; base light |
| any | `setMode("stage")` | stage; base unchanged |
| start, stored `normal` | — | dark |
| start, stored `stage`, base `light` | — | stage; F2 gives light |
| start, stored an unknown word | — | dark |
| start, storage throws | — | dark; the look still applies for the session |
| typing in a field | F2 | nothing |

- [ ] **Step 1: Write one failing test per row of the table**, named after the row, asserting `root.getAttribute("data-mode")` (`null`, `"light"`, `"stage"`) and the two storage keys.
- [ ] **Step 2: Run**: `pnpm -F @ptah-app/ds test -- mode` — FAIL.
- [ ] **Step 3: Implement the functions above in `mode.ts`.**
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit**: `git commit -am "feat(ds): three looks, F2 switches stage on and off"`

### Task 3: Type and fonts

**Files:**
- Modify: `packages/ds/package.json`, `packages/ds/src/styles/base.css`, `packages/ds/src/tokens/tokens.ts` (the two font stacks)
- Test: `packages/ds/src/styles/__tests__/` (extend)

- [ ] **Step 1: Check the disk and pick the versions**: `pnpm view @fontsource/chakra-petch time --json` and the same for `@fontsource/jost`; take the newest version at least 14 days old. Add both to `dependencies` with exact versions; `pnpm install`.
- [ ] **Step 2: Write the failing test**: `base.css` imports Chakra Petch at 300, 400, 500, 600, 700 and Jost at 300 from the packages; `--font-label` starts with `"Chakra Petch"`; `--font-number` starts with `"Jost"`; `--font-sans` and `--font-mono` both equal `--font-label`'s stack; `body` sets `font-variant-numeric: tabular-nums`.
- [ ] **Step 3: Implement.** Keep the two Inter `@font-face` blocks until plan 7.
- [ ] **Step 4: Run** `pnpm -F @ptah-app/ds test -- styles && pnpm -F @ptah-app/ds build` — PASS, and the built output contains the woff2 files.
- [ ] **Step 5: Baselines**: `pnpm -F @ptah-app/ds update:visual`; look at the gallery in Storybook: text is Chakra Petch, numbers do not jitter in `live-perf--frames`.
- [ ] **Step 6: Commit**: `git commit -am "feat(ds): Chakra Petch and Jost, bundled"`

### Task 4: Surfaces and signals

**Files (modify the `.module.css`, and the `.tsx` only where a new prop is named below):** `packages/ds/src/components/Panel`, `EmptyState`, `StatusRegion`, `Table`, `Label`, `Kbd`; `packages/ds/src/primitives/FaultLine`, `StatusWord`, `GroupBadge`
**Create:** `packages/ds/src/components/Brackets/` (`Brackets.tsx`, `.module.css`, `.stories.tsx`, `.test.tsx`, `index.ts`), `packages/ds/src/components/Badge/`, `packages/ds/src/components/NoticeLine/`, `packages/ds/src/components/HintLine/`

**Interfaces:**
- Produces: `<Panel title right? tone?: "tint" | "sand">` (cut corner `--cut`, rule `--rule`, no outline; in stage the fill is dropped); `<Brackets tone?: "sand" | "bright" />` (four corners, 4 px outside its positioned parent, never intercepts the pointer); `<Badge />` (the `!`, above any bracket); `<NoticeLine tone: "sand" | "fault" action?: {label, onClick}>`; `<HintLine hint?: string keys?: {label: string; keys: string}[] />`; `<EmptyState>` drawn as hatching with its label on a ground plate; table rows with the 4 px edge stripe and `data-picked`, `data-need`, `data-fault` states.

- [ ] **Step 1: Write the failing tests**, one per component: its role and accessible name are unchanged from today (for the existing ones); `Brackets` renders four `aria-hidden` corners and `pointer-events: none`; `NoticeLine` has `role="status"` for sand and `role="alert"` for fault; a picked table row has the same `getBoundingClientRect()` height and top as when not picked.
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test -- components` — FAIL on the new ones.
- [ ] **Step 3: Implement** from "Space, size, shape" in the spec. Stories for each: default, picked, need, fault, and one story per look.
- [ ] **Step 4: Run** the tests, then `pnpm -F @ptah-app/ds test:storybook` — PASS.
- [ ] **Step 5: Baselines for these boards only**: `pnpm -F @ptah-app/ds update:visual -- --only panel` and the same for `emptystate`, `table`, `brackets`, `badge`, `notice`, `hint`. Owner looks at the stories.
- [ ] **Step 6: Commit**: `git commit -am "feat(ds): panels, brackets, badge, notice and hint lines"`

### Task 5: Controls and overlays

**Files (modify):** `packages/ds/src/components/Button`, `IconButton`, `Toggle`, `Tabs`, `Select`, `TextField`, `NumberField`, `Slider`, `Combobox`, `Menu`, `Dialog`, `Popover`, `Tooltip`, `Toast`, `CommandPalette`
**Create:** `packages/ds/src/components/Choice/`, `packages/ds/src/components/Explain/`

**Interfaces:**
- Produces: `<Button variant: "primary" | "plain" | "sand" | "danger" size?: "sm" | "md" | "touch" hotkey?: string>` (primary is a `tint` fill; in stage every filled variant is an outline); `<Toggle>` drawn as the square switch; `<Choice options value onChange layout?: "chips" | "list" aria-label>` (a radiogroup; exactly one chosen); `<Explain word text>` (the word with a dotted underline, opening the restyled `Tooltip` on hover and on focus); `Dialog` with `tone?: "danger"`; `Menu` items with `danger` and `disabled`; `Toast` with `tone: "info" | "fault"`.

- [ ] **Step 1: Write the failing tests.** For each existing component: role, name and keyboard behaviour unchanged (reuse its current tests; they must stay green untouched). New: `Choice` is a `radiogroup`, arrows move the choice, exactly one `aria-checked`; `Explain` is reachable by Tab and its tooltip has `role="tooltip"` and is described by `aria-describedby`; changing `data-mode` on `<html>` while a `Dialog` and a `Menu` are open keeps both open and keeps focus (Review Focus 3).
- [ ] **Step 2: Run** — FAIL on the new ones.
- [ ] **Step 3: Implement.** Sizes from the spec: chips and small buttons 24 px, toolbar buttons 30 px, touch 44 px; the tooltip and the dialog are a `ground` box with a 1 px `tint` outline.
- [ ] **Step 4: Run** tests and `test:storybook` — PASS. Tap-target pass: `pnpm -F @ptah-app/ds test:visual -- --tap` — PASS.
- [ ] **Step 5: Baselines** `--only` each of these components' boards. Owner looks at the stories, in the three looks.
- [ ] **Step 6: Commit**: `git commit -am "feat(ds): controls and overlays in ZENITHALL, Choice and Explain"`

### Task 6: The header

**Files:**
- Modify: `packages/ds/src/shell/Shell.tsx`, `Shell.module.css`, `packages/ds/src/shell/__tests__/`, `packages/ds/src/icons/Icon.tsx` (add `lights`, `effects`, `show`, `live`, `inspect`, `settings`, `note`, `library`, with the paths of the ZENITHALL Icons group)
- Create: `packages/ds/src/shell/LookSwitch.tsx`, `packages/ds/src/shell/HeaderStatus.tsx`

**Interfaces:**
- Consumes: `Choice`, `Brackets`, `Badge`, `getMode`, `setMode` (Tasks 2, 4, 5).
- Produces: `type ShellScreen = { id: string; title: string; href: string; shipped: boolean; icon: IconName; group: "place" | "tool"; badge?: boolean }`; `ShellProps` gains `status?: { tone: "well" | "wait" | "fault"; text: string }`; `onNavigate`, `current`, `width`, `onCommands` unchanged.

- [ ] **Step 1: Write the failing tests**: at 1280 the header holds, in order, the logo, a `navigation` named "Places" with the `place` screens numbered from 1, a `navigation` named "Tools", the look switch (a radiogroup named "Look" with Dark, Light, Stage), and the status when given; the current screen has `aria-current="page"`; choosing a look calls `setMode`; a screen with `badge` shows the `!`; with no `status` prop nothing is rendered in its place and the look switch does not move (same `left` as with a status of `"All well"`); at 599 the header holds only the logo and the Commands button (Review Focus 5); the header is 52 px high in every case.
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test -- shell` — FAIL.
- [ ] **Step 3: Implement.** The status has a fixed-width slot so its text never moves the look switch.
- [ ] **Step 4: Run** — PASS; `pnpm -F @ptah-app/ds update:visual -- --only shell`. Owner looks at Shell Laptop and Phone in the three looks.
- [ ] **Step 5: Commit**: `git commit -am "feat(ds): the header band, places, look switch, status slot"`

### Task 7: The new addresses

**Files:**
- Modify: `apps/web/src/routes.ts`, `apps/web/src/App.tsx`, `apps/web/src/__tests__/` (routes tests), `apps/web/e2e/*.spec.ts` (addresses and the six header names only)
- Create: `apps/web/src/redirects.ts`

**Interfaces:**
- Produces: `ROUTES = { live: "/live", lights: "/lights", effects: "/effects", show: "/show", inspect: "/inspect", settings: "/settings" }`; `LIBRARY = "/lights/library"`; `venuePath(id, page)` → `/lights/venue/<id>[/patch]`; `libraryPath(id?)`; `builderPath` → `/effects/…`; `LOOK_BACK = "/inspect/back"`; `screenOf(path)` returns `"lights"` for venue and library paths, `"effects"`, `"inspect"`, `"live"`; `redirect(path: string, search: string, hash: string): string | null`.

| Old | New |
|---|---|
| `/` | `/live` |
| `/venue` | `/lights` |
| `/venue/<id>` , `/venue/<id>/patch` | `/lights/venue/<id>` , `/lights/venue/<id>/patch` |
| `/library` , `/library/<id>` | `/lights/library` , `/lights/library/<id>` |
| `/builder` , `/builder/<s>/<p>` | `/effects` , `/effects/<s>/<p>` |
| `/debug` , `/debug/back` | `/inspect` , `/inspect/back` |
| `/show…` , `/settings` | unchanged |

- [ ] **Step 1: Write the failing tests**: one per row of the table through `redirect`, each also with `?q=par&f=mine#x` appended and expected intact (Review Focus 2); `redirect` returns `null` for every new address and for an unknown path; a venue whose id is `library` round-trips through `venuePath` and `venueRoute`; `screenOf` for every new address; the unknown-path view still says "Not yet." and its button goes to `/live`.
- [ ] **Step 2: Run** `pnpm -F @ptah-app/web test -- routes` — FAIL.
- [ ] **Step 3: Implement.** `App.tsx` applies `redirect` with `history.replaceState` before the first render and on `popstate`, so Back does not bounce. The screen titles become Lights, Effects, Show, Live, Inspect, Settings, with their icons and groups; `shipped` has the six ids. Leave guards are unchanged.
- [ ] **Step 4: Update the e2e specs**: every `page.goto` and URL assertion to the new address; `getByRole("tab", { name: "Debug" })` and its like to the header's links by their new names. Change nothing else in them.
- [ ] **Step 5: Run** `pnpm -F @ptah-app/web test && pnpm -F @ptah-app/web test:e2e` — PASS (72 e2e).
- [ ] **Step 6: Commit**: `git commit -am "feat(web): the six places and their addresses, old ones redirect"`

### Task 8: Checkpoint

- [ ] **Step 1:** `df -h /System/Volumes/Data | tail -1`; `du -sh target`; clean per AGENTS.md if needed.
- [ ] **Step 2:** `pnpm allcheck` — green. A failure that passes when re-run alone is reported as load, with the output.
- [ ] **Step 3:** Start the app as the e2e rig does and walk the six places in the three looks with F2 and the switch; confirm every old address in the Task 7 table redirects.
- [ ] **Step 4:** Add to `docs/design-system.md`, at the top, a section "ZENITHALL (in progress)" pointing at the spec and listing the alias table of this plan; the full rewrite is plan 7.
- [ ] **Step 5:** Owner check: the header, the look switch and one screen of each place. Commit: `git commit -am "docs(ds): ZENITHALL foundation in, aliases listed"`.
