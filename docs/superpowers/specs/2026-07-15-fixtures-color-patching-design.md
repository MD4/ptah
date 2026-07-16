# Fixtures & Color Patching — Design

- **Date:** 2026-07-15
- **Status:** Approved (brainstorming), implementation in progress
- **Branch:** `feat/fixtures-color-patching`
- **Target release:** `0.4.0`

## Problem

PTAH patches raw DMX channels. There is no fixture or color concept anywhere in
the engine: driving one RGB par means hand-wiring 3 separate program outputs to
3 channels, and a 4-par color wash is 12 wires plus manual math nodes. The
patch UI also only renders 64 of the 512 channels (`Array(64)` in ui-admin's
`patch.domain.ts`), so channels 65–512 are unreachable.

Goal: patch *lights*, not channels — "RGB Par @ ch 1–3", wire one color output
to its color capability, done.

## Decisions (locked)

| Decision | Choice |
| --- | --- |
| Fixture profiles | **Built-in constants in `lib-models`** (Dimmer, RGB, RGBW, RGB+Dimmer, RGBW+Dimmer). A profile is an ordered list of channel roles (`dimmer/red/green/blue/white/generic` + label) — exactly an Open Fixture Library "mode", so OFL import can come later without a shape change. No REST endpoint (ui-admin imports lib-models). |
| Fixture instances | **Per-show**: `show.fixtures = [{id, name, profileId, startChannel 1..512}]`. Universe overflow (`start + len − 1 > 512`), unknown profile and duplicate ids are schema errors; address *overlaps* are allowed (UI warning only). |
| Patch model | **Array of typed connections** replacing the channel-keyed record: `{programId, outputKind: "scalar"\|"color", outputId, fixtureId, capability}` where capability is `{type:"dimmer"} \| {type:"color"} \| {type:"channel", channelIndex}`. Invalid pairings (color output → dimmer capability) are unrepresentable. Fan-in/fan-out = multiple entries. |
| Color programming | New **`output-color` node** `{outputId, mode: "rgb"\|"hsv", valueA/B/C 0..1}` with 3 wireable inputs. Colors always flow as post-conversion RGB (`{r,g,b}` 0..1) in a new `ProgramOutput.colors` namespace, separate from scalar `outputs`. |
| Runtime approach | **Compile-to-channels** — fixtures + capabilities resolve to physical channel addresses once at show load (`compileShowPatch`), producing `PatchMapping = {scalar: Record<outputId, channel[]>, color: Record<outputId, {r,g,b channel}[]>}`. The per-tick runner and DMX path stay scalar and untouched (`runner.service.ts`: zero changes). |
| Legacy shows | **0.4.0 migration**: each used channel key becomes a 1-channel "Channel N" Dimmer fixture with its legacy entries rewired to the dimmer capability. Compiles to the identical scalar mapping → byte-identical DMX output. Out-of-range channel keys (never emitted light — driver buffers are 513 bytes) are dropped. |
| Out of scope (phase 1) | OFL import, custom profile editor, HTP merge, pan/tilt semantics, color pickers, dashboard live color swatches (severable follow-up). |

## UI

- **Patch page** becomes a fixture rack: fixture nodes with one target handle
  per capability (color handles visually distinct), add/edit via a modal
  (profile select with channel-layout preview, next-free-address suggestion,
  non-blocking overlap warning), deletion behind a `Popconfirm`. The
  64-channel cap disappears with `getAllChannelsNodes()`.
- **Program editor** gains the `output-color` node with a live color-strip
  preview (analog of the existing sparkline, fed by `ProgramOutput.colors`).
- **Connection validation**: color↔color, scalar↔scalar only
  (`isValidPatchConnection`), plus edge sanitizing on load.
- **Dashboard** renders the fixture rack (whole rig) instead of raw channels.
- outputId numbering stays a single shared sequence across both output node
  types so ReactFlow source-handle ids stay unique per program node.

## Implementation plan

See the sequenced, file-by-file plan (8 conventional commits, tests per
package, risks incl. `feat/node-input-audio` overlap) in the session plan;
key files: `packages/lib-models/src/show-patch.model.ts` (new shape),
`packages/lib-domains/src/patch.domain.ts` (`compileShowPatch`/`applyMapping`),
`packages/lib-shared/src/migrations/show.migrations.ts` (0.4.0 migration),
`apps/service-main/src/services/patch.service.ts` (compile entry point),
`apps/ui-admin` patch page + program editor.
