# V2 Step 2A — Design system foundations: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `packages/ds` package in the V2 repo that ships the design
tokens (both modes), the base stylesheet and fonts, the stage-mode switch,
and a Storybook with normal/stage and phone/laptop switches, with the
contrast, motion and axe gates running in `pnpm allcheck` and CI.

**Architecture:** One TypeScript token source generates a committed
`tokens.css` (two `:root` blocks, selected by `data-mode`); a pure
contrast module is both a runtime helper (the Tokens story) and the test
that gates the token values; the mode module is a tiny DOM-only script.
Storybook (react-vite) is the catalog; its test-runner with axe is the
a11y gate. No components yet: 2B builds them on these files.

**Tech Stack:** TypeScript 5.9 strict, React 19, Vite 6, Storybook 8
(`@storybook/react-vite`, addons essentials, a11y, interactions),
`@storybook/test-runner` + `axe-playwright` + Playwright Chromium, Vitest 3
+ jsdom, Biome (repo-wide), pnpm 9.15.4, Node 20.

**Spec:** `docs/superpowers/specs/2026-11-09-v2-step2-design-system-design.md`
(§3 rules, §4 tokens, §7 smooth/elegant tests, §8 Storybook, §9 gates,
§10 package, §11 constraints; §14 names this plan 2A).

## Global Constraints

- Repo: `~/projects/ptah-v2`; branch `step2a-foundations` off `master`.
  Package `packages/ds`, name `@ptah-app/ds`, `"private": true`,
  `"type": "module"`, `tsconfig` extends `../../tsconfig.base.json`.
- Biome is the only formatter/linter (2-space, 80 columns, double quotes);
  no ESLint, no Prettier; prose lines ≤ 80 columns.
- Pure black `#000`, pure white `#fff`; accent `#5e40f2`; corners radius 0;
  no shadows, no blur, no glow; one sans (Inter, weights 400 and 500,
  self-hosted); numbers tabular.
- Motion durations only 80 ms, 120 ms, 200 ms; one easing
  `cubic-bezier(.2,.8,.2,1)`; nothing `infinite`; `prefers-reduced-motion`
  removes transitions.
- Contrast gates (spec §9): normal `--fg` ≥ 7:1, `--fg-dim` ≥ 4.5:1,
  `--on-bg` on `--fg` ≥ 7:1, `--accent` on `--bg` ≥ 3:1, `#fff` on
  `--accent` ≥ 4.5:1, `--fault`/`--warn` ≥ 4.5:1; stage `--fg` ≥ 4.5:1,
  `--fg-dim` ≥ 3:1, `--on-bg` on `--fg` ≥ 4.5:1, `--accent` ≥ 3:1,
  `--fault`/`--warn` ≥ 4.5:1.
- CSS ≤ 40 KB gzipped (tokens + base); Inter two weights only.
- Gates join `pnpm allcheck` and run on ubuntu and macOS in CI.

## Review Focus

1. A stored mode value that is not `normal`/`stage` (an old build, a typo
   in devtools): the page must come up in normal mode, not crash or stick.
   Test in Task 6.
2. The mode key pressed while typing in a text field or a contenteditable:
   must not toggle. Test in Task 6.
3. `prefers-reduced-motion: reduce`: every transition and animation
   duration becomes 0 ms. Test in Task 5 (the stylesheet carries the
   media rule) and Task 7 (the gate accepts it).
4. A token edited to a failing value (a designer lightens `--fg-dim` in
   stage mode): the gate must fail with the token name and the measured
   ratio in the message. Test in Task 3.
5. Running the Storybook gate without Playwright's browser installed: a
   one-line instruction, not a stack trace. Test in Task 9.

---

### Task 1: Package scaffold and workspace wiring

**Files:**
- Create: `packages/ds/package.json`, `packages/ds/tsconfig.json`,
  `packages/ds/vitest.config.ts`, `packages/ds/src/index.ts`,
  `packages/ds/src/__tests__/smoke.test.ts`
