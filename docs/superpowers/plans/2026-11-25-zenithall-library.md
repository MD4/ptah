# ZENITHALL Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move ZENITHALL (the base layer, the general React components and a general page frame) out of PTAH's repository into the private repository `MD4/zenithall` as the library `@md4/zenithall`, and make PTAH install a tagged version of it, with nothing changed on screen.

**Architecture:** Two repositories. `~/projects/zenithall` (new, branch `main`) holds the library and its Storybook; a release is a git tag `vX.Y.Z` whose commit contains `dist/`. `~/projects/ptah-v2` (branch `zenithall-library` from master `852475b`) keeps `@ptah-app/ds` for PTAH's screens, which depends on `@md4/zenithall` by `git+https` tag, treats it as external in its build, and still ships one stylesheet with ZENITHALL's CSS first. The ties between the general pieces and PTAH are cut inside PTAH first, where the existing screen pictures can prove nothing moved, and only then are the files moved.

**Tech Stack:** pnpm 9.15.4, Node ≥ 20.11, TypeScript, Vite 6.4.5 (library mode), Vitest, Storybook, Playwright 1.59.1 (screen pictures), Biome, React 19 (peer), Base UI `1.0.0-rc.0`, lucide-react `1.61.0`, `@tanstack/react-virtual` `3.14.23`.

**Spec:** `~/projects/ptah/docs/superpowers/specs/2026-11-25-zenithall-library-design.md` (commit `cc92aa3`). Read it first; it lists what moves and what stays.

## Global Constraints

