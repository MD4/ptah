# PTAH V2 — Step 2: the design system

- **Date:** 2026-11-09
- **Status:** Draft for the owner's approval (brainstorming output)
- **Parent:** `2026-10-25-v2-master-plan.md` §4.4 (UI direction) and Step 2.
- **Repository:** `~/projects/ptah-v2`, a new pnpm package `packages/ds`.
- **Consumers:** Step 3 (the app), Step 4 (debug mode), Step 5
  (visualizer). None of them starts before this document's exit criteria.

## 1. Intent

The band runs shows in dark rooms from a laptop at the side of the stage
and, later, from a phone. The screens they glance at mid-set must be read
in one look and must never compete with the lights. The screens they edit
on (venue, show, builder) must be fast and exact. Both are built from one
set of parts, so the whole app feels like one instrument.

The owner chose the look in a brainstorm on 2026-11-09 from nine
directions: **C1 "Strict"**, with V1's violet kept as the single accent.
The owner's standing requirement: a beautiful, smooth and elegant UI/UX.
This document turns that into rules a builder can test against.

## 2. Goals, non-goals, anti-goals

**Goals**

- A token set and a component library in code, in `packages/ds`, that the
  Step 3 screens are assembled from without inventing new visual rules.
- Legible from a metre away on a dark stage; usable with a thumb on a phone.
- Smooth: live values update at the stream's rate without jank or layout
  shift; motion is short, purposeful and consistent.
- Elegant: few elements, exact alignment, one accent, nothing decorative.
- Storybook as the living catalog, every component in normal and stage mode.
- Accessibility for dark rooms checked by machines in CI, not by eye.

**Non-goals**

- No app screens (Perform, Venue, Show, Builder, Settings are Step 3); the
  Perform mockups of the brainstorm were material to judge the look, not a
  design of that screen.
- No light theme. The stage mode is a dimmer dark, not a theme.
- No Figma. Storybook is the source of truth (master plan §4.4).
- No visualizer rendering (Step 5) and no debug-mode widgets (Step 4),
  beyond the primitives listed here that they will reuse.

**Anti-goals** (a failure even if everything works)

- A component that needs a colour the token set does not have.
- Any colour on a live screen that is not a light, a fault, the accent or
  grey.
- A value that shifts its neighbours when its digits change.
- An animation that exists to look nice rather than to show a change.
- Ant Design or any other styled kit (master plan §4.4: "No Ant Design").

## 3. The look, as rules (decided by the owner)

1. **Ground**: pure black `#000`. Type: pure white `#fff`. Two greys only:
   `dim` for secondary text and labels, `line` for hairlines. Exact values
   are the builder's within the contrast rules of §9.
2. **Colour** appears only where it means something: a fixture's real
   output colour; red for a fault; the **accent, V1's violet `#4c2bf0`**,
   for the interface's own state. Nothing else is coloured.
