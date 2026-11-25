# ZENITHALL as its own repository and library: design

Date: 2026-11-25. Status: written, waiting for the owner's approval.

## Why

ZENITHALL is the design system built during PTAH V2's redesign. Today it lives
inside PTAH's repository (`~/projects/ptah-v2`), in two packages:
`packages/zenithall` (the base layer, no framework) and `packages/ds` (the
React components, mixed with PTAH's own screens).

The owner wants IHY (`~/projects/ihy`, the in-ear mixer) to match PTAH, and
has chosen to move IHY to React on PTAH's real components. IHY has its own
repository and is published on npm; it cannot reach packages that live inside
PTAH's repository. Later apps (the Visualizer, the box) will have the same
need.

So ZENITHALL becomes its own private repository and one library that PTAH and
IHY both install. This document covers that step only. IHY's redesign is the
next project and has its own design.

## Goals

- One private repository, `MD4/zenithall` (created 2026-11-25), cloned at
  `~/projects/zenithall`, holding one library, `@md4/zenithall`.
- PTAH installs an exact tagged version of it from GitHub and no longer
  carries its own copy of what moved.
- **Nothing changes on screen in PTAH.** Not one pixel, not one behaviour.
- A second app can install the same library and get the base layer, the
  general components and the page frame.

## Non-goals

- No change to the look, the wording or any component's behaviour.
- No new components. The mixer pieces IHY needs (fader, meter, mute, CLIP,
  lock) are built during IHY's redesign and released as a later version.
- No change to IHY in this step.
- No publishing on npm and no public repository.
- No documentation site. Storybook is the reference.

## Anti-goals (these would make the step a failure even if it "works")

- A PTAH screen that shifts, recolours or behaves differently.
- The same component existing in two places (one copy in PTAH, one in
  ZENITHALL).
- Built files committed on ZENITHALL's main branch.
- An app that needs the network, or GitHub, at run time because of this.
- Friends needing anything new to install PTAH or IHY.

## Constraints

- The owner's standing rules for PTAH apply to the new repository too: Biome
  only, tokens-only styling, nothing shifts, dependencies pinned exactly and
  no new dependency younger than 14 days.
- **One exception, decided by the owner:** `@md4/zenithall` itself is exempt
  from the 14-day rule in PTAH and IHY (a fresh release of our own library is
  always younger than 14 days). Nothing else is exempt.
- No paid service. The repository is private and installed from GitHub.
- The owner pushes outward changes himself or asks for them explicitly. He
  asked for the repository to be created; pushes of code and tags to it are
  part of this work and are his to confirm at the checkpoint.
- Never start V1 services, never touch `~/.ptah-v1` or `~/ptah-home`. The
  owner's Storybook servers on ports 6006–6008 are his.
- The owner is the band's drummer, not a developer: everything he reads is in
  plain words.

## Approaches considered

How a second app gets PTAH's components:

1. **Copy them in.** A script packs the two packages into files kept in IHY's
   repository. Cheap, IHY stays independent, but IHY follows PTAH only when
   someone runs the script, and the components still live inside PTAH.
2. **Move IHY into PTAH's repository.** Always in step, but IHY's history,
   releases and tooling must all be redone.
3. **A library of its own** (chosen by the owner). ZENITHALL gets its own
   repository; every app installs a version of it. More work now and a
   three-step loop for shared changes (change, release, update the app), in
   exchange for one real home for the design system.

How the apps install it:

- **npm, public.** Simple everywhere, but the source becomes public.
- **From the private GitHub repository, pinned to a tag** (chosen by the
  owner). The source stays private. The apps' compiled output still contains
  ZENITHALL, as it does today. The automatic checks of PTAH and IHY need a
  read-only key to fetch it.

## What moves, what stays

Checked in the code on 2026-11-25 (PTAH master `852475b`): the general pieces
import React, Base UI, lucide, TanStack Virtual (the table) and the base
layer. Three small ties to PTAH have to be cut first; they are listed under
"Ties to cut" below.

**Moves to ZENITHALL**

- The whole of `packages/zenithall`: tokens and the three looks (dark, light,
  stage), the contrast gates, the look switch (F2 and the stored choice), the
  base CSS, the two faces (Chakra Petch, Jost) with their licences, and its
  tests (including the test that packs the library and loads it in an empty
  folder with the network blocked).
- From `packages/ds/src`: `components/` (the 27 general components and their
  `_shared` helpers), `icons/`, `gates/` (motion), the general stories under
  `stories/` (tokens, type, gallery, no-shift helpers), and the tests, stories
  and screen pictures of everything that moves.
- From `packages/ds/src/primitives`: `Digits`, `BarProgress`, `Sparkline`,
  `StatusWord`, `FaultLine`.
- A **general page frame**, new as a separate piece: the 52 px header band
  with slots (logo, places, tools, look switch, status) and the page area.
  Today it is PTAH's `shell/Shell.tsx`, which hard-codes the PTAH mark with
  its four stripes and narrows at widths tuned to PTAH's places (1110, 1140,
  1240 px). The frame takes the mark and those widths as inputs; PTAH passes
  today's values, so its header renders the same. `shell/status.ts`, which
  knows PTAH's live and checklist states, stays in PTAH. The look switch
  moves with the frame. The hint line is not part of the frame: it is one of
  the 27 components and each screen places it, as today.