- Modify: `biome.json` (`files.includes`: add `"!**/storybook-static"`),
  `.gitignore` (add `storybook-static/`)

**Interfaces:**
- Produces: the package every later task adds to; scripts `test`
  (`vitest run`), `typecheck` (`tsc --noEmit`); `src/index.ts` re-exports
  grow per task.

- [ ] **Step 1: Write the failing smoke test**

```ts
// packages/ds/src/__tests__/smoke.test.ts
import { describe, expect, it } from "vitest";
import { DS_VERSION } from "../index";
describe("package", () => {
  it("exports a version", () => expect(DS_VERSION).toBe("0.0.0"));
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd packages/ds && pnpm vitest run` — Expected: FAIL (module not found).

- [ ] **Step 3: Create the package**

`package.json`: `@ptah-app/ds`, private, module, scripts `test`,
`typecheck`; devDependencies `typescript ^5.9`, `vitest ^3.2`, `jsdom ^26`,
`@types/node ^20`. `vitest.config.ts`: `environment: "jsdom"`,
`include: ["src/**/*.test.{ts,tsx}"]`. `src/index.ts`: `export const
DS_VERSION = "0.0.0";`. Biome and `.gitignore` edits as listed.

- [ ] **Step 4: Verify**

Run from the repo root: `pnpm i && pnpm -F @ptah-app/ds test && pnpm typecheck && pnpm check`
Expected: 1 test passes; typecheck and Biome clean.

- [ ] **Step 5: Commit** — `feat(ds): package scaffold`

### Task 2: Token source and contrast math

**Files:**
- Create: `packages/ds/src/tokens/tokens.ts`,
  `packages/ds/src/tokens/contrast.ts`,
  `packages/ds/src/tokens/__tests__/contrast.test.ts`

**Interfaces:**
- Produces:
  - `type Mode = "normal" | "stage"`
  - `type ColorSet = { bg: string; fg: string; fgDim: string; line: string;
    accent: string; accentHover: string; accentActive: string; fault:
    string; warn: string; onBg: string }` (hex strings `#rrggbb`)
  - `export const tokens: { color: Record<Mode, ColorSet>; unit: 40;
    space: { s1: 4; s2: 8; s3: 12; s4: 16; s5: 24; s6: 40 }; type: {
    fontSans: string; fontMono: string; size: { label: 11; body: 13;
    value: 16; big: 22; display: 34 }; weight: { regular: 400; medium: 500
    }; trackLabel: ".18em" }; hair: 1; motion: { fast: 80; mid: 120; slow:
    200; ease: "cubic-bezier(.2,.8,.2,1)" }; focusWidth: 2; tap: 44 }`
  - `relativeLuminance(hex: string): number`,
    `contrastRatio(a: string, b: string): number` (WCAG 2.x, rounded to
    2 decimals)

- [ ] **Step 1: Write the failing tests**

```ts
// contrast.test.ts
import { contrastRatio, relativeLuminance } from "../contrast";
import { tokens } from "../tokens";
it("white on black is 21", () => expect(contrastRatio("#ffffff", "#000000")).toBe(21));
it("the accent on black is 3.49", () => expect(contrastRatio("#5e40f2", "#000")).toBeCloseTo(3.49, 2));
it("white on the accent is 6.01", () => expect(contrastRatio("#fff", "#5e40f2")).toBeCloseTo(6.01, 2));
it("luminance of mid grey", () => expect(relativeLuminance("#808080")).toBeCloseTo(0.2159, 3));
it("both modes share the accent and the fault colours", () => {
  expect(tokens.color.stage.accent).toBe(tokens.color.normal.accent);
  expect(tokens.color.stage.fault).toBe(tokens.color.normal.fault);
  expect(tokens.color.stage.warn).toBe(tokens.color.normal.warn);
});
```