3. **The accent** marks focus, selection, the primary action and progress.
   It never carries data. On a live screen it appears in two places at
   most: the progress ruler and the focused control. *(Author's call,
   from the builder check.)* `#4c2bf0` on black is 2.9:1, under the 3:1
   the gates ask of thin marks, so the accent has two forms: `--accent`
   (`#4c2bf0`, the owner's colour) for **fills that carry white text**
   (primary button, selected row, 7.2:1), and `--accent-line`, a lighter
   derived shade (about `#7c63ff`, ≥ 3:1 on black) for **thin marks**:
   the focus ring, the progress fill, the selection outline. Hover and
   active shades derive from `--accent`; V1's hover was `#6d4fe5`.
4. **The active state of a toggle** (Blackout, House, Freeze) inverts:
   white ground, black text. So an "on" toggle and a focused control never
   look alike.
5. **Structure**: a visible **40 px module grid**; regions are separated
   by 1 px hairlines in `line`, never by filled boxes, shadows or borders
   with radius. Corners are square (radius 0) everywhere.
6. **Type**: one sans, **Inter**, in two voices: labels in small uppercase
   with wide tracking (11 px, 2 px tracking) and values in plain case;
   numbers are tabular (`font-variant-numeric: tabular-nums`) so they
   never shift. Raw data (hex, DMX bytes, ids) in the system monospace.
7. **Motion**: only to show a change of data or state, 80–200 ms, one
   easing curve, never looping; respects `prefers-reduced-motion`.
8. **Elevation**: none. No shadows, no blur, no glow (C1 is flat; the
   fixture tile shows its colour as a flat fill).
9. **Stage mode**: the same screen at a lower brightness. The owner's
   rule is "lower brightness, same screen". *(Author's call on the
   numbers.)* The tokens are generated per mode, not multiplied at run
   time: in stage mode `--fg` is about `#999` (5.9:1 on black), `--fg-dim`
   about `#777` (4:1), `--line` about `#161616`, `--accent-line` is held
   at its 3:1 floor, `--accent` fills dim to the same ratio as `--fg`;
   lights and `--fault`/`--warn` keep full value so they stay the
   brightest things on the screen. An inverted toggle in stage mode is
   black on `#999`. The contrast gates of §9 have a stage-mode column
   with its own thresholds. Toggled by one key and from the status
   region; remembered per device.

## 4. Tokens (`packages/ds/tokens`)

Tokens are CSS custom properties on `:root`, generated from one TypeScript
source so the app, Storybook and tests read the same values. Names are
semantic, not literal.

| Group | Tokens (exact names the builder uses) |
| --- | --- |
| colour | `--bg`, `--fg`, `--fg-dim`, `--line`, `--accent` (fills), `--accent-line` (thin marks, §3.3), `--accent-hover`, `--accent-active`, `--fault`, `--warn` (amber, faults of severity warning only), `--on-bg` (text on an inverted/active surface) |
| stage mode | a `data-mode="stage"` attribute on `:root` switches a second generated set of `--fg`, `--fg-dim`, `--line`, `--accent`, `--accent-hover`, `--accent-active`, `--accent-line`, `--on-bg` (values in §3.9); `--fault`, `--warn` and light colours do not change |
| grid | `--unit: 40px`; spacing `--s1 … --s6` = 4, 8, 12, 16, 24, 40 px |
| type | `--font-sans` (Inter, system fallback), `--font-mono`; sizes `--t-label` 11, `--t-body` 13, `--t-value` 16, `--t-big` 22, `--t-display` 34; weights 400/500 only; `--track-label: .18em` |
| line | `--hair: 1px` |
| motion | `--m-fast 80ms`, `--m-mid 120ms`, `--m-slow 200ms`, `--ease: cubic-bezier(.2,.8,.2,1)` |
| focus | `--focus: 0 0 0 2px var(--accent-line)` (an outline, drawn inside the hairline grid) |
| targets | `--tap: 44px` (minimum touch target on pointer: coarse) |

There is no radius token and no shadow token on purpose.

## 5. Primitives (domain components, `packages/ds/primitives`)

The ones the master plan names, with the behaviour the engine's API makes
possible (`docs/api.md`, `docs/engine.md` in V2). Each takes plain props;
none opens a socket itself.

*(Author's calls, from the builder check.)*

- **Two layers.** The primitives of this table are pure: they take values
  (a colour, a bar number, a byte) and render. `packages/ds/live` holds
  the engine-facing layer: `useStream(topic)`, the 532-byte `frames`
  decoder, and `Live*` wrappers (`LiveUniverseGrid`, `LiveFixtureTile`,
  `LiveDmxValueBar`) that subscribe, decode and write into the pure
  primitive through refs at frame rate. §7's "refs/rAF, not React state
  per frame" rule applies to the `Live*` wrappers.
- **DMX bytes to a fixture colour** is a pure function in `ds/live`,
  `fixtureColor(frame, fixture, fixtureType)`, over the Step 0 model
  (`schemas/`): RGB, RGBW, RGBA, RGBAW+lime are mixed to sRGB with
  intensity applied; colour temperature maps to a warm-to-cool white;
  UV shows as a fixed violet-black swatch; a colour wheel shows the
  slot's named colour if the type names one, else a neutral grey with a
  wheel glyph; fine channels are ignored for the swatch. Luminance decides
  the name's colour on the tile.
- **Bars, time signature, sections and markers are not in the Step 1
  API** (`clock` has beat, run beat and tempo; `state` has the song).
  Step 2 does not add engine or API features. `BarProgress` and
  `TimelineRuler` take bar, beat, signature and markers as props; the
  stories derive them from the fixture MIDI file's tempo map and a 4/4
  default. Computing them live (from `runBeat` plus a per-song time
  signature) is Step 3's, and an API addition if Step 3 wants it from
  the engine; that is noted in the master plan's Step 3 inputs.

| Primitive | Shows | Data | Rules |
| --- | --- | --- | --- |
| `DmxValueBar` | one channel's 0–255 as a horizontal hairline bar with the number | a byte | tabular number right-aligned; bar height 2 px; no animation (values move at frame rate) |
| `FixtureTile` | a fixture as a square of its live colour with its name | colour (from the frame's RGB/intensity), name, selected, faulted | unlit = `--bg` with a hairline; lit = flat fill, name in `--on-bg` or `--fg-dim` by luminance; selected = accent outline; faulted = red hairline |
| `UniverseGrid` | 512 cells of a universe | a 512-byte frame (`frames` topic, 532 B binary) | 32×16 cells on the grid; a cell's grey is its value; hover/focus shows the number; overlaps (venue screen) in red |
| `Sparkline` | the last N values of a metric | a ring of numbers | hairline polyline, no axes, last value as a number; N and the window are props |
| `NoteChip` | a MIDI note or CC as a label (`C3`, `CC 2`, `PC 4`) | kind, number, channel, device | monospace, hairline outline; "unmapped" variant in `--warn` |
| `GroupBadge` | a group name with its member count | name, count, colour-less | label voice; selected = accent |
| `TimelineRuler` | bars and beats across a width, with the play head | tempo map segment, position, markers | hairline ticks on the grid; the play head is the accent; markers are labels |
| `BarProgress` | the live bar ruler of the Perform header | bar, beat, bars in section | accent fill; tabular `041.2` |
| `FaultLine` | one fault | code, subject, severity, count, since | red or amber dot + text; cleared = `--fg-dim` |
| `StatusWord` | a single state word | `locked` / `free-run` / `stopped` / `internal`, `rt yes/yes`, `deg 0` | fixed width per word so the line never reflows |

## 6. Components (generic, `packages/ds/components`)

Built on **Base UI** (`@base-ui-components/react`) for behaviour, focus
management and ARIA, with every pixel styled by our CSS: Button (default,
primary = accent, toggle = inverting), IconButton, Toggle, Slider (fader,
touch-sized), NumberField (with keyboard step and drag), TextField, Select,
Combobox, Tabs, Table (virtualised rows, hairline grid, sticky header,
keyboard row navigation), Dialog, Popover, Tooltip, Toast (for faults and
acks), CommandPalette (keyboard-first, as master plan §4.4 asks), Menu,
Kbd, Label, StatusRegion (the top bar skeleton), Panel (a grid region
with a hairline), EmptyState.

Rule from the master plan: "performance screens show state and never
forms; editing screens are tables by default; a canvas only where the
thing edited is a graph". The components encode it: Table is the default
editing surface; form controls exist for dialogs and settings.

Icons: Lucide, stroke 1.5 px, 16/20 px, `currentColor`. No filled icons.

## 7. Smooth and elegant, as tests

- **No layout shift**: every live value renders in a fixed-width slot
  (tabular numbers, `StatusWord` widths, reserved fault lines). A
  Storybook interaction test flips every live story through its states
  and asserts no element's box moves.
- **Frame-rate updates without jank**: the `Live*` wrappers update
  through refs/`requestAnimationFrame`, not React state per frame.
  Budget: the `frames` topic at 20 Hz (the debug rate) costs under 2 ms
  of main-thread time per frame on a 2020 MacBook Air. *(Author's call
  on how it is proven.)* In CI the perf story measures a **relative**
  figure, the frame cost against a baseline measured in the same run
  (a fixed DOM diff of the same size), and gates at 1.5× the baseline;
  the absolute 2 ms is a **manual check** on the owner's laptop recorded
  in the plan's ledger, as the Pi budget was in Step 1.
- **Motion**: transitions only on state changes (toggle, selection,
  focus, open/close), using the three durations and one easing; a lint
  rule (Biome custom or a CSS test) rejects other durations and any
  `animation` with `infinite`.
- **Density and alignment**: every component's bounding box snaps to the
  4 px scale and regions to the 40 px grid; a visual regression story
  shows the grid overlay.
- **Elegance review**: the final whole-branch review of each Step 2 plan
  includes a design pass against §3 with the brainstorm's C1 mockup as
  the reference (`.superpowers/brainstorm/34309-1794259534/content/grid-variations.html`,
  kept as `docs/design/c1-reference.html` in the V2 repo).

## 8. Storybook

- Storybook 8+, Vite, React 19, TypeScript strict, Biome (no ESLint, no
  Prettier, as the rest of the repo).
- One story per component and primitive, each with a **normal / stage**
  toolbar switch and a **phone (390 px) / laptop (1280 px)** viewport
  switch; live primitives have a story fed by a **recorded WebSocket
  session**. *(Author's call.)* 2C adds `scripts/record-ws.sh`, which
  runs `ptah run --fake-io` on the synthetic rig show the engine tests
  already use, subscribes to every topic for 30 s, and writes one JSONL
  of timestamped messages (frames base64) to `packages/ds/fixtures/`
  (a few MB, committed). Stories replay it with a fake clock. The
  HILLDALE material stays out of the Storybook build: the assembled
  Perform page uses the synthetic recording in CI, and HILLDALE live on
  the owner's laptop for exit criterion 4.
- Addons: a11y (axe), interactions, viewport, measure/outline (the grid).
- Published from CI as a static site artifact (no hosting decision here).

## 9. Accessibility for dark rooms (CI gates)

- Contrast, normal mode: `--fg` on `--bg` ≥ 7:1; `--fg-dim` ≥ 4.5:1;
  labels on an inverted surface ≥ 7:1; `--accent-line` on black ≥ 3:1;
  text on `--accent` ≥ 4.5:1.
- Contrast, stage mode: `--fg` ≥ 4.5:1; `--fg-dim` ≥ 3:1; labels on an
  inverted surface ≥ 4.5:1; `--accent-line` ≥ 3:1; `--fault` and `--warn`
  unchanged (≥ 4.5:1). Both columns are a 2A CI gate over the generated
  token files.
- Targets: every interactive element ≥ 44×44 px at `pointer: coarse`.
- Focus: visible on every interactive element, keyboard order follows
  the grid; the command palette reachable with one chord; Esc closes.
- `prefers-reduced-motion` removes all transitions; `prefers-contrast:
  more` raises `--fg-dim`.
- axe in Storybook's test runner with zero violations as a CI gate.

## 10. Package and tooling

- `packages/ds` (`@ptah-app/ds`): `tokens/` (TS source → `tokens.css` +
  typed `tokens.ts`), `primitives/`, `components/`, `live/` (the stream
  hook and the binary `frames` decoder), `stories/`, `test/`.
- Build: Vite library mode (ESM), `exports` per entry, CSS shipped as one
  file plus per-component modules; CSS Modules for component styles,
  tokens as custom properties.
- Tests: Vitest + Testing Library for behaviour; Storybook test-runner
  (interactions + axe) for the catalog; Playwright screenshots for the
  visual regression stories (committed baselines, macOS and Linux).
- Gates join `pnpm allcheck`; CI runs them on ubuntu and macOS as today.
- The engine serves the app later through `--static-dir` /
  `settings.staticDir` (Step 3); Storybook is not served by the engine.

## 11. Constraints

- Master plan §7 constraints apply (no V1 refactoring on V2's behalf; the
  V2 repo's conventions: Biome, strict TS, pnpm 9.15.4, Node ≥ 20).
- No dependency with its own styling opinion (Base UI is unstyled; Lucide
  is icons only). No CSS-in-JS runtime.
- Bundle: the design system's CSS ≤ 40 KB gzipped; no web font beyond
  Inter (self-hosted, two weights).

## 12. Exit criteria

1. `packages/ds` publishes tokens, the ten primitives and the generic
   components of §6, each with stories in both modes and both viewports.
2. The CI gates of §7 and §9 run green on ubuntu and macOS.
3. A Storybook page "Perform, assembled" composes the primitives into the
   C1 live screen of the brainstorm, fed by the recorded synthetic
   stream, and matches the reference by eye in the final review.
4. The owner opens the Storybook on the stage laptop in the dark, flips
   stage mode, and says it reads.

## 13. Left to the builder

- Exact grey values, Inter's loaded weights, the accent's derived shades.
- The binary `frames` decoder's API shape and the `useStream` hook's
  reconnection behaviour (follow `docs/api.md`: 532-byte frames, bounded
  outboxes, the `state` topic for epoch).
- The Table's virtualisation library (or none) and the CommandPalette's
  matching rules.
- How the visual regression baselines are refreshed (a script, not by
  hand).

## 14. Order of plans

Three plans, each ending in something the next can use:

- **2A Foundations**: the package, tokens, stage mode, type, the grid,
  Storybook with the two switches, the a11y and motion gates in CI.
- **2B Components**: the generic set of §6 on Base UI, Table and
  CommandPalette last.
- **2C Primitives and the assembled Perform page**: the ten primitives,
  the stream hook and frames decoder, the recorded-stream stories, the
  "Perform, assembled" page, the no-layout-shift and perf gates.

Step 7's packaging of the headless engine may run in parallel; Step 3
starts after 2C's exit.