**Stays in PTAH** (`packages/ds`, which keeps its name `@ptah-app/ds`)

- PTAH's screens: `live/`, `perform/`, `show/`, `builder/`, `venue/`,
  `library/`, `debug/`, `settings/`.
- PTAH's own small pieces: `BlockMap`, `DmxValueBar`, `FixtureTile`,
  `GroupBadge`, `NoteChip`, `NoteStrip`, `UniverseGrid`.
- PTAH's header content (its logo with the four stripes, its places, its
  status) and `notesAs`, `effectsPrefs`.
- Their stories, tests and screen pictures.

If a piece listed as "moves" turns out to need something of PTAH's, it stays
in PTAH and the builder records it. The rule is the dependency, not the list.

ZENITHALL has no logo. Each app brings its own mark.

### Ties to cut

- `primitives/_shared/format.ts` imports PTAH's `notesAs`, and `BarProgress`
  uses that file. The file is split: the general formatting moves with
  `BarProgress`; the part that needs note names stays in PTAH. If
  `BarProgress` itself turns out to need note names, it stays in PTAH.
- The command palette's hotkey, the look switch, a dialog story and test, and
  Storybook's preview import PTAH's `mode.ts`. They are pointed at the base
  layer's look switch. PTAH's `mode.ts` keeps one job: carrying a choice
  stored under the old `ptah.ds.mode` keys over to the new ones. That
  carry-over is PTAH's and stays in PTAH.
- PTAH's screens import helpers from `components/_shared` about 80 times
  (`cx`, `cells` and its CSS, `useWholeWhenCut`, `plainClick`, `trigger`).
  These become public names of the library, on one helpers entry point. PTAH
  imports them from there; no copy stays in PTAH.

## The library

- **Name and version:** `@md4/zenithall`, starting at `1.0.0`, private,
  `UNLICENSED`. The fonts keep their SIL Open Font licences in the package.
- **Entry points** (the builder fixes the exact list; these must exist):
  - the React components, all from the root and each on its own path
    (`@md4/zenithall/Button`), as `@ptah-app/ds` offers today;
  - the base layer without React (`tokens`, the look switch, the gates), so a
    plain page can still use it;
  - the stylesheets: the base alone, the tokens alone, and one sheet with the
    base plus every component's CSS;
  - the fonts.
- **React** is a peer dependency (`^19`), optional for someone who uses only
  the base layer.
- **Dependencies:** only what the moved code imports (Base UI, lucide,
  TanStack Virtual), at the exact versions PTAH pins today.
- **Tooling:** the same as PTAH's packages (pnpm, TypeScript, Vite library
  build, Vitest, Storybook, Biome). Some of PTAH's dev tools are written with
  a caret today; in the new repository every one is pinned exactly, at the
  version PTAH's lock file resolves.
- **Stylesheet order.** Today one sheet, `ds.css`, carries the base and the
  components' CSS first and PTAH's screens' CSS after, and some screens
  restyle a component at equal weight, so the order decides the look. That
  order is kept: PTAH's `ds.css` stays one sheet, built with ZENITHALL's full
  sheet first and PTAH's own CSS after it. The app still loads one sheet.
