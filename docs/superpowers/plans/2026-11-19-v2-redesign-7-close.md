# Redesign 7 of 7: Close — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the ZENITHALL redesign: retire what is left of the old look, make ZENITHALL's base layer a package of its own that IHY can use, fix the small things the six plans put aside, steady the tests that fail under load, and rewrite the design-system document.

**Architecture:** No screen is redesigned here. The old token names and the Inter font go; the tokens, the base CSS, the fonts and the look switch move to a new workspace package, `@ptah-app/zenithall`, that has no React in it, and `@ptah-app/ds` builds on it so the app does not change. The rest is a list of small fixes grouped by place, each with its test.

**Tech Stack:** TypeScript, React, CSS modules with tokens only, Vitest, Storybook, Playwright (visual and e2e), Rust (two tests), Biome, pnpm workspace.

**Spec:** `~/projects/ptah/docs/superpowers/specs/2026-11-19-v2-redesign-design.md` (sections "Across the app" 9, "The look in numbers", "Calls I made" on layer 1, "Constraints for the build"). **The list this plan works from:** `~/projects/ptah/docs/superpowers/plans/2026-11-19-v2-redesign-deferred.md` (every line not struck out). Code: `~/projects/ptah-v2`, branch `redesign-close` from `master`.

**What plans 2 to 6 set, to follow here:** see `packages/ds/src/show/`, `builder/`, `venue/`, `debug/`, `settings/`: `Panel`, `Digits`, `useWholeWhenCut` with `Tooltip disabled`, `Explain`, `Choice`, `NoticeLine`, `HintLine`; main buttons in view down to 900 px, names give way first; a query container carries no horizontal padding; a play waits until a cut text is measured before it hovers or focuses it; Storybook plays for anything measured. From `packages/ds`, boards are regenerated with `pnpm update:visual --only <name>`.

## Global Constraints