- [ ] **Step 2: Run to verify they fail** — `pnpm -F @ptah-app/ds test`

- [ ] **Step 3: Implement `tokens.ts` and `contrast.ts`**

Values: normal `{ bg: "#000000", fg: "#ffffff", fgDim: "#8a8a8a", line:
"#1f1f1f", accent: "#5e40f2", accentHover: "#6e54f3", accentActive:
"#4e2df0", fault: "#ff3b2f", warn: "#f8c754", onBg: "#000000" }`; stage
`{ bg: "#000000", fg: "#999999", fgDim: "#777777", line: "#161616",
accent: "#5e40f2", accentHover: "#6e54f3", accentActive: "#4e2df0",
fault: "#ff3b2f", warn: "#f8c754", onBg: "#000000" }`. `fontSans`:
`"Inter", system-ui, -apple-system, sans-serif`; `fontMono`:
`ui-monospace, Menlo, Consolas, monospace`. Contrast: accept `#rgb` and
`#rrggbb`; ratio `(L1 + 0.05) / (L2 + 0.05)` with the lighter first.

- [ ] **Step 4: Run to verify they pass**; **Step 5: Commit** —
  `feat(ds): token source and WCAG contrast`

### Task 3: The contrast gate (both modes)

**Files:**
- Create: `packages/ds/src/tokens/gates.ts`,
  `packages/ds/src/tokens/__tests__/contrast-gate.test.ts`

**Interfaces:**
- Produces: `export const contrastRules: Record<Mode, Rule[]>` with
  `type Rule = { name: string; fg: keyof ColorSet | "#ffffff"; bg: keyof
  ColorSet; min: number }`; `export function checkContrast(mode: Mode,
  set: ColorSet): { name: string; ratio: number; min: number; ok: boolean
  }[]` (used again by the Tokens story in Task 8).

- [ ] **Step 1: Write the failing tests**

```ts
it.each(["normal", "stage"] as const)("%s mode passes every rule", (mode) => {
  const failed = checkContrast(mode, tokens.color[mode]).filter((r) => !r.ok);
  expect(failed, JSON.stringify(failed)).toEqual([]);
});
it("names the token and the ratio when a value fails", () => {
  const bad = { ...tokens.color.stage, fgDim: "#444444" };
  const r = checkContrast("stage", bad).find((x) => x.name === "fgDim on bg");
  expect(r?.ok).toBe(false);
  expect(r?.ratio).toBeLessThan(3);
});
```

- [ ] **Step 2: Run to verify they fail**

- [ ] **Step 3: Implement the rules**, exactly the Global Constraints
  list: normal `fg/bg 7`, `fgDim/bg 4.5`, `onBg/fg 7`, `accent/bg 3`,
  `#ffffff/accent 4.5`, `fault/bg 4.5`, `warn/bg 4.5`; stage `fg/bg 4.5`,
  `fgDim/bg 3`, `onBg/fg 4.5`, `accent/bg 3`, `#ffffff/accent 4.5`,
  `fault/bg 4.5`, `warn/bg 4.5`. Rule names are `"<fg> on <bg>"`.

- [ ] **Step 4: Run to verify they pass**; **Step 5: Commit** —
  `test(ds): contrast gate over both token modes`

### Task 4: Generated `tokens.css`

**Files:**
- Create: `packages/ds/src/tokens/build.ts` (also the CLI:
  `tsx src/tokens/build.ts --write`), `packages/ds/src/tokens/tokens.css`
  (generated, committed), `packages/ds/src/tokens/__tests__/build.test.ts`
- Modify: `packages/ds/package.json` (script `tokens:build`, devDependency
  `tsx ^4.23`), `packages/ds/src/index.ts` (export `tokens`, `contrast`,
  `gates`)