- **Storybook** runs on its own port, away from 6006–6008.
- **Screen pictures:** the general boards move with their Mac baselines, byte
  for byte. The harness that compares them is one script with one list of
  stories for both sides; each repository gets its copy with its own list.
  The performance and burst checks point at PTAH's screens and stay in PTAH.
  ZENITHALL keeps Mac baselines only: the Linux baselines are made on GitHub,
  where a private repository's minutes are limited. PTAH's Linux baselines
  keep covering PTAH's screens, which use every general component.

## Releases

- One command on the owner's Mac makes a release: it runs the checks, builds,
  and creates a tag `vX.Y.Z` whose commit contains the built files, then
  pushes the tag. Main never holds built files. It does not depend on
  GitHub's checks.
- Version numbers: a fix is a patch; anything visible or added is a minor; a
  removed or renamed name is a major.
- The apps pin the exact tag. Installing must build nothing: pnpm 9 runs a
  `prepare` script on a dependency fetched from git, so the tagged
  `package.json` has no `prepare`, `install` or `postinstall` script.
- No tool enforces the 14-day rule today (pnpm 9 has no setting for it); it
  is kept by hand. The exception for `@md4/zenithall` is written down in each
  repository's notes for agents.
- ZENITHALL's own GitHub checks stay small (types, unit tests): a private
  repository's minutes are limited, and the full check runs on the Mac.

## PTAH after the move

- `packages/zenithall` is gone. `packages/ds` holds PTAH's screens and own
  pieces and depends on `@md4/zenithall` at an exact tag.
- `@ptah-app/ds` keeps re-exporting the general names it exports today, so
  `apps/web` changes as little as possible.
- The window (`app/`) depends on the base layer directly: its build copies
  `base.css`, `tokens.css` and the fonts out of `packages/zenithall/dist` and
  one of its tests reads the tokens' source file. After the move it takes
  these from the installed library's entry points, and builds nothing of
  ZENITHALL's.
- Every other place that names `@ptah-app/zenithall` is updated: the
  `allcheck` script and its serial variant, the release workflow,
  `scripts/make-app.sh` and the README.
- PTAH's Storybook keeps its screens; the general components are in
  ZENITHALL's Storybook.
- A "try before release" mode: PTAH (and later IHY) can point at
  `~/projects/zenithall` on this Mac to see a change before a release. It is
  off by default and can never reach a commit by accident (a check fails when
  it is on).
- `allcheck` still passes and still covers everything it covers today.

## Proof that nothing changed

- PTAH's screen pictures are compared against their existing baselines and
  must match **without updating a single baseline**. The same holds for the
  boards that move: ZENITHALL's first run must match the baselines brought
  from PTAH.
- `allcheck` green three times on PTAH, as at every checkpoint.
- The installed app is rebuilt from the result and walked: every place opens,
  the looks switch with F2, a dialog and a menu open.
- The frame is separated inside PTAH first, while everything is still in one
  repository and the pictures can prove it, and only then moved.

## The owner's part

- Done: asked for the repository; it exists and is private.
- Before PTAH's or IHY's GitHub checks and release builds can run: create one
  read-only access key for `MD4/zenithall` and store it as a secret in
  `MD4/ptah-v2` (and later `MD4/ihy`). Claude prepares the exact steps and
  never handles the key. This joins the existing list for the first public
  release (GitHub's checks are already stopped by the spending limit).
- At the checkpoint: look at ZENITHALL's Storybook, look at PTAH, give the
  merge word.

## Left to the builder

- The exact folder layout and entry-point list of the library.
- How the frame's slots and width inputs are named, as long as PTAH's header
  renders the same at every width.
- How the release command builds the tagged commit, and how the
  "try before release" mode is switched.
- Which helper scripts are copied and which stay.
- Where the written exception to the 14-day rule lives in each repository.

## Calls made by Claude, for the owner to check

- The frame is part of this step (IHY's operator page needs it).
- The repository starts with a fresh history; the first commit names the
  PTAH commit the files came from.
- `@ptah-app/ds` keeps its name and keeps re-exporting the general names.
- The harness that compares screen pictures exists in both repositories.
- Releases are made from the Mac, not by GitHub.
- The helpers PTAH's screens share with the components become public names.
- ZENITHALL's screen pictures are checked on the Mac only, not on Linux.
- PTAH keeps one stylesheet, with ZENITHALL's CSS first.

A builder's read of this document (2026-11-25) raised eight questions and
seven corrections; all are answered above and none needed the owner.
