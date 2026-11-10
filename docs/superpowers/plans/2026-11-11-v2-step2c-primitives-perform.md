# V2 Step 2C — Primitives, the live layer and the assembled Perform page: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The ten domain primitives of spec §5, the engine-facing live
layer (`useStream`, the 532-byte `frames` decoder, `fixtureColor`, the
`Live*` wrappers), a committed recording of the synthetic rig's WebSocket
session that feeds the stories, the no-layout-shift and frame-cost gates,
and the "Perform, assembled" Storybook page that composes it all into the
C1 live screen in both modes and both viewports.

**Architecture:** Two layers. `packages/ds/src/primitives/<Name>/` are
pure: props in, pixels out, no sockets, no timers (same folder shape as
2B's components). `packages/ds/src/live/` talks to the engine: a
`StreamSource` abstraction with a WebSocket implementation (reconnecting,
subscribe protocol of `docs/api.md`) and a replay implementation reading
the committed JSONL recording on a fake clock; `useStream` for the text
topics (small, ≤ 20 Hz: React state is fine) and `useFrames` for the
binary `frames` topic (refs + one `requestAnimationFrame` per paint, never
React state per frame). `Live*` wrappers bind the two. The Perform page is
a story, not an app screen: Step 3 copies its composition. Gates reuse the
2B harness: `storybook-server.mjs`, the axe test-runner, `test-visual.mjs`
(screenshots + tap gate) gains a frame-cost pass; the no-layout-shift
check is a Storybook interaction test over the live stories.

**Tech Stack:** React 19, TypeScript 5.9 strict, CSS Modules via Vite 6,
Storybook 8.6.19 (+ `@storybook/test` already installed), Vitest 3 +
Testing Library 16, Playwright 1.59.1, Biome, pnpm 9.15.4, Node ≥ 20.11.
No new runtime dependency. The recording is made with the Rust engine
(`cargo build --release -p ptah`) once, by the implementer, and committed.

**Spec:** `docs/superpowers/specs/2026-11-09-v2-step2-design-system-design.md`
(§5 primitives and the two-layer call, §7 smooth/elegant tests, §8
Storybook incl. the recorded session, §9 gates, §12 exit criteria 1, 3, 4,
§13, §14: this is plan 2C). Engine facts come from the V2 repo's
`docs/api.md` (topics, the `frames` layout) and `docs/engine.md`
(`VoiceView`, `Fault`, timers, `Overrides`, CLI flags). The look is
`docs/design/c1-reference.html` (the C1 card: 56 px top bar, stage area on
the grid with 80 px tiles, a 240 px side column of key/value lines, a 56 px
bottom bar with active voices and the override strip).

## Global Constraints

- Repo `~/projects/ptah-v2`, branch `step2c-primitives-perform` off
  `master` (≥ `step2b-complete`, 81db6a1). Package `packages/ds`; Biome only
  (2 spaces, 80 columns, double quotes); strict TS; prose ≤ 80 columns.
- Styling only through tokens: colours `--bg --fg --fg-dim --line --accent
  --accent-hover --accent-active --fault --warn --on-bg --on-accent`;
  radius 0; no `box-shadow` except `var(--focus)`; no `filter`, no
  gradients (the grid overlay in `base.css` is the one exception and is
  2A's); hairlines `var(--hair) solid var(--line)`; motion only
  `var(--m-fast|--m-mid|--m-slow)` with `var(--ease)` and only on state
  changes; `.t-*` voices or `--t-*` sizes; tabular numbers; interactive
  targets ≥ `var(--tap)` under `pointer: coarse` (`.tap`). The rules test
  (`src/components/_shared/__tests__/rules.test.ts`) already scans
  `src/**/*.css`; it must stay green with every new module.
- Live colour is the one place real colour appears: a lit `FixtureTile`
  and a `UniverseGrid` cell's grey are set as inline `style` custom
  properties (`--tile`, `--cell`) from JS, never as literals in CSS.
- Every primitive: a CSS module, `Normal` and `Stage` stories (phone and
  laptop via the toolbar), a Testing Library test, axe-clean in both
  modes, `data-component="<Name>"` on its root, exported from
  `src/index.ts` and from the new `@ptah-app/ds/primitives` and
  `@ptah-app/ds/live` subpaths (Task 1 adds them to the `exports` map; the
  2B exports-map test must keep passing).
- Live stories are fed by the committed recording
  `packages/ds/fixtures/synthetic-ws.jsonl` (Task 7) through the replay
  source on a fake clock: deterministic, no network in CI. HILLDALE
  material never enters the Storybook build (the live variant reads
  `VITE_PTAH_WS` at runtime and is excluded from the static build).
- No React state per frame: anything driven by `frames` writes DOM
  through refs inside one `requestAnimationFrame` callback per paint.
- Dependencies: none added. If a task finds one unavoidable, it stops and
  reports (the ≥ 14-days rule and exact pins apply).
- Gates stay in `pnpm allcheck` (2B's plus the frame-cost pass inside
  `test:visual`; the no-layout-shift interaction tests run inside
  `test:storybook`).

## Review Focus

1. The socket drops mid-song: values must not freeze silently. Within
   1 s without a message every `Live*` surface shows its stale state
   (`StatusWord` `stale`, tiles keep colour but the header's clock word
   reads `stopped`/`stale`) and the source reconnects at 1 s doubling to
   10 s. Pinned in Task 6 (`WebSocketSource` reconnect test with a fake
   socket) and Task 8 (`useFrames` stale flag test with fake timers).
2. A patch that does not fit: a fixture whose `address + channelCount − 1`
   exceeds 512, or a `frames` message for a universe the venue does not
   list. `fixtureColor` reads only the bytes that exist (missing bytes
   are 0) and `LiveUniverseGrid` ignores unknown universes. Pinned in
   Tasks 3 and 8.
3. Intensity semantics: RGB at 255 with `intensity` 0 is unlit; a type
   without an `intensity` channel is lit by its colour channels alone;
   `fineOf` channels are ignored. Pinned in Task 3.
4. A long show on a phone: 64 fixtures and three universes must not push
   the header or side column off the grid; the stage area scrolls, the
   chrome does not. Pinned in Task 11 (phone viewport story + the visual
   baseline) and by the tap gate on the override strip.
5. A fault storm in the side column: `FaultLine` entries have a fixed
   height and the column reserves three lines, so new faults never move
   the status words. Pinned in Tasks 1 and 9 (no-layout-shift test flips
   zero → three → zero faults).

---

### Task 1: Primitives scaffolding, subpaths, StatusWord, NoteChip, GroupBadge, FaultLine

**Files:**
- Create: `src/primitives/{StatusWord,NoteChip,GroupBadge,FaultLine}/{<Name>.tsx,
  <Name>.module.css,<Name>.stories.tsx,<Name>.test.tsx,index.ts}`,
  `src/primitives/index.ts`, `src/live/index.ts` (empty barrel for now),
  `src/primitives/_shared/format.ts` (+ test)
- Modify: `src/index.ts` (re-export both barrels), `package.json`
  (`exports` `./primitives` and `./live`, entries in `vite.config.ts`),
  `src/__tests__/build.test.ts` (the exports-map check also accepts the
  two barrels), `.storybook/preview.tsx` only if a new global is needed
  (it is not)

**Interfaces:**
- Produces (`format.ts`): `noteName(n: number): string` (`0 → "C-1"`,
  `60 → "C3"`, `61 → "C#3"`; MIDI C3 = 60 as V1 displays it);
  `pad3(n: number): string` (`7 → "007"`); `barBeat(bar: number, beat:
  number): string` (`41, 2 → "041.2"`).
- `StatusWord` props `{ kind: "clock" | "rt" | "deg" | "output" |
  "stale"; value: string }`: renders `.t-label` uppercase text in a fixed
  width per kind (CSS `min-width` in `ch` units: clock 8, rt 10, deg 5,
  output 10, stale 5) so the line never reflows; `clock` values
  `locked | free-run | stopped | internal | stale`; `free-run` and
  `stopped` in `--warn`, `stale` in `--fault`, the rest `--fg`.
- `NoteChip` props `{ kind: "note" | "cc" | "pc" | "osc"; number?:
  number; address?: string; channel?: number; device?: string; unmapped?:
  boolean }`: `.t-mono` hairline outline, text `C3` / `CC 2` / `PC 4` /
  the OSC address, a `title` with channel and device; `unmapped` =
  `--warn` text and outline.
- `GroupBadge` props `{ name: string; count: number; selected?: boolean }`:
  label voice, count tabular; selected = accent outline.
- `FaultLine` props `{ code: string; subject?: string; severity: "error" |
  "warning" | "info"; count: number; since: string; active: boolean }`:
  one fixed-height line (`height: var(--unit)` at laptop, same at phone);
  a dot (`--fault` for error, `--warn` for warning, `--fg-dim` for info or
  cleared) + `code subject` + `×count` + `since`; cleared = `--fg-dim`
  text; `role="listitem"`.

- [ ] **Step 1: Write the failing tests** — `format` cases above;
  `StatusWord` renders the value, carries `data-kind`, and the module
  sets a `min-width` per kind (CSS text test); `NoteChip` texts for the
  four kinds and the `--warn` class when unmapped; `GroupBadge` shows
  `name` and `count` and `aria-pressed`-free (it is display only);
  `FaultLine` severity class, `×3` count, cleared class.
- [ ] **Step 2: Run to verify they fail**; **Step 3: Implement** (tokens
  only; `data-component`); stories `Normal`/`Stage` per primitive, the
  `StatusWord` story showing every kind in a row; **Step 4: Verify**
  `pnpm -F @ptah-app/ds test`, `test:storybook`, root `typecheck`,
  `check`, `format`, and `pnpm -F @ptah-app/ds build` (exports map);
  **Step 5: Commit** — `feat(ds): primitives scaffolding, StatusWord,
  NoteChip, GroupBadge, FaultLine`

### Task 2: DmxValueBar, Sparkline, BarProgress

**Files:** `src/primitives/{DmxValueBar,Sparkline,BarProgress}/…`.

**Interfaces:**
- `DmxValueBar` props `{ value: number; label?: string }` plus an
  imperative handle `DmxValueBarHandle { set(value: number): void }` via
  `forwardRef`/`useImperativeHandle`: a 2 px hairline bar whose width is
  `value / 255` (set through `style.setProperty("--v", …)` on the fill,
  no transition) and the number right-aligned, tabular, 3 digits
  (`pad3`); `role="meter"`, `aria-valuemin 0`, `aria-valuemax 255`,
  `aria-valuenow` updated by `set`. `set` writes the DOM directly (the
  live wrapper calls it at frame rate); the `value` prop is the initial
  and controlled value for static use.
- `Sparkline` props `{ values: readonly number[]; window: number; min?:
  number; max?: number; unit?: string; format?: (v: number) => string }`:
  an inline `svg` hairline polyline of the last `window` values scaled to
  `[min, max]` (default the window's own extent), no axes, the last value
  as text; handle `SparklineHandle { push(value: number): void }` that
  shifts the ring and rewrites the `points` attribute and the text
  without React (ring kept in a ref).
- `BarProgress` props `{ bar: number; beat: number; beatsPerBar: number;
  barsInSection: number; barInSection: number }`: the `041.2` text
  (`barBeat`) in `.t-value` tabular and a hairline ruler whose accent fill
  is `(barInSection − 1 + (beat − 1) / beatsPerBar) / barsInSection`;
  handle `BarProgressHandle { set(bar, beat, barInSection): void }`.

- [ ] **Step 1: Write the failing tests** — `DmxValueBar` renders `007`
  for 7 and `aria-valuenow`; `set(255)` updates the text and the `--v`
  property to `1`; `Sparkline` draws `window` points at most, `push`
  drops the oldest, the last value text matches `format`; `BarProgress`
  text `041.2` and fill `0.3125` for bar 41 beat 2 of a 4/4 section of 8
  bars starting at bar 40 (`barInSection 2`).
- [ ] **Steps 2–5**; stories include a `Moving` story whose play function
  calls the handle (interaction test visible in the catalog); commit —
  `feat(ds): DmxValueBar, Sparkline, BarProgress`

### Task 3: `fixtureColor` and FixtureTile

**Files:** `src/live/model.ts` (TS types of the Step 0 fixture-type and
venue shapes the layer needs), `src/live/fixtureColor.ts` (+
`fixtureColor.test.ts`), `src/primitives/FixtureTile/…`.

**Interfaces:**
- `model.ts`: `ChannelRole` (the schema's enum), `Channel { name; role;
  fineOf?; default; ranges?; invert? }`, `FixtureMode { id; name;
  channelCount; channels }`, `FixtureType { id; name; modes }`,
  `VenueFixture { id; name; typeId; modeId; universeId; address;
  position?: { x; y; z }; tags? }`, `Universe { id; name; number }`.
  (Hand-written, matching `schemas/*.json`; a test loads
  `fixtures/library/types/v1-rgbw-dimmer.json` and
  `fixtures/venues/*.json` from the repo and type-checks them through a
  Zod-free structural assertion: the fields exist.)
- `fixtureColor(frame: Uint8Array, fixture: VenueFixture, mode:
  FixtureMode): FixtureColor` where `FixtureColor = { css: string;
  luminance: number; lit: boolean; kind: "rgb" | "white" | "uv" | "wheel"
  | "none" }`: reads channel `k` of the fixture at `frame[address − 1 +
  k]` (bytes beyond 511 read as 0); intensity = the `intensity` channel
  /255, or 1 when the mode has none; RGB/RGBW/RGBA/RGBAW+lime mixed to
  sRGB: `r' = min(1, r + w + 0.9a + 0.6l)`, `g' = min(1, g + w + 0.5a +
  l)`, `b' = min(1, b + w)` then × intensity; `colorTemp` alone maps 0→
  warm `rgb(255 214 170)` to 255→cool `rgb(214 230 255)` × intensity;
  `uv` alone = `rgb(72 0 120)` × intensity; a `gobo`/`macro`-less type
  whose only colour channel has `ranges` (a colour wheel) = the range's
  `meaning` if it names a CSS colour keyword, else `rgb(128 128 128)`,
  `kind "wheel"`; no colour channel and no intensity = `none`, unlit;
  `fineOf` channels ignored; `lit = max(r', g', b') × intensity > 0.02`;
  `luminance` = relative luminance of the result (the 2A `contrast.ts`
  helper).
- `FixtureTile` props `{ name: string; color: FixtureColor; selected?:
  boolean; faulted?: boolean; size?: 1 | 2 }` (1 = 80 px = 2 units, the
  C1 card; 2 = 160 px) plus handle `FixtureTileHandle { set(color:
  FixtureColor): void }`: unlit = `--bg` with a hairline, name in
  `--fg-dim`; lit = flat fill via `style --tile`, name in `--on-bg` when
  `luminance > 0.4` else `--fg`; selected = accent outline (inset,
  `--focus-width`); faulted = `--fault` hairline; `role="img"` with
  `aria-label` `"<name>, lit|unlit"`; a `wheel` kind shows a small
  Lucide glyph (`circle`-like from the curated set; add `aperture` to
  `icons/index.ts` if none fits — it is a Lucide name, no dependency).

- [ ] **Step 1: Write the failing tests** — the `fixtureColor` cases of
  Review Focus 2 and 3 plus: RGBW dimmer at `[255,0,0,0]` intensity 128 →
  `rgb(128 0 0)`; white 255 alone → `rgb(255 255 255)`; address 510 of a
  4-channel type → bytes 510–512 read, the 4th as 0; `FixtureTile` lit
  sets `--tile` and the `onBg` class for a white tile, the `dim` class
  for an unlit one, `selected`/`faulted` classes, `aria-label`.
- [ ] **Steps 2–5**; stories: a 4×2 wall of tiles (unlit, red, warm
  white, UV, wheel, selected, faulted, size 2) in both modes; commit —
  `feat(ds): fixtureColor and FixtureTile`

### Task 4: UniverseGrid

**Files:** `src/primitives/UniverseGrid/…`.

**Interfaces:**
- `UniverseGrid` props `{ universe: number; frame?: Uint8Array;
  overlaps?: ReadonlySet<number>; label?: string }` plus handle
  `UniverseGridHandle { set(frame: Uint8Array): void }`: 512 `div` cells
  in a 32 × 16 CSS grid, each cell square on the 4 px scale (cell size
  `calc(var(--unit) / 2)` = 20 px at laptop, `calc(var(--unit) / 4)` at
  phone via `@media (max-width: 479px)`), grey = the value
  (`style --cell: <0..255>` consumed as `rgb(var(--cell) var(--cell)
  var(--cell))` in the module: numbers, not colour literals); overlap
  cells get a `--fault` hairline; the grid is one focusable element
  (`role="grid"`, `aria-rowcount 16`, `aria-colcount 32`, a roving
  `aria-activedescendant` over cells like the Table) and arrow keys move
  the active cell; the active or hovered cell shows its channel number
  and value in a fixed slot under the grid (`.t-mono`, reserved height
  so nothing shifts). `set` rewrites only cells whose byte changed (keep
  the previous frame in a ref).

- [ ] **Step 1: Write the failing tests** — 512 cells; `set` writes
  `--cell` on changed cells only (spy on `setProperty`); overlap set marks
  the cells; ArrowRight moves the active cell and the readout shows
  `002 · 000`; `aria-activedescendant` resolves.
- [ ] **Steps 2–5**; stories: a static frame (a ramp), an `Overlaps`
  story, both modes; commit — `feat(ds): UniverseGrid`

### Task 5: TimelineRuler

**Files:** `src/primitives/TimelineRuler/…`, `src/primitives/_shared/tempoMap.ts`
(+ test).

**Interfaces:**
- `tempoMap.ts`: `TempoSegment { fromBeat: number; bpm: number;
  beatsPerBar: number }`, `barAt(segments: TempoSegment[], beat: number):
  { bar: number; beat: number; beatsPerBar: number }` (bars count from 1
  at beat 0; a new segment starts a new bar).
- `TimelineRuler` props `{ segments: TempoSegment[]; fromBeat: number;
  toBeat: number; position: number; markers?: { atBeat: number; label:
  string }[] }` plus handle `TimelineRulerHandle { set(position:
  number): void }`: an `svg` the width of its container (`viewBox` in
  beats, `preserveAspectRatio="none"` for the ticks layer; labels in HTML
  absolutely positioned on the grid): hairline bar ticks, shorter beat
  ticks, the play head a 2 px accent line moved by `set` through a
  `transform`, markers as `.t-label` text; `role="img"` with an
  `aria-label` naming the visible bar range and the position.

- [ ] **Step 1: Write the failing tests** — `barAt` across a 4/4 → 3/4
  segment change; the ruler draws `toBeat − fromBeat` beat ticks and one
  bar tick per bar; `set` moves the play head's `transform`; markers
  render their labels.
- [ ] **Steps 2–5**; stories: the synthetic timeline's first 16 bars with
  two markers, a `Moving` play function; commit — `feat(ds):
  TimelineRuler and tempoMap`

### Task 6: The live layer, part 1 — frames decoder, StreamSource, WebSocketSource

**Files:** `src/live/frames.ts` (+ test), `src/live/source.ts`,
`src/live/websocket.ts` (+ test with a fake `WebSocket`), `src/live/types.ts`.

**Interfaces:**
- `frames.ts`: `FRAME_MESSAGE_BYTES = 532`, `decodeFrame(buf:
  ArrayBuffer): FrameMessage` with `FrameMessage { universe: number;
  sequence: bigint; publishedNs: bigint; dmx: Uint8Array }` (little
  endian per `docs/api.md`; `dmx` is a view, no copy); throws
  `RangeError` on any other length; `encodeFrame(msg): ArrayBuffer` for
  tests and the replay source.
- `types.ts`: the topic payloads as TS types from `docs/api.md`:
  `Topic = "state" | "clock" | "metrics" | "voices" | "events" | "faults"
  | "frames"`, `StateMsg`, `ClockMsg { clock: "internal" | "locked" |
  "free-run" | "stopped" | null; beat; runBeat; tempoBpm }`, `Fault`,
  `FaultsMsg`, `VoiceView`, `InEvent`, `MetricsMsg` (timers typed loosely
  as `Quantiles` records), `TextMessage = { topic; kind: "snapshot" |
  "delta"; data }`.
- `source.ts`: `interface StreamSource { subscribe(topics: Topic[]):
  void; unsubscribe(topics: Topic[]): void; onText(cb: (m: TextMessage)
  => void): () => void; onFrame(cb: (f: FrameMessage) => void): () =>
  void; onStatus(cb: (s: SourceStatus) => void): () => void; close():
  void }` with `SourceStatus = "connecting" | "open" | "closed" |
  "reconnecting"`.
- `websocket.ts`: `createWebSocketSource(url: string, opts?: { WebSocket?:
  typeof WebSocket; now?: () => number; setTimeout?; clearTimeout? }):
  StreamSource`: binary type `arraybuffer`; re-sends the current
  subscription set on every (re)open; reconnects on close with 1 s delay
  doubling to 10 s, reset after 5 s open; server `error` messages are
  reported through `onStatus` as `"open"` plus a `console.warn` once per
  code; `close()` stops reconnecting.

- [ ] **Step 1: Write the failing tests** — round trip
  `encodeFrame`/`decodeFrame` with universe 3, sequence 2^40, a ramp;
  wrong length throws; the fake socket receives
  `{"subscribe":["clock","frames"]}` after open and again after a
  reconnect; delays 1000, 2000, 4000, 8000, 10000, 10000; `close()`
  prevents the next attempt; text and binary messages reach the right
  callbacks.
- [ ] **Steps 2–5**; commit — `feat(ds): frames decoder and the
  reconnecting WebSocket source`

### Task 7: The recording — `record-ws`, the replay source

**Files:** `packages/ds/scripts/record-ws.sh`, `packages/ds/scripts/record-ws.mjs`,
`packages/ds/fixtures/synthetic-ws.jsonl` (committed),
`packages/ds/fixtures/README.md`, `src/live/replay.ts` (+ test),
`src/__tests__/recording.test.ts`.

**Interfaces:**
- `record-ws.sh`: builds nothing; expects `cargo build --release -p ptah`
  done (checks `target/release/ptah`, exit 2 with the message otherwise);
  copies `fixtures/settings.json`, `fixtures/library`, `fixtures/venues`,
  `fixtures/shows/synthetic` into a temp root (what
  `crates/ptah-engine/tests/support/tree.rs` `synthetic_store` does);
  runs `ptah run --root <tmp> --show synthetic --fake-io --listen
  --ui-port <P>` with `P` a free port the script probes first (as
  `storybook-server.mjs` does);
  waits for `GET /api/v1/status`; runs `record-ws.mjs <ws-url> <seconds>
  <out>`; then `kill -INT` the engine and removes the temp root. Default
  30 s and `packages/ds/fixtures/synthetic-ws.jsonl`.
- `record-ws.mjs`: subscribes to every topic; writes one JSON line per
  message `{ t: <ms since first message>, topic, kind, data }` for text
  and `{ t, topic: "frames", b64: <base64 of the 532 bytes> }` for
  binary; prints counts per topic at the end.
- `replay.ts`: `createReplaySource(lines: string | RecordedMessage[],
  opts?: { now?: () => number; setTimeout?; clearTimeout?; loop?: boolean
  (default true); speed?: number }): StreamSource`: parses the JSONL,
  schedules each message at its `t` relative to `subscribe` time,
  delivers only subscribed topics (`unsubscribe` stops them), loops at
  the end, `onStatus` reports `"open"` at once; `parseRecording(text):
  RecordedMessage[]`.
- The recording is loaded in stories through Vite's `?raw` import
  (`import rec from "../../fixtures/synthetic-ws.jsonl?raw"`), so the
  Storybook static build carries it; the library build does not import
  it.

- [ ] **Step 1: Write the failing tests** — `recording.test.ts` (node
  env): the file exists, parses, holds every topic, ≥ 400 `frames` lines
  (≥ 20 s at 20 Hz), each frame decodes to universe numbers present in
  the `state` snapshot's `showInfo.universes`, the first `state` message
  is a `snapshot`, total duration 25–35 s; `replay.test.ts` (fake
  timers): messages arrive at their `t`, unsubscribed topics do not,
  `loop` restarts after the last `t`, `speed: 2` halves the delays.
- [ ] **Step 2: Run to verify they fail**; **Step 3: Implement** the
  scripts and the source; **Step 4: Record** — build the engine, run
  `bash packages/ds/scripts/record-ws.sh`, inspect the per-topic counts
  (the fake-io run plays the synthetic timeline, so frames vary; if every
  frame is identical, pass `--fake-note 60 --fake-note 64` as the engine
  docs allow and say so in the README), check the file size (expect
  under 2 MB; if larger, lower to 20 s and note it); **Step 5: Verify**
  tests, `check`, `format`; **Step 6: Commit** — `feat(ds): recorded
  synthetic WebSocket session and the replay source`

### Task 8: The live layer, part 2 — hooks and the `Live*` wrappers

**Files:** `src/live/StreamProvider.tsx`, `src/live/useStream.ts`,
`src/live/useFrames.ts`, `src/live/useStale.ts`, `src/live/live.test.tsx`,
`src/live/{LiveUniverseGrid,LiveFixtureTile,LiveDmxValueBar,LiveClock}.tsx`,
`src/live/Live.stories.tsx`.

**Interfaces:**
- `StreamProvider({ source, children })` puts a `StreamSource` in context;
  `useStream<T extends Topic>(topic): { data: Payload<T> | null; kind;
  at: number } | null` subscribes on mount (reference-counted per topic
  across hooks) and holds the latest text message in React state; for
  `faults` it folds deltas into the snapshot list by `(code, subject)`.
- `useFrames(universe: number, onFrame: (dmx: Uint8Array, f:
  FrameMessage) => void)`: subscribes to `frames`, keeps the latest frame
  per universe in a ref, and calls `onFrame` at most once per
  `requestAnimationFrame` with the newest frame (frames arriving between
  paints are coalesced; test by pushing 5 frames in one tick and
  asserting one callback with the last).
- `useStale(timeoutMs = 1000): boolean`: true when no message of any
  subscribed topic arrived for `timeoutMs` or the source status is not
  `open`.
- `LiveUniverseGrid({ universe, overlaps? })` = `UniverseGrid` +
  `useFrames` → `handle.set`; `LiveFixtureTile({ fixture, mode, selected?,
  faulted? })` = `FixtureTile` + `useFrames(universeNumber)` →
  `fixtureColor` → `handle.set` (skips when the fixture's bytes did not
  change); `LiveDmxValueBar({ universe, channel })`; `LiveClock()` renders
  `StatusWord kind="clock"` from `clock.clock`, overridden to `stale`
  by `useStale`, plus `BarProgress` fed from `runBeat` with a 4/4 default
  (bars from `barAt` over a single segment at `tempoBpm`; §5: live bars
  are provisional until Step 3).

- [ ] **Step 1: Write the failing tests** — with a replay source on fake
  timers: `useStream("clock")` yields the snapshot then a delta;
  `faults` folding replaces by key; `useFrames` coalescing; `useStale`
  flips after 1 s of silence and back on the next message; the
  subscription is sent once for two hooks on the same topic and
  unsubscribed when both unmount; `LiveFixtureTile` calls `set` only when
  its bytes change; unknown universe frames are ignored (Review Focus 2).
- [ ] **Steps 2–5**; `Live.stories.tsx`: `Grid`, `Tiles` (the synthetic
  venue's fixtures from `fixtures/venues/*.json`, imported as JSON),
  `Bars`, `Clock`, each `Normal`/`Stage`, all on the replay source;
  commit — `feat(ds): stream hooks and the Live wrappers`

### Task 9: No-layout-shift interaction gate

**Files:** `src/stories/_shared/noShift.ts` (the gate runs in the
browser, not in jsdom) (a play-function helper),
play functions added to the live stories of Task 8 and to
`StatusWord`, `FaultLine` (a `Storm` story), `BarProgress`, `Sparkline`,
`DmxValueBar` stories; `.storybook/test-runner.ts` unchanged (play
functions already run).

**Interfaces:**
- `noShift(canvas: HTMLElement, flip: () => Promise<void> | void, opts?:
  { ignore?: string })`: records `getBoundingClientRect()` of every
  element under `canvas` (keyed by a stable path), runs `flip`, waits two
  animation frames, records again, and `expect`s (from `@storybook/test`)
  every box within 0.5 px; elements matching `opts.ignore` (the play head,
  a bar fill) are excluded.
- Each covered story's `play` flips through its states: `StatusWord` all
  values of a kind; `FaultLine Storm` 0 → 3 → 0 faults inside a column
  that reserves three lines; `BarProgress` 1.1 → 8.4; `Sparkline` push
  20 values; `DmxValueBar` 0 → 255; `Live.Clock` and `Live.Bars` 2 s of
  replay.

- [ ] **Step 1: Write the failing test** — a deliberately shifting fixture
  story (`NoShiftFixture`, excluded from the visual baselines) whose play
  function asserts with `noShift`; run `test:storybook`; it must fail on
  that story; then remove the fixture story's shift (keep the story as a
  passing example of the helper).
- [ ] **Steps 2–5**; commit — `test(ds): no-layout-shift interaction gate
  over the live stories`

### Task 10: Frame-cost gate

**Files:** `src/stories/Perf.stories.tsx` (`live-perf--frames`, a
`LiveUniverseGrid` + 32 `LiveFixtureTile` + 8 `LiveDmxValueBar` on a
replay source, exposing `window.__ptahPerf = { pushFrames(n), baseline(n)
}`), `scripts/test-visual.mjs` (a `--perf` pass after the tap gate),
`docs/design-system.md` ("The gates": the relative gate and the manual
2 ms check), the plan ledger (the owner's laptop figure).

**Interfaces:**
- `pushFrames(n)`: feeds `n` synthetic 532-byte frames (a moving ramp)
  through the replay source's frame path synchronously, one per
  `requestAnimationFrame`, and resolves with the mean main-thread cost
  per frame (`performance.now()` around the rAF callback that applies
  the frame, measured by the hooks via a `perfHook` the story installs).
- `baseline(n)`: the same `n` frames applied by a plain loop that writes
  `--cell` on 512 `div`s and `--tile` on 32 `div`s directly (the fixed
  DOM diff of the same size), measured the same way.
- The gate: in the Playwright page, `cost = pushFrames(200)`, `base =
  baseline(200)`, print both in ms with three decimals and fail when
  `cost > 1.5 × base`; also print the absolute `cost` so the owner's
  laptop number can be recorded. Runs on the laptop viewport only.

- [ ] **Step 1: Write the failing test** — `src/__tests__/test-visual.test.ts`
  gains a case: the script with `--perf-only --baselines <empty>` against
  a story id that does not expose `__ptahPerf` exits 1 with
  `Perf gate: story has no __ptahPerf hook` (so a renamed story cannot
  silently skip the gate).
- [ ] **Steps 2–5**: implement; run `test:visual` three times and record
  the three `cost`/`base` pairs in the report (they must all pass; if the
  ratio is within 10 % of 1.5 the implementer says so and the controller
  decides); commit — `test(ds): relative frame-cost gate`

### Task 11: "Perform, assembled"

**Files:** `src/stories/Perform.stories.tsx`, `src/stories/Perform.module.css`,
`src/stories/perform/{rig.ts,PerformHeader.tsx,PerformStage.tsx,PerformSide.tsx,PerformFoot.tsx}`,
`src/stories/__tests__/perform.test.tsx`, `visual/baselines/darwin/*.png`
(the Gallery set rebaselined only if the Gallery changed; the Perform
set added), `scripts/test-visual.mjs` (screenshot list gains
`perform--normal` and `perform--stage` at both viewports; tap gate
already covers `*--open`, add `perform--normal`).

**Interfaces:**
- `rig.ts`: loads the synthetic venue and types from `fixtures/` (JSON
  imports) and exposes `rig: { venue; types; fixturesByUniverse }`;
  tile positions come from `fixture.position.x/y` snapped to the 40 px
  grid (`round(x × unit)`; when absent, a row-major fallback at 2-unit
  pitch).
- The page (laptop): `StatusRegion` top bar (56 px) with the show name in
  `.t-label` letter-spaced, `Song 03` (`state.currentSong` as two digits,
  as the card shows), `BarProgress` from `LiveClock`, `Tempo
  122.0` (one decimal), the `TimelineRuler` of the current 8 bars at the
  right; the middle `grid-template-columns: 1fr calc(var(--unit) * 6)`
  (240 px side column) with the stage area (`.grid-overlay`, tiles
  absolutely positioned, `Universe 1 · 8 fixtures` caption) and the side
  column of five fixed lines (`Output U<n>` from `faults` `output.lost`
  per universe → `Lost 12 s` in `--fault` else `OK`; `Clock` →
  `StatusWord`; `Render` → `metrics.timers.frameWork.window.p99` in µs +
  `RT` from `engine.rtPriority`; `Voices` → count; `Unmapped` → the
  `mapping.unmapped` fault count) and a three-line `FaultLine` list;
  the bottom bar (56 px): `Active` + a `NoteChip` per voice (program id
  from `showInfo.instancePrograms[voice.instance]`, the chip from the
  voice's trigger when `events` carries it, else the instance name) and
  the override strip (`Blackout`, `House`, `Freeze`, `Master 100` as
  `Toggle`s with `pressed` controlled from `state.overrides` and
  `onPressedChange` ignored: the Perform page shows state and sends no
  command in Step 2; a `title` on the strip says so).
- Phone (390 px): the top bar keeps title, bar and tempo; the side column
  moves under the stage as two rows; the stage area scrolls horizontally
  inside its panel; the bottom bar wraps the override strip to a second
  row of four equal `Toggle`s (each ≥ 44 px; the tap gate checks it).
- Stories: `Normal`, `Stage` (replay source, loop), `Live` (reads
  `import.meta.env.VITE_PTAH_WS`, default `ws://127.0.0.1:1910/api/v1/ws`,
  rendered only when `VITE_PTAH_WS` is set — otherwise it shows an
  `EmptyState` "Set VITE_PTAH_WS to connect"; excluded from the visual
  and tap lists), `Faulted` (replay with an injected `output.lost` and
  three faults, for the side column).

- [ ] **Step 1: Write the failing tests** — `perform.test.tsx`
  (`composeStories`, replay source on fake timers): the header shows the
  show name and a `041.2`-shaped bar text after 2 s of replay; every
  fixture of the synthetic venue has a tile with `aria-label`; the side
  column has exactly five key/value lines and a list of three fault
  slots; the override strip has four toggles; no console errors.
- [ ] **Step 2: Run to verify they fail**; **Step 3: Build the page**
  (layout on whole units like the Gallery: verify with the overlay at
  1280 and 390); **Step 4: Verify** tests, `test:storybook` (axe + the
  no-shift play on `Normal`), `test:visual` with the new baselines
  (two runs, 0.000 %), tap gate, root `check`/`format`/`typecheck`;
  screenshot both modes at both viewports into the task report;
  **Step 5: Commit** — `feat(ds): the assembled Perform page`

### Task 12: Inherited from 2B — stacking rule, overlay API gaps, `allcheck` builds once

**Files:** `src/tokens/tokens.ts` + `build.ts` (three tokens: `--z-popup
10`, `--z-modal 20`, `--z-toast 30`; the palette is a Dialog and uses
`--z-modal`), `Dialog/Popover/Tooltip/Menu/Select/Combobox/
Toast/CommandPalette` modules (use the tokens on their popup/backdrop/
viewport), `Menu.tsx` (`open`/`onOpenChange`), `Dialog/Popover/Tooltip/
Menu/Toast` (`className` pass-through to the popup), `Tabs` (disabled tab
cue: `--fg-dim` text over a hairline `border-bottom` in `--line`, the
same language as a disabled Button), `scripts/storybook-server.mjs` (`startStorybook({
reuse: true })` skips the build when `storybook-static/index.json` is
newer than every file under `src/` and `.storybook/`), `scripts/
test-visual.mjs` (passes `reuse: true`), root `package.json` (`allcheck`
unchanged; the reuse makes the second build a no-op), `docs/
design-system.md` (the stacking rule: toasts above modals so a fault
never hides behind a Dialog shade; the shade does not make the stack
inert).

- [ ] **Step 1: Write the failing tests** — token test: the three `--z-*`
  exist in `tokens.css` and `toast > modal > popup`; rules test gains:
  `z-index` values in modules must be `var(--z-*)` (no literals); Toast
  story `OverModal` (a Dialog open and a fault toast) asserts the toast's
  viewport is above the backdrop (`elementFromPoint` on the toast hits
  it) — in the test-runner play function; Menu controlled-open test;
  `className` reaches each popup; disabled tab test (class + `aria-
  disabled`); `storybook-server` reuse test: with a fresh
  `storybook-static` the build is skipped (a stubbed `run` records no
  `storybook build` call).
- [ ] **Steps 2–5**; `pnpm allcheck` once, timed before/after in the
  report; commit — `fix(ds): stacking tokens, overlay API gaps, disabled
  tab cue, one Storybook build per allcheck`

### Task 13: Docs, exports, the owner's dark-room check

**Files:** `docs/design-system.md` ("Primitives" section: the ten with one
line each and their handles; "The live layer": sources, hooks, the
recording and how to refresh it, the stale rule, the rAF rule; "Perform,
assembled": what it shows and the `VITE_PTAH_WS` live variant; the gates
list gains no-shift and frame-cost), `README.md` (one line: `pnpm -F
@ptah-app/ds storybook` then open Perform; `record-ws.sh`), `src/__tests__/
docs-components.test.ts` (also checks every primitive and every `Live*`
export is named), `docs/rehearsal.md`? No: a short `docs/ledgers/
step2c-dark-room-check.md` template the owner fills (exit criterion 4:
date, laptop, stage mode flipped, "it reads" yes/no, notes) and the 2 ms
manual figure from Task 10.

- [ ] **Step 1: Write the failing test** (docs test extension); **Step 2:
  Write the docs**; **Step 3: Verify** `pnpm -F @ptah-app/ds test`,
  `test:storybook`, `test:visual`, root `check`; **Step 4: Commit** —
  `docs(ds): primitives, the live layer, Perform and the dark-room check`

---

## Self-review

- **Spec coverage:** §5 ten primitives → Tasks 1–5 (StatusWord, NoteChip,
  GroupBadge, FaultLine; DmxValueBar, Sparkline, BarProgress; FixtureTile;
  UniverseGrid; TimelineRuler); §5 two layers, `fixtureColor`,
  `useStream`, decoder, `Live*` → Tasks 3, 6, 8; §5 bars from props with
  a 4/4 default → Tasks 5 and 8; §7 no layout shift → Task 9; §7 frame
  rate via refs/rAF + relative perf gate + manual 2 ms → Tasks 8, 10, 13;
  §7 motion/density → the 2A/2B gates, unchanged, plus the overlay check
  in Task 11; §7 elegance review → the final whole-branch review (the
  controller's dispatch names `c1-reference.html`); §8 recorded session,
  `record-ws.sh`, HILLDALE out of the build → Tasks 7 and 11; §9 → the
  existing gates plus Task 11's tap coverage; §12 criteria 1 and 3 →
  Tasks 1–11, criterion 4 → Task 13's template; 2B's inherited items →
  Task 12.
- **Type consistency:** `FixtureColor`, `FrameMessage`, `StreamSource`,
  `TempoSegment`, the handles (`set`/`push`) are named once and reused
  by name in Tasks 8–11; `Payload<T>` is defined in Task 8 over Task 6's
  `types.ts`.
- **Proportion:** 13 tasks, prose signatures and test lists, no bodies
  except the colour-mixing formula (an algorithm the tests do not
  determine).