**Interfaces:**
- Produces: `export function renderTokensCss(t: typeof tokens): string`;
  the CSS defines on `:root`: `--bg --fg --fg-dim --line --accent
  --accent-hover --accent-active --fault --warn --on-bg --unit --s1..--s6
  --font-sans --font-mono --t-label --t-body --t-value --t-big
  --t-display --w-regular --w-medium --track-label --hair --m-fast --m-mid
  --m-slow --ease --focus --tap`, and on `:root[data-mode="stage"]` the
  colour group only. Sizes in `px`, durations in `ms`,
  `--focus: 0 0 0 2px var(--accent)`.

- [ ] **Step 1: Write the failing tests**

```ts
it("renders both mode blocks and every token name", () => {
  const css = renderTokensCss(tokens);
  expect(css).toContain(':root[data-mode="stage"]');
  for (const name of ["--bg","--fg","--fg-dim","--line","--accent","--accent-hover","--accent-active","--fault","--warn","--on-bg","--unit","--s1","--s6","--font-sans","--font-mono","--t-label","--t-display","--w-medium","--track-label","--hair","--m-fast","--m-slow","--ease","--focus","--tap"]) expect(css).toContain(`${name}:`);
  expect(css).toContain("--unit: 40px;");
  expect(css).toContain("--m-fast: 80ms;");
});
it("the committed tokens.css is up to date", () => {
  expect(readFileSync(new URL("../tokens.css", import.meta.url), "utf8")).toBe(renderTokensCss(tokens));
});
```

- [ ] **Step 2: Run to verify they fail**

- [ ] **Step 3: Implement `renderTokensCss` and the `--write` CLI**; run
  `pnpm -F @ptah-app/ds tokens:build` and commit the output.

- [ ] **Step 4: Run to verify they pass**; `pnpm check` clean (Biome
  ignores nothing here: the generated CSS must be formatted as Biome
  wants, so render with 2-space indent and one declaration per line).

- [ ] **Step 5: Commit** — `feat(ds): generated tokens.css for both modes`

### Task 5: Base stylesheet and Inter

**Files:**
- Create: `packages/ds/src/styles/base.css`,
  `packages/ds/src/fonts/Inter-Regular.woff2`,
  `packages/ds/src/fonts/Inter-Medium.woff2`,
  `packages/ds/src/fonts/LICENSE.txt` (OFL, from the Inter release),
  `packages/ds/src/styles/__tests__/base.test.ts`

**Interfaces:**
- Produces: `base.css` imports `../tokens/tokens.css`, then: a reset
  (box-sizing, margin 0, `button`/`input` inherit font, no default
  outline), `html, body { background: var(--bg); color: var(--fg);
  font-family: var(--font-sans); font-size: var(--t-body); font-variant-
  numeric: tabular-nums; }`, two `@font-face` (weights 400 and 500,
  `font-display: swap`), the type voices `.t-label` (11 px, uppercase,
  `letter-spacing: var(--track-label)`, colour `var(--fg-dim)`), `.t-value`
  (16 px), `.t-big`, `.t-display`, `.t-mono` (`var(--font-mono)`, 13 px),
  `:focus-visible { outline: none; box-shadow: var(--focus); }`,
  `.grid-overlay` (a debug background of `var(--line)` hairlines every
  `var(--unit)`), `@media (prefers-reduced-motion: reduce) { *, *::before,
  *::after { transition-duration: 0ms !important; animation-duration: 0ms
  !important; } }`, `@media (prefers-contrast: more) { :root { --fg-dim:
  var(--fg); } }`.

- [ ] **Step 1: Write the failing tests**

```ts
const css = readFileSync(new URL("../base.css", import.meta.url), "utf8");
it("declares Inter at 400 and 500 only", () => {
  const weights = [...css.matchAll(/font-weight:\s*(\d+)/g)].map((m) => m[1]);
  expect(new Set(weights)).toEqual(new Set(["400", "500"]));
});
it("zeroes motion under reduced motion", () => {
  expect(css).toMatch(/prefers-reduced-motion: reduce[\s\S]*transition-duration: 0ms !important/);
});
it("has no radius or shadow apart from the focus ring", () => {
  expect(css).not.toMatch(/border-radius/);
  expect(css.match(/box-shadow/g)?.length).toBe(1);
});
it("stays under the budget", async () => {
  const gz = gzipSync(readFileSync(new URL("../../tokens/tokens.css", import.meta.url)) + css);
  expect(gz.byteLength).toBeLessThan(40 * 1024);
});
```