- No screen changes its design. Exactly today's features and today's wording; the only new words are the ones this plan lists.
- Nothing shifts; calm when well, loud only when wrong; tokens-only styling; Biome only.
- The logic is not touched, except where a fix below names a hook or a model; then the change is the smallest that fixes it, with its test.
- **Retiring the old names changes no pixel.** After Task 2 the full visual gate passes against the existing baselines with no baseline regenerated.
- Story ids keep their names.
- No new dependency. Never start V1 services or pm2; never touch `~/.ptah` or `~/ptah-home`; leave the untracked `docs/design/brief/` and `.ignore` alone; the Storybook servers on 6006–6008 stay up; no push and no publish unless the owner asks.
- Disk (AGENTS.md): `df -h /System/Volumes/Data | tail -1` before a heavy run; below 30 GB free, clean first and tell the owner. No extra worktree.
- At most three agents at once. A design-system task runs the visual gate for its own boards, then `pnpm -F @ptah-app/ds test:visual` must pass; the full gate runs at the checkpoint. Do not run the ds tests side by side with the web tests. A task that changes a layout also runs `apps/web/e2e/scroll.spec.ts`.
- "Filed for later review" (the spec's last section) stays filed: nothing in it is built here.

## Decisions this plan makes

- **ZENITHALL's base layer is a package: `packages/zenithall`, named `@ptah-app/zenithall`.** It holds what the spec calls layer 1 in its framework-free part: the tokens (`tokens.ts`, the build, `tokens.css` with the three looks), the contrast gates, the base CSS (resets, type styles, the font imports), the font files, and the look switch (`mode.ts`: dark, light, stage, F2, the stored choice). It has no React and no PTAH word in it. Its exports: `.` (the tokens and the look switch as TypeScript), `./tokens.css`, `./base.css` (which imports the tokens and the fonts), `./fonts/*`.
- **`@ptah-app/ds` keeps everything else** and depends on the new package: the general React components (`components/`, `primitives/`) and the PTAH screens. Its own exports do not change (`./tokens` and `./mode` re-export), and `dist/ds.css` is still one file, so `apps/web` and the embedded app build unchanged. The one place where a general piece reaches into a PTAH folder is cut (`FixtureTile` takes its colour type from `primitives`).
- **The React components are not split out now.** IHY is plain TypeScript and HTML with no framework; it can use the base layer as it is. The components move to their own package only if IHY moves to React, which is decided in IHY's own brainstorm.
- **Nothing is published.** How IHY gets the package (npm under the owner's scope, or from the repository once it is public) is decided at IHY's redesign; this plan only makes the package complete and self-standing (`pnpm pack` gives a tarball that works alone).
- **The old names go.** The eleven colour aliases (`--bg`, `--fg`, `--fg-dim`, `--line-control`, `--fill-off`, `--accent`, `--accent-hover`, `--accent-active`, `--warn`, `--on-bg`, `--on-accent`) and the font aliases (`--font-sans`, `--font-mono`, `--font-label`) are replaced at each use by the ZENITHALL token they stand for (about 230 uses in `packages/ds/src` and `apps/web/src`), then removed from the tokens. `--font-sans`, `--font-mono` and `--font-label` become one `--font` (Chakra Petch); Jost keeps `--font-number`. Inter goes: its two files, its `@font-face` blocks and the tests that pin it.
- **The header between 600 and 1000 px** (an iPad upright). Today it scrolls sideways with no scrollbar. Under 1000 px of its own width the four places and the two tools show their number and icon only; the word is the tooltip and stays the accessible name. The look switch and the status never leave the band. Under 600 px the phone header is unchanged.
- **`Explain` on a touch screen:** a tap opens its tooltip and a tap elsewhere closes it. Its tooltip says the word once (as the title), then the sentence.
- **A double-click on a fixture row** (Lights) leaves it picked.
- **Patch rows keep one height** from 900 px up: the status stays on the row's line, cut with its whole text in a tooltip.
- **The burst gate compares with the last accepted rate:** it fails under 80 % of the rate recorded with the baselines (and still under 30 frames/s).
- **Dropped, with the reason** (struck in the deferred file by Task 9): renaming the story ids that say "Normal" (ids keep their names; 42 baselines would be renamed for nothing); cut-text tooltips on text a keyboard cannot reach (the pattern of plans 2 to 6, filed for later review); the network rows' note that the running PTAH still uses the old value (the Address row shows the running port); `scroll.spec.ts:175`, Show/Dialogs merge (axe) and Builder "Add box filtered › Open" (never reproduced: chased in Task 1 only if they fail there).

## Review Focus

1. **Retiring the names must change nothing seen.** Every board of the full visual gate at 0.000 % with no baseline touched; a wrong replacement (a `--warn` that was a fault, a `--fg` on a tint fill) shows there. (Task 2)
2. **The app still builds and ships after the split:** `pnpm -r build`, `cargo build -p ptah` (it embeds the web app), the fonts load from the built app with the network off, and `pnpm pack` of the new package works alone in an empty folder. (Task 3)
3. **A steadied test still catches the real failure:** each one is shown failing when the behaviour it guards is broken on purpose. (Task 1)
4. **The header on an iPad upright (768 px) by touch:** no sideways scroll, every place reachable with a 44 px target, the current place still marked, the status readable. (Task 4)
5. **The document names every token** the package emits and no token that is gone. (Tasks 2, 10)

---

### Task 1: Steady the tests that fail under load

**Files (modify):** `crates/ptah-engine/src/perf.rs` (or where `big_rig` and `light_watched` live), `crates/ptah-server/src/ws` tests (`heard_goes_on_after_the_engine_drops_the_owner_s_subscription`), `apps/web/e2e/builder.spec.ts` ("the preview curves move and the lights follow the fader"), `packages/ds/src/library/Type.stories.tsx` and `packages/ds/scripts/test-visual.mjs` (`library-type-pasted`; the burst gate), `packages/ds/visual/` (the recorded burst rate).

- [ ] **Step 1: Reproduce each under load** (run it 10 times while `pnpm allcheck` runs) and write down the failing output and its cause in the report. If `scroll.spec.ts:175`, Show/Dialogs merge (axe) or Builder "Add box filtered › Open" fail in these runs, they join the list; if not, they are dropped.
- [ ] **Step 2: Fix each at its cause**, not with a longer timeout alone: the Rust perf tests measure against a budget scaled by a calibration loop run in the same test, or are excluded from the parallel profile and run alone in `allcheck`; the ws test waits on the event it needs; the builder spec records only the preview's own requests; the paste play waits until the paste landed before the capture.
- [ ] **Step 3: The burst gate** stores the accepted rate beside the baselines (`pnpm update:visual` writes it) and fails under 80 % of it or under 30 frames/s.
- [ ] **Step 4: Prove each still bites** (Review Focus 3): break the guarded behaviour once (a sleep in the render path, a dropped subscription, a preview request never sent, the paste handler disabled, a per-frame React render) and show the test failing; restore.
- [ ] **Step 5: Run** each 20 times under load — PASS every time. Commit.

### Task 2: Retire the old names and Inter

**Files (modify):** every `*.css` under `packages/ds/src` and `apps/web/src` that uses an alias (the survey: builder, components, debug, library, live, perform, primitives, settings, shell, show, stories, styles, venue); `packages/ds/src/tokens/{tokens.ts,build.ts,tokens.css}`, `tokens/__tests__/tokens.test.ts`; `packages/ds/src/styles/base.css`, `styles/__tests__/base.test.ts`, `src/__tests__/build.test.ts`; `docs/design-system.md` (only the alias table and the token names, so the docs test passes; the rewrite is Task 10).
**Delete:** `packages/ds/src/fonts/Inter-Regular.woff2`, `Inter-Medium.woff2` (keep `LICENSE.txt` only if another font needs it).

**Interfaces:**
- Produces: no alias in `tokens.css`; the `Aliases` type and `withAliases()` gone; `--font` and `--font-number` the only font tokens.

| Old | New |
|---|---|
| `--bg` | `--ground` |
| `--fg` | `--tint` |
| `--fg-dim` | `--tint-dim` |
| `--line-control` | `--line-strong` |
| `--fill-off` | `--panel` |
| `--accent`, `--accent-hover`, `--accent-active`, `--warn` | `--sand` |
| `--on-bg` | `--on-tint` |
| `--on-accent` | `--on-sand` |
| `--font-sans`, `--font-mono`, `--font-label` | `--font` |

- [ ] **Step 1: Write the failing tests**: no file under `packages/ds/src` or `apps/web/src` contains `var(--<old>)` for any old name (a test that greps, listing the offenders); `tokens.css` emits none of them; `base.css` declares no `@font-face` and names no Inter; the build has no `dist/fonts/Inter-*`. Play: every pressable control that used `--accent` shows a hover change (the deferred "no hover feedback").
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Replace** each use by the table, reading each one: where an old name sat on a fill it did not mean (a `--fg` used as text on a `--tint` fill, a `--warn` that marks a fault), use the token the spec gives for that role and say so in the report. Remove the aliases, Inter and their tests' old expectations.
- [ ] **Step 4: Run** the unit suites, then the full `pnpm -F @ptah-app/ds test:visual`: **every board passes with no baseline regenerated** (Review Focus 1). A board that differs is a wrong replacement: fix the replacement, not the baseline. The one allowed change: a control that gains its missing hover state has no board of it.
- [ ] **Step 5: Commit**.

### Task 3: ZENITHALL's base layer as its own package

**Files:**
- Create: `packages/zenithall/` with `package.json` (`@ptah-app/zenithall`, no React in `dependencies` or `peerDependencies`), `README.md`, `tsconfig`, its build, and `src/`: `tokens/` (moved from `packages/ds/src/tokens`), `styles/base.css` (moved), `fonts/` (what is left), `mode.ts` (moved), `index.ts`, their tests (moved).
- Modify: `packages/ds/package.json` (depends on `workspace:*`), `packages/ds/src/{ds.css,index.ts,mode.ts}` and `tokens` entry (re-exports), `packages/ds/vite.config.ts`, `packages/ds/src/primitives/FixtureTile/FixtureTile.tsx` and where `FixtureColor` is defined, the root `package.json` scripts (`allcheck` runs the new package's tests and build first), `docs/rust-workspace.md` or wherever the workspace layout is described.

**Interfaces:**
- Produces: `@ptah-app/zenithall` exports `.` → everything `tokens.ts` and `mode.ts` export today, under the same names, `./tokens.css`, `./base.css`, `./fonts/*`. `@ptah-app/ds`'s `exports` map is unchanged for its users.

- [ ] **Step 1: Write the failing tests**: in the new package, the moved token, contrast-gate, base and mode tests pass from their new place; a test that the package's built files import nothing from `react`, `@ptah-app/ds` or any PTAH folder; a test that packs it (`pnpm pack`), unpacks the tarball into a temporary folder with a bare `index.html` that links `base.css`, and checks with Playwright that the three looks apply (`data-mode`), `--tint` resolves in each, and Chakra Petch loads from the package with the network blocked. In ds: `primitives/` imports nothing from `live/` or any screen folder.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Move and wire.** `git mv` so history follows. `mode.ts` must not import React; if a React hook lives beside it, the hook stays in ds.
- [ ] **Step 4: Run** `pnpm -r build`, the unit suites, the full visual gate (0.000 % again), `pnpm -F @ptah-app/web test:e2e -- perform.spec.ts`, then `df -h` and `cargo build -p ptah`; start the built `ptah` on a temporary root with `--fake-io` and check in Playwright, with the network blocked, that the app's fonts and looks work (Review Focus 2).
- [ ] **Step 5: Write `packages/zenithall/README.md`**: what it is, the three looks and how to switch, the token table (generated from `tokens.ts`), how a plain HTML page uses it, and that the React components live in `@ptah-app/ds`. Commit.

### Task 4: The shell and the shared pieces

**Files (modify):** `packages/ds/src/shell/*`, `components/Explain`, `components/Tooltip`, `components/Badge`, `components/Panel`, `components/NoticeLine`, `components/Table`, `components/Tabs`, `primitives/Digits`, their tests and stories, `apps/web/src/__tests__/routes.test.tsx`.

- [ ] **Step 1: Write the failing tests**, one per line:
  - The header at 999, 768 and 600 px of its own width: no sideways scroll; the places show number and icon, each a 44 px target named by its word, with the word as tooltip; the current place marked; the look switch and the status fully inside the band (Review Focus 4). At 1000 px and wider it is as today.
  - `Explain`: a tap opens the tooltip and a tap outside closes it; the tooltip holds the word once.
  - `Tooltip` with `useWholeWhenCut`: a pointer already resting on a text when it becomes cut gets the tooltip without moving away and back.
  - The badge keeps its size on a touch screen (the 1 px).
  - `Panel`'s title bar is not a `banner` landmark (jsdom and browsers agree); `routes.test.tsx` goes back to one banner.
  - `NoticeLine`'s link lets a ⌘-click or middle click through (new tab) and handles a plain click itself.
  - `Table`: the picked first cell needs no `position: relative` of its own (the brackets' anchor is the row).
  - `Tabs`' disabled rule uses `--tint-dim` through the role token, not a leftover.
  - `Digits`' hidden text uses the shared visually-hidden rule, no `1px` literals.
  - The caller's `aria-keyshortcuts` wins over the component's; the `+` hotkey; Back onto an old address while a page has unsaved changes asks the leave guard; the routes test for Settings uses an exact match.
- [ ] **Step 2: Run** — FAIL on each.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** tests, plays, the shell and gallery boards (new boards: the header at 768 and 600 in the three looks). Owner looks at the header at 768.
- [ ] **Step 5: Commit** (code, then baselines).

### Task 5: Show

**Files (modify):** `packages/ds/src/show/*`, `apps/web/src/show/*` where named, their tests and stories.

- [ ] **Step 1: Write the failing tests**: a crowded cell's add surface is at least 8 px wide and its focus ring is seen; the "+N" list ends inside the grid at the right edge; "Merge now" goes through `pickGroup` (the picked group follows); a row's name keeps at least 6 characters beside its dim chips, then is cut with its tooltip; Esc closing the row details returns the focus to the row's `···`.
- [ ] **Step 2–4: Run (FAIL), implement, run (PASS)**; the Show boards that change. `scroll.spec.ts`.
- [ ] **Step 5: Commit**.

### Task 6: Effects

**Files (modify):** `packages/ds/src/builder/*`, `apps/web/src/builder/*` where named, their tests and stories.

- [ ] **Step 1: Write the failing tests**: at 900 px with a 40-character program name, "used by N rows" keeps at least 3 characters and stays pressable; in the minimised bar a refused switch's reason shows on the notice line as a refusal (it ends at the next action), not only in a tooltip; a dimmed Hold in the from-the-show bar reads as dimmed (its ink is `--tint-dim`); the Slider's styles hang on its own data attributes, not on DOM order (a test that reorders nothing but reads the selectors); every maths node's picture in the add box is fed a ramp so its curve is not a flat line; while a program loads, the screen says the word the list already uses for loading.
- [ ] **Step 2–4: Run (FAIL), implement, run (PASS)**; the Builder boards that change.
- [ ] **Step 5: Commit**.

### Task 7: Lights

**Files (modify):** `packages/ds/src/venue/*`, `packages/ds/src/library/*`, `apps/web/src/venue/*`, `apps/web/src/library/*`, their tests and stories.

- [ ] **Step 1: Write the failing tests**: the Library search placeholder is whole at 900 px (or cut with the field's name still read); from the Library and a type, the Rig and Patch tabs follow the venue in use after the engine switches venue while the page is open; a double-click on a fixture row leaves it picked; a Patch row has one height from 900 px up, its status cut with a tooltip; the Universes dialog's width comes from one class (no doubled selector).
- [ ] **Step 2–4: Run (FAIL), implement, run (PASS)**; the venue and library boards that change. `scroll.spec.ts`.
- [ ] **Step 5: Commit**.

### Task 8: Inspect and Settings

**Files (modify):** `packages/ds/src/debug/*`, `packages/ds/src/settings/*`, `apps/web/src/debug/*`, `apps/web/src/settings/*`, their tests and stories.

- [ ] **Step 1: Write the failing tests**:
  - Look back, on a "not recorded" moment after the patch changed: no light is outlined on a universe it is not on (the outlines are matched to the universe by id, not by position).
  - The grid's light outlines and the tag have the same fallback as the cells where `round()` and container units are missing (`@supports`), so they still line up (a play with the fallback forced).
  - The universe line (name, output, state, frames/s) does not re-render when only the frame's bytes change.
  - The two engine lines ("engine restarting", "no data from the engine") get their sand tone from a `severity` the hook passes, not from their words; `severity` is then required on a fault line.
  - `bandWords().tone` and the band's drawn tone agree for every band state.
  - The screens style their parts through data attributes the parts expose, not through `aria-label` selectors or inner DOM.
  - The why panel's scroll box has a name.
  - Live's column 2 at 1280 × 732 fits with at least 8 px to spare.
  - A comment where the folded Engine counts errors (number fields only, as `issueProps` places them).
- [ ] **Step 2–4: Run (FAIL), implement, run (PASS)**; the debug and settings boards that change; the burst gate. `scroll.spec.ts`.
- [ ] **Step 5: Commit**.

### Task 9: What nothing uses, and the tests' own tidying

**Files (modify or delete):** as found.

- [ ] **Step 1: For each candidate, prove it has no user** (`graft callers`, a grep in `packages/ds/src` and `apps/web/src`, stories included) and list the result: `NumberLine`, `ToggleLine`; `MessageList`'s branch that only the old screen drew; the bars' `notesAs` prop and the parts' `title?` prop (keep each that has a user); `TimelineRuler`, `LiveClock`, `LiveDmxValueBar`, `LiveUniverseGrid`, `ShowDialogs`, `ProgramDialogs`, `ShowProbeSwitch`, `TypeGiver`, `TypeNotice` and the settings `*Group` types (each kept if a screen or a story of a shipped piece uses it); comments that still name Inter or the old look; the duplicate CSS assertions in the tokens and build tests; the `gates.ts` `startsWith("#")` cast; `HATCH_VALUE` anchoring only its prefix; the orphan docs line.
- [ ] **Step 2: Remove** what has no user, with its stories, tests and boards (a removed board's baseline is deleted, and the report lists it). Fix the tidying items with their tests.
- [ ] **Step 3: Run** `pnpm -r build`, the unit suites, Storybook, the full visual gate.
- [ ] **Step 4: In the deferred file**, strike out every line this plan has done (Tasks 1 to 9) and move the dropped ones under "Dropped" with their reason from "Decisions this plan makes". Commit both repositories (the V1 one: the deferred file alone).

### Task 10: The design-system document

**Files (modify):** `docs/design-system.md` (2 240 lines today: a "ZENITHALL (in progress)" part, then the pre-redesign system), `packages/ds/src/__tests__/docs.test.ts`.

- [ ] **Step 1: Write the failing tests**: the document names every token `@ptah-app/zenithall` emits and none that is gone (Review Focus 5); it does not contain "in progress", "plan 7", `--bg`, `--fg`, "Inter", "pure black" or "Perform, assembled" as a heading; every component exported by `@ptah-app/ds` has a heading; every heading in "Screens" is one of the six places.
- [ ] **Step 2: Rewrite it as one document for ZENITHALL**, in this order: what ZENITHALL is and its two layers (the package of Task 3, then ds); the rules (the spec's "Across the app" and "The look in numbers", with the token names); the three looks and the switch; the tokens (table generated from `tokens.ts`); the gates (contrast, motion, no-shift, visual, burst); the general components and primitives (what each is for, its props that matter, the patterns: picked, cut text, explain, notice line, hint line, right column, panels that scroll); the live layer; the six places (Lights, Effects, Show, Live, Inspect, Settings: regions, states, rules, taken from the "in progress" sections and corrected against the code); the shell; preferences kept per browser; how to add a screen. The pre-redesign text is not kept; where it describes behaviour that still holds, it is rewritten in the new names.
- [ ] **Step 3: Run** the docs test — PASS. Read the document top to bottom once against Storybook and fix what is wrong.
- [ ] **Step 4: Commit**.

### Task 11: Checkpoint

- [ ] **Step 1:** `df -h /System/Volumes/Data | tail -1`; `du -sh target`; clean per AGENTS.md if needed.
- [ ] **Step 2:** `pnpm allcheck` three times in a row — green each time (Task 1's point). A failure is reported with its output and fixed, not waved through as load.
- [ ] **Step 3:** Start the app as the e2e rig does (a temporary root copied from `fixtures/`, `--fake-io`, never `~/.ptah`); browser with scrollbars shown. Walk **all six places** at 1280 × 800, 1024 × 768, 768 × 1024 (the iPad upright) and 390 × 844, in the three looks: the main path of each place (the walks of plans 2 to 6, shortened to their first half), the header at each width, a tooltip by touch emulation, the look switch and F2, an old address redirecting. Save a screenshot of each to the plan's workspace, open the key ones with the Read tool, and report anything wrong.
- [ ] **Step 4:** In `~/projects/ptah/docs/superpowers/specs/2026-10-25-v2-master-plan.md`, mark the redesign step complete with its seven plans and their merge dates, and name the new package. Commit (the V1 repository, that file alone).
- [ ] **Step 5:** Owner check of the running app. After the merge, tag `redesign-complete` locally.