- **Nothing changes on screen in PTAH.** No baseline under `packages/ds/visual/baselines/` is ever updated in this plan (`update:visual` is never run). A picture that differs is a bug to fix, not a baseline to refresh.
- The same component never exists in both repositories at the end.
- No built file is committed on ZENITHALL's `main`. Only a release tag's commit contains `dist/`.
- The tagged `package.json` has no `prepare`, `preinstall`, `install` or `postinstall` script (pnpm 9 runs `prepare` on a git dependency).
- Dependencies pinned exactly (no `^`, no `~`) in the new repository; no new dependency younger than 14 days. The single exception: `@md4/zenithall` itself in PTAH.
- Biome only. Tokens-only styling. Keep today's wording on every label.
- Library name `@md4/zenithall`, first release `1.0.0`, `"private": true`, `"license": "UNLICENSED"`; the fonts' SIL Open Font licences ship in the package.
- PTAH installs it as `"@md4/zenithall": "git+https://github.com/MD4/zenithall.git#v1.0.0"` (exact tag; the lock file pins the commit).
- ZENITHALL's Storybook runs on port **6010**. Ports 6006–6008 belong to the owner's servers: never start, stop or reuse them.
- Never start V1 services or pm2. Never read or touch `~/.ptah` (the owner's live PTAH data now), `~/.ptah-v1` or `~/ptah-home`. Anything that runs PTAH uses a temporary `HOME` and root.
- Screenshots of PTAH or Storybook windows only, window-scoped; never the whole screen.
- Pushes: the owner has allowed pushes of code and tags to `MD4/zenithall` for this plan (see "Before starting"). Nothing is pushed to `MD4/ptah-v2` or `MD4/ptah` without his word.
- At most three agents at once. Tasks run in order.
- UI tasks use the scoped visual gate: `pnpm -F @ptah-app/ds test:visual -- --only <boards>`; the full gate runs at the checkpoint.
- Commit messages end with `Claude-Session: https://claude.ai/code/session_01EYgPRkpnRPFCbX5Ayt6nRW`.
- Leave PTAH's untracked `docs/design/brief/` and `.ignore` alone.

## Before starting

- The owner's word that code and tags may be pushed to the private `MD4/zenithall` during the build (Task 1 needs a pushed tag to prove the install). Without it, stop before Task 1's push.
- `git -C ~/projects/ptah-v2 status` clean on master `852475b`; create branch `zenithall-library`.
- `gh auth setup-git` has been run on this Mac (git over https uses the owner's GitHub login); check with `git ls-remote https://github.com/MD4/zenithall.git`.

## Review Focus

1. **A PTAH screen that restyles a shared component loses to ZENITHALL's CSS.** `perform/Transport.module.css` and `perform/Perform.module.css` override components at equal weight; they win only because their rules come later in the one sheet. Expected: `dist/ds.css` has every ZENITHALL rule before the first PTAH rule. Test in Task 7.
2. **Installing the library builds something, or needs more than git access.** Expected: `pnpm install` of the tag runs no script and leaves `dist/` readable. Test in Task 1.
3. **Two copies of the library (or of React, or Base UI) in the web app.** A second copy breaks shared context (tooltips, dialogs, the look switch's state). Expected: `apps/web`'s build contains the library once. Test in Task 7.
4. **The fonts go missing from the sheet PTAH ships, or from the window's waiting and guide pages.** Expected: `packages/ds/dist/fonts/` and the app's bundled pages still carry Chakra Petch and Jost. Tests in Tasks 7 and 8.
5. **The "try before release" switch is left on and reaches a commit.** Expected: a test fails while PTAH points at a local ZENITHALL. Test in Task 8.

---

### Task 1: The new repository, and proof that a tag installs

**Files (in `~/projects/zenithall`, cloned from `https://github.com/MD4/zenithall.git`):**
- Create: `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `tsconfig.build.json`, `biome.json` (PTAH's rules), `vitest.config.ts`, `.gitignore` (`dist/`, `node_modules/`, `storybook-static/`, `visual/diff/`), `README.md`, `AGENTS.md`
- Create: `scripts/release.mjs`, `scripts/__tests__/release.test.ts`, `scripts/__tests__/install.test.ts`
- Create: `src/index.ts` (one placeholder export, `ZENITHALL_VERSION`, replaced in Task 4)

**Interfaces:**
- Produces: `node scripts/release.mjs <version> [--dry-run]`. It refuses a dirty tree or a branch other than `main`; sets `version` in `package.json`; runs `pnpm check` (typecheck, tests) and `pnpm build`; commits `release: v<version>` on `main`; then makes a second commit, child of it, that adds `dist/` (forced past `.gitignore`), tags that commit `v<version>`, moves `main` back to the first commit, and pushes `main` and the tag. `--dry-run` does everything but push.
- Produces: `package.json` whose `exports` point at `dist/` from the start (the repository's own code imports by relative path); `files: ["dist", "README.md"]`; no lifecycle script.
- `AGENTS.md` states the rules: the Global Constraints that apply here, how to release, that `dist/` never goes on `main`.

- [ ] **Step 1:** Write `release.test.ts`: in a temporary git repository with a bare remote, `release.mjs 0.0.1` leaves `main` without `dist/`, a tag `v0.0.1` whose tree has `dist/index.js` and a `package.json` with `"version": "0.0.1"` and no `prepare`/`install`/`postinstall`/`preinstall` script; a dirty tree is refused; a second run with the same version is refused.
- [ ] **Step 2:** Run it, see it fail; write `release.mjs`; see it pass.
- [ ] **Step 3:** Scaffold the rest (tooling pinned exactly at the versions PTAH's lock file resolves), commit, push `main`, release `0.0.1` for real.
- [ ] **Step 4:** Write `install.test.ts` (skipped unless `ZENITHALL_INSTALL_TEST=1`, since it needs the network): in an empty temporary folder with pnpm 9.15.4, `pnpm add git+https://github.com/MD4/zenithall.git#v0.0.1 --ignore-scripts=false` succeeds; `node_modules/@md4/zenithall/dist/index.js` exists; `node_modules/@md4/zenithall` holds no `src/` and no `node_modules/.bin`; the lock file names a commit hash; the installed `package.json` has no lifecycle script. Run it with the variable set; it must pass.
- [ ] **Step 5:** Commit and push.

If Step 4 cannot pass with `git+https` (pnpm cannot fetch the private repository through git's credential helper), stop and report: the install method is the spec's and changing it is the controller's ruling.

### Task 2: Cut the ties inside PTAH

**Files (in `~/projects/ptah-v2`):**
- Modify: `packages/ds/src/primitives/_shared/format.ts` → split into `format.ts` (general, no import outside `primitives/` and `components/`) and `packages/ds/src/primitives/_shared/noteFormat.ts` (what needs `../../notesAs`)
- Modify: every importer of the names that moved to `noteFormat.ts`
- Modify: `components/CommandPalette/useCommandPaletteHotkey.ts`, `shell/LookSwitch.tsx`, `components/Dialog/Dialog.stories.tsx`, `components/Dialog/Dialog.look.test.tsx`, `stories/StageMode.stories.tsx`, `.storybook/preview.tsx`: import the look switch from `@ptah-app/zenithall`, not `../../mode`
- Create: `packages/ds/src/components/_shared/index.ts`: the public helpers surface
- Test: `packages/ds/src/__tests__/boundary.test.ts`

**Interfaces:**
- Produces: `components/_shared/index.ts` exporting exactly what PTAH's screens import from `_shared` today: `cx`, `cells` (the CSS-module class map of `cells.module.css`) and the helpers of `cells.ts`, `useWholeWhenCut`, `plainClick`, and the names of `trigger`. Screens and PTAH's primitives import from `components/_shared` (the index), never from a file inside it.
- Produces: `boundary.test.ts`, which walks the imports of the "moves" set (`components/`, `icons/`, `gates/`, `primitives/{Digits,BarProgress,Sparkline,StatusWord,FaultLine}`, `primitives/_shared/format.ts`) and fails on any import that leaves the set, other than `react`, `react-dom`, `@base-ui-components/react`, `lucide-react`, `@tanstack/react-virtual`, `@ptah-app/zenithall`, and test/story tooling. Stories and tests of the set are included.
- If `BarProgress` needs a name from `noteFormat.ts`, it leaves the "moves" set: record it and take it out of the test's list.
- `mode.ts` keeps only the carry-over from the old `ptah.ds.mode` keys and its re-exports.

- [ ] **Step 1:** Write `boundary.test.ts`; run it; it fails on `format.ts`, the six `mode` importers, and nothing else. A different failure list means the spec's "Ties to cut" is incomplete: record the extra tie and cut it the same way.
- [ ] **Step 2:** Split `format.ts`; repoint the `mode` imports; add `_shared/index.ts` and switch every outside importer to it.
- [ ] **Step 3:** `pnpm -F @ptah-app/ds typecheck && pnpm -F @ptah-app/ds test` pass; `boundary.test.ts` passes.
- [ ] **Step 4:** Scoped visual gate on `gallery-*`, `stagemode-*`, the dialog and command-palette boards, and every board of a component whose file changed: zero differences, zero baselines touched.
- [ ] **Step 5:** Commit.

### Task 3: The page frame, separated inside PTAH

**Files:**
- Create: `packages/ds/src/components/Frame/{Frame.tsx,Frame.module.css,index.ts,Frame.test.tsx,Frame.stories.tsx}`
- Move: `shell/LookSwitch.tsx` → `components/LookSwitch/` (with its styles and tests)
- Modify: `packages/ds/src/shell/Shell.tsx`, `Shell.module.css` (PTAH's shell becomes the frame, filled)
- Modify: `packages/ds/src/__tests__/boundary.test.ts` (add `components/Frame`, `components/LookSwitch`)

**Interfaces:**
- Produces: `Frame`, a component with slots `mark` (the logo node), `places`, `tools`, `look` (the look switch), `status`, `children` (the page area), and `squeeze?: { tight: number; compact: number; wide: number }`, the three widths at which the band narrows. PTAH passes `{ tight: 1110, compact: 1140, wide: 1240 }` (today's constants in `Shell.tsx:73-82`); the frame has no default tied to PTAH's words. The under-600 px `⌘K` hint stays PTAH's (it is passed through `tools`).
- `Shell` keeps its props and its exported names; `shell/status.ts`, the PTAH mark with its four stripes and PTAH's places stay in `shell/`.
- The frame's CSS is the band's CSS moved, not rewritten: same custom properties, same sizes.

- [ ] **Step 1:** Write `Frame.test.tsx`: each slot renders in band order (mark, places, gap, tools, look, status); the band is 52 px; at a container width under `tight` / `compact` / `wide` the frame sets the same data attributes `Shell` sets today; with no `squeeze` it never narrows.
- [ ] **Step 2:** Run it, see it fail; extract `Frame` and `LookSwitch`; make `Shell` use them; see it pass, with `shell/__tests__` unchanged and passing.
- [ ] **Step 3:** Add `Frame.stories.tsx` (one story per look, with a neutral mark) for ZENITHALL's Storybook. It gets no baseline here: new boards are added in Task 5.
- [ ] **Step 4:** Scoped visual gate on every `shell-*` board and every board that shows the header (`gallery-*`, `perform-*`, one board per screen at each width listed in the harness): zero differences.
- [ ] **Step 5:** `boundary.test.ts` passes with the two new folders. Commit.

### Task 4: The library's code

**Files (in `~/projects/zenithall`):**
- Create: `src/base/` ← the whole of PTAH's `packages/zenithall/src` (tokens, looks, gates, look switch, styles, fonts handling) and its `scripts/` (`build-css.mjs`, `readme.ts`)
- Create: `src/components/`, `src/icons/`, `src/gates/`, `src/primitives/` ← the "moves" set of Task 2's `boundary.test.ts`, with `components/_shared/index.ts`, `Frame`, `LookSwitch`
- Create: `src/index.ts` (every public name), `src/helpers.ts` (re-exports `components/_shared/index.ts`), `src/zenithall.css.ts` (the stylesheet entry)
- Create: `vite.config.ts` (from PTAH's `packages/ds/vite.config.ts`)
- Modify: `package.json` (exports, dependencies, peer dependencies)
- Test: the moved unit tests, plus `src/__tests__/build.test.ts`, `src/__tests__/names.test.ts`

**Interfaces:**
- Produces these entry points (all under `dist/`):
  - `@md4/zenithall`: every component, primitive, icon, the frame, and the base layer's names (`tokens`, `Mode`, `ColorSet`, `initMode`, `getMode`, `setMode`, `toggleStage`, `isTyping`, `MODE_KEY`, `MODE_STORAGE`, `BASE_STORAGE`, `checkContrast`, `contrastRules`, `contrastRatio`, `relativeLuminance`, `relativeLuminanceRgb`, `flatten`, `kebab`)
  - `@md4/zenithall/base`: the base layer's names alone, importing no React
  - `@md4/zenithall/helpers`: the names of `components/_shared/index.ts`
  - `@md4/zenithall/<Component>`: one per folder of `components/` (as `@ptah-app/ds/<Component>` today), plus `@md4/zenithall/primitives`, `@md4/zenithall/icons`
  - `@md4/zenithall/zenithall.css`: base rules first, then every component's CSS, fonts as files under `dist/fonts/`
  - `@md4/zenithall/base.css`, `@md4/zenithall/tokens.css`, `@md4/zenithall/fonts/*`: as `@ptah-app/zenithall` offers today
- `dependencies`: `@base-ui-components/react` `1.0.0-rc.0`, `lucide-react` `1.61.0`, `@tanstack/react-virtual` `3.14.23`. `peerDependencies`: `react` and `react-dom` `^19`, both optional in `peerDependenciesMeta`.
- Class names: the CSS modules keep Vite's default naming; nothing outside the library may depend on a generated class name (PTAH reads `cells` through `helpers`).
- The files are copied from PTAH's branch `zenithall-library` at its current head; the first commit's message names that commit. PTAH is not changed in this task.

- [ ] **Step 1:** Write `build.test.ts`: after `pnpm build`, every entry point above resolves to a file; `dist/base.js` contains no `react`; no file under `dist/` imports a path outside `dist/` other than the four external packages and `react/jsx-runtime`; `dist/zenithall.css` opens with the tokens and base rules before the first component rule and references fonts as `./fonts/…`; `dist/fonts/` holds both faces and both licence files.
- [ ] **Step 2:** Write `names.test.ts`: the root entry exports every name PTAH's `packages/ds/src/index.ts` exports today from `components/`, `icons/`, `gates/`, the five primitives and `@ptah-app/zenithall` (the list is written into the test, taken from that file at the copied commit).
- [ ] **Step 3:** Run both, see them fail; copy the files, write the entries and `vite.config.ts`; make the moved unit tests and both new tests pass (`pnpm check`).
- [ ] **Step 4:** The base layer's own "packed alone" test is kept, adapted: it builds a release tree with `release.mjs --dry-run`, exports the tag's tree to an empty folder and loads `base.css` and the base entry with the network blocked.
- [ ] **Step 5:** Commit and push `main`.

### Task 5: The library's Storybook and screen pictures

**Files (in `~/projects/zenithall`):**
- Create: `.storybook/{main.ts,manager.ts,preview.tsx,test-runner.ts,vitest.setup.ts}` (from PTAH's, pointed at this repository's sources, port 6010)
- Create: `scripts/{test-visual.mjs,test-storybook.mjs,storybook-server.mjs}` and their tests (from PTAH's)
- Create: `src/stories/` ← PTAH's general stories (`Tokens`, `Type`, `Grid`, `Gallery`, `NoShift`, `StageMode` and their `_shared` helpers), without anything that shows a PTAH screen
- Create: `visual/baselines/darwin/` ← the baselines of every moved board, copied byte for byte
- Create: `visual/README.md`

**Interfaces:**
- Produces: `pnpm storybook` (port 6010), `pnpm test:storybook`, `pnpm test:visual [-- --only <boards>]`, `pnpm update:visual`.
- `test-visual.mjs` here lists only this repository's stories (the general entries of PTAH's `STORIES`, same names, same ids, same viewports). The performance and burst checks are not copied.
- A story or a `Gallery` section that shows PTAH-only pieces is cut down to the general pieces; a board whose content changes for that reason gets a **new** name and a new baseline, and its old baseline stays in PTAH for PTAH's own gallery. Record each one.
- `Frame` gets its boards here (three looks, and one per squeeze width).

- [ ] **Step 1:** Copy the harness and its tests; make the harness tests pass.
- [ ] **Step 2:** Copy the stories and the baselines. Run `pnpm test:visual`: every moved board matches its copied baseline with **zero** differences and no update. A board that differs is investigated (fonts not loaded before the shot, a decorator not copied, stylesheet order); the baseline is never refreshed to make it pass.
- [ ] **Step 3:** Run `pnpm update:visual -- --only <the new boards>` for the boards recorded as new (the frame's, and any cut-down gallery); open each new picture and look at it before committing it.
- [ ] **Step 4:** `pnpm test:storybook` passes. Commit and push `main`.

### Task 6: Release 1.0.0

**Files (in `~/projects/zenithall`):**
- Modify: `README.md` (what the library is, the entry points, how an app installs a tag, how to release, the "try before release" loop), `AGENTS.md`
- Create: `.github/workflows/check.yml` (on push to `main`: install, `pnpm typecheck`, `pnpm test`; nothing else, to spare the private repository's minutes)
- Create: `docs/access.md`: the owner's steps, in plain words, to create a read-only key for this repository and store it as the secret `ZENITHALL_READ_TOKEN` in an app's repository
- Modify: `package.json` scripts: `dev:lib` (`vite build --watch` plus the types), `check` (typecheck, tests, build, storybook tests, visual)

**Interfaces:**
- Produces: tag `v1.0.0` on `MD4/zenithall`, made by `node scripts/release.mjs 1.0.0`.
- Produces: the "try before release" loop, library side: `pnpm dev:lib` keeps `dist/` fresh in `~/projects/zenithall` for an app that points at the folder (Task 8 adds PTAH's side).

- [ ] **Step 1:** Write the docs and the workflow. The README's entry-point table is generated or checked by a test against `package.json`'s `exports`.
- [ ] **Step 2:** `pnpm check` green. Run `release.mjs 1.0.0`. Run Task 1's `install.test.ts` against `v1.0.0` with `ZENITHALL_INSTALL_TEST=1`.
- [ ] **Step 3:** Delete the throwaway tag `v0.0.1` on the remote and locally. Commit and push.

### Task 7: PTAH's design package uses the library

**Files (in `~/projects/ptah-v2`):**
- Modify: `packages/ds/package.json` (dependency `"@md4/zenithall": "git+https://github.com/MD4/zenithall.git#v1.0.0"`; drop `@ptah-app/zenithall`; drop the per-component `exports` whose folder is deleted **only if** nothing imports them, otherwise keep them as re-exports), `pnpm-lock.yaml`
- Delete: `packages/ds/src/{components,icons,gates}/`, the five moved primitives, `primitives/_shared/format.ts`, the moved stories, and the baselines of the moved boards
- Modify: `packages/ds/src/index.ts`, `tokens/tokens.ts`, `mode.ts`, `primitives/index.ts`: re-export the same names from `@md4/zenithall`
- Modify: every import inside `packages/ds/src` that pointed at a deleted file: components and primitives from `@md4/zenithall`, helpers from `@md4/zenithall/helpers`
- Modify: `packages/ds/src/ds.css` (first line imports `@md4/zenithall/zenithall.css`), `vite.config.ts` (`@md4/zenithall` and its subpaths external; the component entries come from the re-exports), `.storybook/preview.tsx`, `scripts/test-visual.mjs` (its `STORIES` loses the moved boards), `scripts/storybook-server.mjs`
- Modify: `packages/ds/src/__tests__/build.test.ts`, `boundary.test.ts` (now: nothing under `packages/ds/src` defines a component the library exports)
- Create: `apps/web/src/__tests__/one-copy.test.ts`

**Interfaces:**
- Consumes: `@md4/zenithall@1.0.0`'s entry points (Task 4).
- Produces: `@ptah-app/ds` with the **same exported names and the same entry paths** as before, so `apps/web` needs no import change. `apps/web/package.json` gains nothing: it reaches the library through `@ptah-app/ds`.
- `dist/ds.css` is one sheet: ZENITHALL's sheet, whole and first, then PTAH's CSS; fonts under `dist/fonts/`.

- [ ] **Step 1:** Rewrite `build.test.ts`'s expectations first: no file under `dist/` contains a copy of a library component (the built `Button` entry is a re-export importing `@md4/zenithall/Button`); in `dist/ds.css` the last rule that comes from `@md4/zenithall/zenithall.css` precedes the first rule of a PTAH CSS module (compare against the library's own sheet read from `node_modules`); `dist/fonts/` holds both faces; `dist/` asks for no workspace package.
- [ ] **Step 2:** Write `one-copy.test.ts`: after `pnpm -F web build`, the string of a marker exported by the library (`ZENITHALL_VERSION`) appears in exactly one built chunk, and `react-dom`'s and Base UI's markers once each.
- [ ] **Step 3:** See both fail. Add the dependency (`pnpm install`), delete the moved code, rewrite the imports and re-exports, fix the build. See both pass, with `pnpm -F @ptah-app/ds typecheck` and `test`.
- [ ] **Step 4:** Full visual gate for `packages/ds` (this is the proof task): `pnpm -F @ptah-app/ds test:visual`: every remaining board matches with zero differences and no update. `pnpm -F @ptah-app/ds test:storybook` passes.
- [ ] **Step 5:** `pnpm -F web test` and the web app's e2e walks for one page per place, on both engines, pass. Commit.

### Task 8: The rest of PTAH, and the try-before-release switch

**Files (in `~/projects/ptah-v2`):**
- Delete: `packages/zenithall/`
- Modify: `app/package.json` (depends on `@md4/zenithall` at the same tag), `app/scripts/build-ui.mjs` (copies `base.css`, `tokens.css` and the fonts from the installed library's entry points; runs no build of it), `app/scripts/build-guide.mjs`, `app/scripts/build-guide.test.mjs`
- Modify: `scripts/allcheck.mjs`, root `package.json` (`allcheck:serial`), `scripts/make-app.sh`, `.github/workflows/{ci.yml,release.yml,visual-baselines.yml}`
- Modify: `README.md`, `docs/design-system.md`, `AGENTS.md` (the 14-day exception; where ZENITHALL lives; how to try a local ZENITHALL)
- Create: `scripts/zenithall-local.mjs`, `scripts/__tests__/zenithall-local.test.mjs`

**Interfaces:**
- Produces: `node scripts/zenithall-local.mjs on|off|status`. `on` points `@md4/zenithall` at `~/projects/zenithall` (a pnpm override written to the root `package.json`, then `pnpm install`); `off` removes it and restores the tag. `status` prints which one is active.
- Produces: `zenithall-local.test.mjs`, part of `allcheck`: it fails when the root `package.json` or the lock file points `@md4/zenithall` anywhere but the `git+https` tag, with the line `ZENITHALL points at a local folder: run node scripts/zenithall-local.mjs off`.
- The workflows fetch the private library with the secret `ZENITHALL_READ_TOKEN` (one step: `git config --global url."https://x-access-token:${TOKEN}@github.com/".insteadOf "https://github.com/"`, placed before `pnpm install`), and fail early with a plain message when the secret is empty. They cannot be run from here: say so in the report.
- `allcheck` covers what it covered: the base layer's tests and build are gone from PTAH (they run in ZENITHALL's `pnpm check`); everything else is unchanged.

- [ ] **Step 1:** Write `zenithall-local.test.mjs` (on a copy of the two files in a temporary folder: the tag passes; an override to a path fails with the line above; `on` then `off` restores the files byte for byte). See it fail; write the script; see it pass.
- [ ] **Step 2:** Update `app/`'s scripts and their tests: the waiting page and the guide still embed the tokens and both faces (the existing assertions, re-pointed).
- [ ] **Step 3:** Delete `packages/zenithall`; update `allcheck`, the scripts, the workflows and the docs. `grep -rn "@ptah-app/zenithall\|packages/zenithall"` over the repository (outside `graft/` and lock files) returns nothing.
- [ ] **Step 4:** `pnpm allcheck` green once. Commit.

### Task 9: Checkpoint

**Files:**
- Modify: `~/projects/ptah/docs/superpowers/specs/2026-10-25-v2-master-plan.md` (one paragraph: ZENITHALL is its own library; built, merge pending the owner's word)
- Create: the task report

- [ ] **Step 1:** In `~/projects/ptah-v2`: `pnpm allcheck` green three times on one HEAD. A test that fails now and then is fixed in the test, scoped to its condition, and the count restarts.
- [ ] **Step 2:** `git status` shows no file under `packages/ds/visual/baselines/` modified; `git diff --stat master -- packages/ds/visual/baselines` lists deletions only (the moved boards).
- [ ] **Step 3:** In `~/projects/zenithall`: `pnpm check` green on `main` at the commit `v1.0.0` was cut from; `git ls-tree -r main --name-only | grep '^dist/'` prints nothing.
- [ ] **Step 4:** Rehearsal: `bash scripts/make-app.sh aarch64-apple-darwin <temp>`; open the built app with a temporary `HOME` and root; walk Live, Show, Effects, Lights, Inspect, Settings; press F2 through the three looks; open one dialog, one menu, the command palette, a tooltip. Window-scoped screenshots into the workspace's `walk/`. Stop everything; delete the temporary folders.
- [ ] **Step 5:** Start ZENITHALL's Storybook on 6010, shoot the components index and the Frame story (window-scoped), stop it.
- [ ] **Step 6:** Write the master-plan paragraph and the report: what moved, what stayed and why (each piece that left the "moves" set), the boards recorded as new, what could not be run (the GitHub workflows), and the owner's actions (the access key, the merge word).

## Self-review notes

- Spec coverage: repository and library (Tasks 1, 4, 6); what moves and stays, ties to cut (2, 3, 4); stylesheet order (7); helpers public (2, 4); app window (8); every other use of the old name (8); releases and no install script (1, 6); try-before-release (6, 8); screen pictures Mac-only and harness split (5, 7); the proof (2, 3, 5, 7, 9); the owner's key (6, 8).
- The mixer pieces, IHY and any look change are out of this plan by the spec.