- [ ] **Step 2: Run to verify they fail**

- [ ] **Step 3: Write `base.css`; add the two woff2 files** (from the
  Inter 4.x GitHub release, `InterVariable` not used: the static
  `Inter-Regular.woff2` and `Inter-Medium.woff2`) and the licence.

- [ ] **Step 4: Run to verify they pass**; **Step 5: Commit** —
  `feat(ds): base stylesheet, type voices, Inter`

### Task 6: Stage mode module

**Files:**
- Create: `packages/ds/src/mode.ts`, `packages/ds/src/__tests__/mode.test.ts`
- Modify: `packages/ds/src/index.ts` (export the mode API)

**Interfaces:**
- Produces: `export const MODE_KEY = "F2"`; `export const MODE_STORAGE =
  "ptah.ds.mode"`; `getMode(root?: HTMLElement): Mode`; `setMode(mode:
  Mode, root?: HTMLElement): void` (sets `data-mode` on `root`, default
  `document.documentElement`; `normal` removes the attribute; persists
  to `localStorage` in a try/catch); `toggleMode(root?): Mode`;
  `initMode(opts?: { root?: HTMLElement; storage?: Storage; window?:
  Window }): () => void` (applies the stored mode, installs a `keydown`
  listener for `MODE_KEY` that ignores events whose target is an input,
  textarea, select or contenteditable, returns an uninstall function).

- [ ] **Step 1: Write the failing tests**

```ts
it("defaults to normal and persists a toggle", () => {
  const off = initMode();
  expect(getMode()).toBe("normal");
  expect(toggleMode()).toBe("stage");
  expect(document.documentElement.dataset.mode).toBe("stage");
  expect(localStorage.getItem(MODE_STORAGE)).toBe("stage");
  off();
});
it("falls back to normal on an unknown stored value", () => {
  localStorage.setItem(MODE_STORAGE, "bright");
  const off = initMode();
  expect(getMode()).toBe("normal");
  expect(document.documentElement.hasAttribute("data-mode")).toBe(false);
  off();
});
it("the key toggles, except while typing", () => {
  const off = initMode();
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "F2", bubbles: true }));
  expect(getMode()).toBe("stage");
  const input = document.body.appendChild(document.createElement("input"));
  input.dispatchEvent(new KeyboardEvent("keydown", { key: "F2", bubbles: true }));
  expect(getMode()).toBe("stage");
  off();
});
it("survives a storage that throws", () => {
  const storage = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); } } as unknown as Storage;
  const off = initMode({ storage });
  expect(toggleMode()).toBe("stage");
  off();
});
```

- [ ] **Step 2: Run to verify they fail**; **Step 3: Implement `mode.ts`**
  (no React, no dependencies); **Step 4: Run to verify they pass**;
  **Step 5: Commit** — `feat(ds): stage mode switch (F2, persisted)`

### Task 7: Motion gate

**Files:**
- Create: `packages/ds/src/gates/motion.ts`,
  `packages/ds/src/gates/__tests__/motion.test.ts`,
  `packages/ds/src/gates/__tests__/fixtures/bad-motion.css`

**Interfaces:**
- Produces: `export function checkMotion(css: string, file: string):
  string[]` — one message per offence: a `transition` or `animation`
  duration that is not `80ms`, `120ms`, `200ms`, `0ms` or `var(--m-fast
  | --m-mid | --m-slow)`; any `infinite`; any easing that is not `var(--
  ease)` or `cubic-bezier(.2,.8,.2,1)` (`linear` allowed for `0ms`).
  `export function scanMotion(globRoot: string): string[]` over
  `src/**/*.css` (excluding `__tests__/fixtures`).

