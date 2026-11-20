# Redesign: items deferred by plan 1's final review

Plan 1's final review (2026-11-19) assigned these small items to later plans. Each plan takes its own lines into a task; plan 7 takes the rest. An item is struck out here when its plan merges.

## Plan 2 (Live)

- ~~Changing numbers jitter outside BarProgress, the Settings offset and the Why panel: Chakra Petch has no tabular figures. On Live: BPM, latency values, "3 s" ago, "For 14 min", counts. `FaultLine`'s `ch` reservations assume a mono face.~~ (done in plan 2)
- ~~`HeaderStatus`: in square mode the text is an `aria-label` inside the live region and may not be announced on change; in text mode the 120 px slot cuts a longer text with no tooltip.~~ (done in plan 2)
- ~~`SQUEEZE` thresholds (1240 / 1140 / 1110) were tuned by hand with no status text. Add edge plays with the real texts.~~ (done in plan 2)
- ~~Arrow keys on the look switch pass through Light on the way from Dark to Stage.~~ (done in plan 2)
- ~~`NoticeLine` cuts its sentence with an ellipsis and offers no full text.~~ (done in plan 2)
- ~~Panel title weight is 500; the spec says 400.~~ (done in plan 2)
- ~~Panel always renders `<h2>`.~~ (done in plan 2)
- ~~`mode.ts`: `readBase` trusts storage over memory; with a stored `light` and no stored base, Stage then F2 returns to dark.~~ (done in plan 2)
- ~~`setDigits` rebuilds every cell on each write.~~ (done in plan 2)
- ~~A sand Panel in stage has no boundary: the fill is dropped and nothing outlines it. (Moved here from plan 3: Emergency is the first sand panel.)~~ (done in plan 2)
- ~~Five tests fail under load and pass alone: e2e `perform.spec.ts:116`, unit `useLookBack` L6, unit `show/page.test.tsx` I3~~ (done in plan 2: steadied in T1). Left: e2e `scroll.spec.ts:175` and Storybook Show/Dialogs merge (axe) were not reproduced in plan 2 T1 (no failure in 10 runs under load, nor with the page throttled); kept for plan 7, to chase only if they fail again.

## Plan 3 (Show)

- A picked row with a fault: the fault stripe on sand is about 1.7:1 in dark. Consider an `--on-sand` gap beside the stripe.
- A picked row loses its "need" stripe.
- `ConfirmToneContext` reaches every primary button under a danger Dialog, not only the confirm.

## Plan 5 (Lights)

- Venue "Add universe" overflows its cell.
- `/lights/venue` with no id shows "Not yet.".

## Plan 6 (Inspect and Settings)

- Changing numbers on Inspect (frames/s, ages) need `Digits`.
- The Debug current line reads dim words as full ink.
- Why panel values lose the ellipsis.

## Plan 7 (Close)

- The header between 600 and about 1000 px scrolls sideways with the scrollbar hidden (iPad portrait).
- `Explain` cannot be opened by touch, and its tooltip says the word twice.
- Duplicate CSS assertions in the tokens and build tests; the `gates.ts` `startsWith("#")` cast; `HATCH_VALUE` anchors only the prefix.
- Digits' hidden text uses 1px literals.
- Tabs' disabled rule uses `--fg-dim`.
- No test for "the caller's aria-keyshortcuts wins"; the `+` hotkey; an orphan docs line.
- The badge loses 1 px on touch.
- No test for Back onto an old address while a page has unsaved changes.
- The routes test uses `toContain` for Settings.
- Story ids still say "Normal".
- Old accent controls have no hover feedback until the aliases are retired.

## Dropped

Aliases emitted as literals; `setMode("stage")` recording the base; the Choice `key` for object values; `applyRedirect` in a `useState` initializer; `/venue?q=…#x` losing its query; the header overflow at 1280 (fixed by the addresses task).