- [ ] **Step 1: Write the failing tests**

```ts
it("accepts the shipped stylesheets", () => expect(scanMotion(resolve(__dirname, "../.."))).toEqual([]));
it("rejects a stray duration, an infinite animation and a foreign easing", () => {
  const bad = readFileSync(resolve(__dirname, "fixtures/bad-motion.css"), "utf8");
  const out = checkMotion(bad, "bad-motion.css");
  expect(out).toEqual(expect.arrayContaining([
    expect.stringContaining("300ms"),
    expect.stringContaining("infinite"),
    expect.stringContaining("ease-in-out"),
  ]));
});
```

`bad-motion.css`: `.a { transition: opacity 300ms var(--ease); } .b {
animation: spin 120ms linear infinite; } .c { transition: color 80ms
ease-in-out; }`.

- [ ] **Step 2: Run to verify they fail**; **Step 3: Implement** (regex
  over declarations; no CSS parser dependency); **Step 4: Run to verify
  they pass**; **Step 5: Commit** — `test(ds): motion gate`

### Task 8: Storybook with the two switches and the four foundation stories

**Files:**
- Create: `packages/ds/.storybook/main.ts`, `packages/ds/.storybook/preview.tsx`,
  `packages/ds/.storybook/manager.ts`, `packages/ds/src/stories/Tokens.stories.tsx`,
  `packages/ds/src/stories/Type.stories.tsx`,
  `packages/ds/src/stories/Grid.stories.tsx`,
  `packages/ds/src/stories/StageMode.stories.tsx`,
  `packages/ds/src/stories/__tests__/stories.test.tsx`
- Modify: `packages/ds/package.json` (scripts `storybook` = `storybook dev
  -p 6006`, `storybook:build` = `storybook build`; devDependencies
  `react ^19`, `react-dom ^19`, `@types/react ^19`, `@types/react-dom ^19`,
  `vite ^6`, `@vitejs/plugin-react ^4`, `storybook ^8.6`,
  `@storybook/react-vite ^8.6`, `@storybook/addon-essentials ^8.6`,
  `@storybook/addon-a11y ^8.6`, `@storybook/addon-interactions ^8.6`,
  `@storybook/test ^8.6`, `@testing-library/react ^16`), `tsconfig.json`
  (`"jsx": "react-jsx"`, include `.storybook`)

**Interfaces:**
- Consumes: `tokens`, `checkContrast` (Task 3), `base.css` (Task 5),
  `setMode`/`getMode` (Task 6).
- Produces: `preview.tsx` `globalTypes.mode` toolbar (`normal`, `stage`;
  a decorator calls `setMode(context.globals.mode)` on
  `document.documentElement`), `parameters.viewport.viewports` `phone`
  390×844 and `laptop` 1280×800 (default laptop), `parameters.backgrounds`
  disabled (the body is black from `base.css`), `parameters.a11y` on.
  Stories: **Tokens** (a table: token, swatch, hex, and for each contrast
  rule of the current mode the ratio and ✓/✗ from `checkContrast`),
  **Type** (the five sizes in both voices, a tabular-number line that
  counts up on an interaction so the width can be checked), **Grid** (a
  1280×800 region with `.grid-overlay`, hairline regions on it, the
  addon-measure hint), **StageMode** (a paragraph in each voice with a
  button calling `toggleMode`, plus the F2 hint).

- [ ] **Step 1: Write the failing test** (render smoke through
  Testing Library, not Storybook):

```tsx
import { composeStories } from "@storybook/react";
import * as Tokens from "../Tokens.stories";
const { Normal } = composeStories(Tokens);
it("the Tokens story lists every colour token with a passing ratio", () => {
  render(<Normal />);
  for (const name of ["bg","fg","fgDim","line","accent","fault","warn"]) expect(screen.getByText(name)).toBeTruthy();
  expect(screen.queryAllByText("✗")).toHaveLength(0);
});
```

- [ ] **Step 2: Run to verify it fails**; **Step 3: Set up Storybook and
  write the four stories**; **Step 4: Verify**: the test passes;
  `pnpm -F @ptah-app/ds storybook:build` exits 0 and `storybook-static/`
  exists; `pnpm typecheck && pnpm check` clean.

- [ ] **Step 5: Commit** — `feat(ds): Storybook with mode and viewport
  switches; Tokens, Type, Grid, StageMode stories`

### Task 9: Storybook test-runner with axe, in allcheck and CI

**Files:**
- Create: `packages/ds/.storybook/test-runner.ts`,
  `packages/ds/scripts/test-storybook.mjs`
- Modify: `packages/ds/package.json` (script `test:storybook` = `node
  scripts/test-storybook.mjs`; devDependencies `@storybook/test-runner
  ^0.21`, `axe-playwright ^2`, `playwright ^1.50`, `http-server ^14`),
  root `package.json` (`allcheck` gains `pnpm -r --if-present
  test:storybook` after `pnpm test`), `.github/workflows/ci.yml` (a step
  `pnpm -F @ptah-app/ds exec playwright install --with-deps chromium`
  on Linux and `pnpm -F @ptah-app/ds exec playwright install chromium`
  on macOS, before `pnpm allcheck`)

**Interfaces:**
- Produces: `test-runner.ts` runs `injectAxe`/`checkA11y` on every story
  with `detailedReport` and fails on any violation; the
  `test-storybook.mjs` script: if Chromium is missing (probe
  `playwright`'s `chromium.executablePath()` existence) prints exactly
  `Storybook gate: install the browser once with "pnpm -F @ptah-app/ds
  exec playwright install chromium"` and exits 2; else builds the
  Storybook, serves `storybook-static` on a free port with `http-server`,
  runs `test-storybook --url http://127.0.0.1:<port>`, and exits with
  its status (always killing the server).

- [ ] **Step 1: Write the failing check** — a Vitest test
  `scripts/__tests__/test-storybook.test.ts` that runs the script with
  `PLAYWRIGHT_BROWSERS_PATH=/nonexistent` and asserts exit code 2 and the
  exact message on stderr.

- [ ] **Step 2: Run to verify it fails**; **Step 3: Implement the runner
  config, the script, the root script and the CI steps**; **Step 4:
  Verify**: `pnpm -F @ptah-app/ds exec playwright install chromium` then
  `pnpm -F @ptah-app/ds test:storybook` passes with 0 violations on the
  four stories in both modes (the runner iterates `globals.mode` by
  running the suite twice with `--globals mode:normal` and `mode:stage`);
  `pnpm allcheck` from the root passes.

- [ ] **Step 5: Commit** — `ci(ds): Storybook axe gate in allcheck and CI`

### Task 10: Documentation

**Files:**
- Create: `docs/design-system.md` (V2 repo)
- Modify: `README.md` (a "Design system" section: how to run Storybook,
  the gates, the one-time Playwright install), `docs/rust-workspace.md`
  (the repo map gains `packages/ds`)

- [ ] **Step 1: Write `docs/design-system.md`**: the rules of spec §3 in
  the repo's own words, the token names with their values in both modes
  (generated table from `tokens.ts` would drift: write it and add a test
  in Task 4's file that the doc lists every token name), the mode switch
  (F2, `data-mode`, storage key), the gates and how to read a failure,
  the stories, what 2B and 2C add. Link `docs/design/c1-reference.html`.
- [ ] **Step 2: Verify**: `pnpm -F @ptah-app/ds test` (the doc test)
  and `pnpm check`; prose ≤ 80 columns.
- [ ] **Step 3: Commit** — `docs(ds): design system foundations`
