# V2 Step 0 — Domain Model and File Formats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the private V2 repository with executable, tested definitions of every V2 file format (JSON Schema + lint rules), golden fixtures (the literal HILLDALE import, its re-authored form, and a synthetic full-featured show with two venues), a reference V1 importer and collapse pass, and the program VM instruction set with a reference evaluator whose traces match V1.

**Architecture:** A new repo `~/projects/ptah-v2` holding `schemas/` (JSON Schema 2020-12, one file per entity), `fixtures/` (golden data), `docs/` (VM instruction set) and one pnpm package `packages/model-tools` (TypeScript, vitest, ajv) that validates fixtures against schemas, enforces cross-file invariants ("lint"), implements the deterministic algorithms the spec pins (patch folding, V1 import, collapse, health, reference VM) and generates golden traces. Nothing here is product code: Step 1's Rust engine must reproduce these outputs, and these tools stay in the repo as the executable specification.

**Tech Stack:** Node >= 20, pnpm 9, TypeScript 5 strict, vitest, ajv (2020-12 + formats), Biome. V1 (`~/projects/ptah`) is used read-only to generate oracles.

**Spec:** `~/projects/ptah/docs/superpowers/specs/2026-10-26-v2-step0-domain-model-design.md` (copied into the new repo as `docs/specs/step0-domain-model.md` in Task 1, together with the master plan).

## Global Constraints

- Repository is **private** (fixtures contain the band's show files).
- JSON Schema draft **2020-12**; every stored file has a root `schema: "<entity>@<n>"`, `n` starting at 1.
- Ids are UUID v4 strings; names are labels and never used as references.
- Values inside the model are floats 0..1 (angles in degrees, colors as `{r,g,b}` 0..1); DMX bytes appear only in render oracles.
- V1 files under `~/.ptah/{shows,programs}` and `~/.ptah/.ptah-settings.json` are read-only inputs; nothing writes there.
- Style: Biome, 2-space, 80 columns, double quotes, semicolons, trailing commas; TypeScript strict, no `any`.
- Conventional commits with scopes (`feat(schemas): ...`, `feat(model-tools): ...`, `docs(vm): ...`, `fixtures: ...`).

## Review Focus

1. **A venue fixture whose mode has `fineOf` channels** must render 16-bit values big-endian with the coarse byte first; a pan of exactly 1.0 must be `0xFFFF`, not overflow. Test in Task 10 (`render` of `fineOf`).
2. **A show that references a program id that does not exist** must lint as an issue, validate as a file, and never crash any tool (importer, collapse, health). Test in Task 5 (`lintShow` missing program) and Task 12 (health).
3. **A noteRange mapping whose range is longer than the group** must lint as an issue (extra notes start nothing) and fold deterministically, not throw. Test in Task 5.
4. **A venue with zero fixtures of the required capability** must produce an assignment of all `null` plus a fallback issue, never an exception. Test in Task 6.
5. **V1 programs containing `input-audio` or a cycle** must import without throwing, with an `unknown` node or a `z1` node and a flagged report. Test in Task 7.

---

### Task 1: Bootstrap the V2 repository

**Files:**
- Create: `~/projects/ptah-v2/{package.json,pnpm-workspace.yaml,biome.json,tsconfig.base.json,.gitignore,.nvmrc,README.md}`
- Create: `~/projects/ptah-v2/packages/model-tools/{package.json,tsconfig.json,vitest.config.ts,src/index.ts,src/__tests__/smoke.test.ts}`
- Create: `~/projects/ptah-v2/docs/specs/master-plan.md`, `docs/specs/step0-domain-model.md` (copies of the two approved specs)

**Interfaces:**
- Produces: package name `@ptah-app/model-tools`; scripts `test`, `typecheck`, `check`, `format`, `allcheck` at the root mirroring V1's.

- [ ] **Step 1: Create the directory, `git init`, write root files.** Root `package.json` scripts: `test: "pnpm -r test"`, `typecheck: "pnpm -r typecheck"`, `check: "biome check"`, `format: "biome format"`, `allcheck: "pnpm format && pnpm check && pnpm typecheck && pnpm test"`. `packageManager: "pnpm@9.15.4"`. `.nvmrc`: `20`. Biome config copied from V1's `biome.json`.
- [ ] **Step 2: Create `packages/model-tools`** with devDependencies `typescript`, `vitest`, `ajv`, `ajv-formats`, `@types/node`; scripts `test: "vitest run"`, `typecheck: "tsc --noEmit"`. `src/__tests__/smoke.test.ts` asserts `expect(1 + 1).toBe(2)`.
- [ ] **Step 3: Copy the two specs** into `docs/specs/` and write `README.md`: what the repo is, that it is private and why, how to run `pnpm allcheck`, the layout (`schemas/`, `fixtures/`, `docs/`, `packages/`).
- [ ] **Step 4: Run `pnpm i && pnpm allcheck`.** Expected: all green, 1 test passed.
- [ ] **Step 5: Commit** `chore: bootstrap ptah v2 repository`.
- [ ] **Step 6: Create the private GitHub repository and push** with `gh repo create ptah-v2 --private --source . --push`. This is an outward action; if the executor cannot confirm with the owner, skip and leave a note in the final report.

---

### Task 2: Schema harness and common definitions

**Files:**
- Create: `schemas/common.schema.json` (`$id: ptah://schemas/common`, `$defs`: `uuid`, `schemaTag` pattern `^[a-z][a-zA-Z]*@[1-9][0-9]*$`, `unit` 0..1 number, `midiChannel` 1..16 integer or `"any"`, `midiNumber` 0..127, `deviceRef` string `"any"` or uuid)
- Create: `packages/model-tools/src/schemas.ts`, `src/__tests__/schemas.test.ts`

**Interfaces:**
- Produces: `loadSchemas(): Ajv` (compiles every `schemas/*.schema.json`, adds formats), `validate(entity: EntityName, data: unknown): ValidationResult` where `EntityName = "fixtureType" | "venue" | "program" | "show" | "settings"` and `ValidationResult = { ok: true } | { ok: false; errors: string[] }` (errors formatted `instancePath: message`).
- Produces: `readJson(path: string): unknown`, `fixturesDir`, `schemasDir` constants (repo-root relative).

- [ ] **Step 1: Write failing tests**: `validate("fixtureType", {})` is `{ok:false}` with an error mentioning `schema`; unknown entity throws; `common` `$defs.uuid` rejects `"abc"` and accepts a v4 uuid.
- [ ] **Step 2: Run** `pnpm --filter @ptah-app/model-tools test` → FAIL (module not found).
- [ ] **Step 3: Implement** `schemas.ts` and `common.schema.json`; add an empty placeholder `fixtureType.schema.json` that only requires `schema` const `"fixtureType@1"` so the first test compiles (Task 3 fills it).
- [ ] **Step 4: Run tests** → PASS.
- [ ] **Step 5: Commit** `feat(schemas): add schema harness and common definitions`.

---

### Task 3: FixtureType schema and built-in types

**Files:**
- Create: `schemas/fixtureType.schema.json` (spec 3.1: `id,name,manufacturer,source,modes[],physical?`; `Role` enum exactly the 26 values of spec 3.1; `Channel.fineOf` integer >= 0; `ranges[]` items `{from 0..255, to 0..255, meaning string, value?}`)
- Create: `fixtures/library/types/v1-dimmer.json`, `v1-rgb.json`, `v1-rgbw.json`, `v1-rgb-dimmer.json`, `v1-rgbw-dimmer.json` (built-in custom types, ids fixed uuids listed in `src/import/v1-types.ts`), `fixtures/library/types/example-strobe-3ch.json` (roles `intensity, generic, generic`), `example-mover-16bit.json` (pan, pan fine via `fineOf`, tilt, tilt fine, intensity, red, green, blue, strobe, zoom, gobo), `example-inverted-dimmer.json` (one channel `invert: true`)
- Create: `src/capabilities.ts`, `src/__tests__/capabilities.test.ts`, `src/__tests__/fixtureType.test.ts`

**Interfaces:**
- Produces: `type Capability = "intensity" | "color" | "strobe" | "position" | "beam" | { channel: number }`; `capabilitiesOf(mode: Mode): Capability[]` per spec 3.1 table (virtual intensity: color channels imply `intensity`); `type Mode`, `type FixtureType`, `type Channel` TypeScript types mirroring the schema (hand-written in `src/types.ts`, extended by later tasks).
- Produces: `V1_TYPE_IDS: Record<"dimmer"|"rgb"|"rgbw"|"rgb-dimmer"|"rgbw-dimmer", string>`.

- [ ] **Step 1: Write failing tests**: every file in `fixtures/library/types` validates; a type with `fineOf` pointing past `channels.length` fails lint (`lintFixtureType` returns one issue `fineOf out of range`); `capabilitiesOf(rgbMode)` equals `["intensity","color",{channel:0},{channel:1},{channel:2}]`; `capabilitiesOf(dimmerMode)` equals `["intensity",{channel:0}]`; `capabilitiesOf(moverMode)` contains `"position"`, `"strobe"`, `"beam"`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** schema, fixture files, `capabilitiesOf`, `lintFixtureType(type: FixtureType): Issue[]` where `type Issue = { level: "error" | "warning"; code: string; path: string; message: string }` (in `src/issue.ts`, reused by all lints).
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `feat(schemas): fixture type schema, capabilities, built-in types`.

---

### Task 4: Venue schema and lint

**Files:**
- Create: `schemas/venue.schema.json` (spec 3.2 incl. `park`, `patches[]` referencing `#/$defs/patch` defined in Task 6 — until then an open object)
- Create: `src/lint/venue.ts`, `src/__tests__/venue.test.ts`, `fixtures/venues/hilldale-v1.json` (21 one-channel fixtures, one `usbpro` universe, ids fixed)

**Interfaces:**
- Produces: `lintVenue(venue: Venue, types: Map<string, FixtureType>): Issue[]`; `fixtureChannels(fixture: VenueFixture, type): { universeId, address }[]`.

- [ ] **Step 1: Failing tests**: fixture file validates; a fixture at address 511 with a 3-channel mode → one `error` `address-overflow`; two fixtures sharing a channel → one `warning` `address-overlap` naming both ids; unknown `typeId` → `error` `unknown-type`; `park` with an attribute the mode lacks → `warning` `park-unsupported`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(schemas): venue schema and lint`.

---

### Task 5: Program and Show schemas and lint

**Files:**
- Create: `schemas/program.schema.json` (spec 3.5: `parameters[]`, `nodes[]` as a `oneOf` over node types with `type` discriminator: inputs `time, beat, constant, parameter, velocity, member, random`; effects `envelope, adsr, add, subtract, multiply, divide, modulo, power, sin, cos, tan, asin, acos, atan, exp, log, sqrt, abs, round, floor, ceil, distortion, clamp, map, smooth, lfo, step, select, subgraph, z1, unknown`; outputs `out.intensity, out.color, out.strobe, out.position, out.beam, out.channel` each with `slot`; `edges[]` `{id, from: {node, port}, to: {node, port}}`)
- Create: `schemas/show.schema.json` (spec 3.3, 3.4, 3.6, 3.7, 3.8, 3.10; `Trigger`, `Source` as `oneOf` by `kind`; `routing[]`, `timeline?`, `songs[]`)
- Create: `src/ports.ts` (port table: for every node type the ordered input ports with `{name, type: "number"|"color"|"bool", default}` and output ports), `src/lint/program.ts`, `src/lint/show.ts`, tests for both

**Interfaces:**
- Produces: `PORTS: Record<NodeType, { inputs: Port[]; outputs: Port[] }>`; `lintProgram(p: Program): Issue[]`; `lintShow(show: Show, programs: Map<string, Program>): Issue[]`; `requiredCapabilities(show, programs): Map<groupId, Capability[]>` (spec 3.4 `requires`, derived from instance outputs and scene entries).

- [ ] **Step 1: Failing program tests**: edge `number → color` → `error` `port-type-mismatch`; a cycle → `error` `cycle`; `subgraph` referencing itself through another program → `error` `subgraph-recursion` (lint takes `programs` map); `parameter` node with unknown `parameterId` → `error`; a valid 3-node program → `[]`.
- [ ] **Step 2: Failing show tests**: instance with missing `programId` → `error` `missing-program` (and `lintShow` does not throw); `midi.noteRange` on `distribution: "all"` → `error` `range-needs-per-member`; noteRange of 10 notes on a group of size 7 → `warning` `range-exceeds-group`; route `members` index >= size → `error`; `requiredCapabilities` of a show with one `out.color` instance on group G → `{G: ["color"]}`; binding to a parameter the program lacks → `error`.
- [ ] **Step 3: Run** → FAIL. **Step 4: Implement** schemas, ports table, both lints. **Step 5: Run** → PASS.
- [ ] **Step 6: Commit** `feat(schemas): program and show schemas, port table, lints`.

---

### Task 6: Patch schema and folding algorithm

**Files:**
- Create: `schemas/patch.schema.json` (spec 3.9; referenced by `venue.schema.json` via `$ref`), `src/patch/fold.ts`, `src/patch/match.ts`, `src/__tests__/patch.test.ts`

**Interfaces:**
- Produces: `orderFixtures(fixtures: VenueFixture[]): VenueFixture[]` (by `position.x` when every candidate has one, else by `(universe.number, address)`); `fold(size: number | "any", fixtures: VenueFixture[]): (string | string[] | null)[]` per spec 3.9 rules; `proposePatch(show, programs, venue, types): Patch` (capability match: a fixture qualifies for a group when `capabilitiesOf(mode)` ⊇ `requires`; each fixture used by at most one group, groups processed in show order; unfillable positions `null`; one `Fallback` per missing capability with strategy `"ignore"`).

- [ ] **Step 1: Failing tests**: `fold(3, [a,b,c])` → `[a,b,c]`; `fold(3, [a,b,c,d,e,f])` → `[[a,b],[c,d],[e,f]]`; `fold(3, [a,b,c,d,e])` → `[[a,b],[c,d],[e]]`; `fold(3, [a,b])` → `[a,b,a]`; `fold(7, [a,b])` → `[a,b,a,b,a,b,a]`; `fold("any", [a,b])` → `[a,b]`; `fold(3, [])` → `[null,null,null]`; `proposePatch` with a group requiring `color` and a venue of 2 rgb pars + 1 mover (type from Task 3) assigns the mover to position 3; a venue with only dimmers for a color group → all `null` and one fallback `{capability:"color", strategy:"ignore"}` without throwing; ordering by `position.x` beats address order when positions exist.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(model-tools): patch schema, folding and capability matching`.

---

### Task 7: Reference V1 importer

**Files:**
- Create: `fixtures/v1/` (copy of `~/.ptah/shows/HILLDALE.json`, every `~/.ptah/programs/*.json`, `~/.ptah/.ptah-settings.json`)
- Create: `src/import/v1-types.ts` (V1 profile → built-in type ids), `src/import/v1.ts`, `src/__tests__/import-v1.test.ts`

**Interfaces:**
- Consumes: V1 shapes from the V1 repo's `packages/lib-models/src/*.model.ts` (re-typed locally in `src/import/v1-shapes.ts`; do not depend on V1 packages).
- Produces: `importV1(input: { settings: V1Settings; show: V1Show; programs: V1Program[] }): { venue: Venue; show: Show; programs: Program[]; report: ImportReport }` where `ImportReport = { instances: number; routes: number; brokenCycles: string[]; unknownNodes: { programId: string; nodeId: string; type: string }[]; collapsible: boolean }`. Ids are deterministic: UUID v5 of `"v1:" + <v1 id or path>` under a fixed namespace constant `V1_NAMESPACE`, so re-running yields identical files.

Spec 5 rules to implement: `input-control` → `parameter` named `cc<N>` with `min 0, max 127, default = defaultValue` plus a `midi.cc` binding `{device:"any", channel: settings.midiChannel, cc: N}` on every instance of that program; `input-velocity` → `velocity` node followed by a `multiply` by constant 127; `fx-adsr` → `envelope`; `fx-math` → one node per `operation` (name map: `substract→subtract, sinus→sin, cosinus→cos, tangent→tan, arcsinus→asin, arccosinus→acos, arctangent→atan, exponential→exp, logarithm→log, square-root→sqrt, absolute→abs`); `output-result` → `out.intensity` with `slot = outputId`; `output-color` → `out.color`; unknown types → `unknown` keeping the raw node JSON in `raw`; cycles → break the back edge found by DFS from outputs and insert `z1`; per V1 mapping entry one Group (size = number of distinct fixtures that program's patch entries touch, positions ordered by address), one Instance (`distribution:"all"`, `merge:{mode:"legacy",priority:0}`, `onStop:"reset"`, `trigger:{mode:"gate"}`), one `midi.note` Mapping, and a Route per patch entry (`slot = outputId`, `members: [position]`, capability `dimmer→intensity`, `channel(i)→{channel:i}`, `color→color`).

- [ ] **Step 1: Failing tests** on the HILLDALE fixture: `report.instances === 22`, `report.routes === 67`, `show.groups.length === 22`, venue has 21 fixtures all typed `V1_TYPE_IDS.dimmer`, the instance for note 0 has routes `[{slot:0,members:[0]},{slot:1,members:[1]},{slot:2,members:[2]}]` and the instance for note 1 has `[{slot:0,members:[0]},{slot:0,members:[1]},{slot:0,members:[2]}]`; program `flash` has a parameter `cc3` and no `parameter`-less `input-control`; running `importV1` twice gives deep-equal output; a synthetic V1 program with a cycle imports with one `z1` and `report.brokenCycles.length === 1`; `test-audio.json` imports with `report.unknownNodes` containing type `input-audio`; every produced file passes `validate` and the lints of Tasks 4–5 with zero `error`s.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Write the fixtures**: a script `src/scripts/write-hilldale-import.ts` (run with `pnpm --filter @ptah-app/model-tools exec tsx src/scripts/write-hilldale-import.ts`) that writes `fixtures/shows/hilldale-literal/show.json`, `programs/*.json`, and `fixtures/venues/hilldale-v1.json` (replacing Task 4's hand file). Add a test that the files on disk deep-equal a fresh import (drift guard).
- [ ] **Step 6: Commit** `feat(model-tools): reference V1 importer and HILLDALE literal fixtures`.

---

### Task 8: V1 channel-map oracle

**Files:**
- Create in V1 repo (test-only, not committed there): `/private/tmp/.../gen-channel-map.mjs` — or run inline; output committed in V2 as `fixtures/oracles/hilldale.v1-channel-map.json`
- Create: `src/render/channelMap.ts`, `src/__tests__/channel-map.test.ts`

**Interfaces:**
- Produces: `channelMap(show, programs, venue, patch, types): Record<noteKey, { slot: number; channels: { universe: number; address: number }[] }[]>` — for every `midi.note` mapping, which absolute channels each output slot reaches after routing, assignment and mode resolution.

- [ ] **Step 1: Generate the oracle from V1.** From `~/projects/ptah` (built), a Node script that loads `~/.ptah/shows/HILLDALE.json` and the programs, calls `compileShowPatch(show.fixtures, show.patch, programId, program)` from `@ptah-app/lib-domains` for every mapping entry, and writes `{ "<note>": [{slot, channels:[address...]}] }`. Expected content for note 0: `[{slot:0,channels:[1]},{slot:1,channels:[2]},{slot:2,channels:[3]}]`; note 21: `[{slot:0,channels:[4,10,16,19]}]`.
- [ ] **Step 2: Failing test**: `channelMap` over the literal fixtures equals the oracle file for all 22 notes (universe 1).
- [ ] **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `test(model-tools): V1 channel-map oracle for HILLDALE`.

---

### Task 9: Collapse pass

**Files:**
- Create: `src/import/collapse.ts`, `src/__tests__/collapse.test.ts`, `fixtures/shows/hilldale-collapsed/` (written by the script of Task 7 extended with a `--collapse` flag)

**Interfaces:**
- Produces: `graphSignature(p: Program): string` (canonical string of node types, node fields except `id`/`position`, and edges by topological order); `routingShape(instance: Instance): string`; `collapse(show: Show, programs: Program[]): { show: Show; programs: Program[]; report: CollapseReport }` where `CollapseReport = { merged: { newInstanceId: string; from: string[] }[] }`. Rule (spec 5): instances with equal signature **and** equal routing shape whose `midi.note` triggers are consecutive (same device, channel) merge into one group whose positions are the per-note fixture tuples, one `per-member` instance, one `midi.noteRange` mapping; programs that become unreferenced are dropped; everything else untouched.

- [ ] **Step 1: Failing tests**: on the literal HILLDALE, result has `7` instances and `7` groups; `flash` yields two instances, one on a group with `size 3` positions `[[1,2,3],[7,8,9],[13,14,15]]` (by address) with route shape slots 0/1/2 → tuple indexes, one on a group with positions `[[4,5,6],[10,11,12],[16,17,18],[19,20,21]]`; the `red` instance is unchanged; `channelMap` of the collapsed show still equals the Task 8 oracle (collapse is output-preserving); collapse of an already-collapsed show is a no-op.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** (routes on per-member instances use `members: [{position: 0, tupleIndex: k}]` relative addressing per spec 3.7). **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(model-tools): collapse pass and HILLDALE collapsed fixture`.

---

### Task 10: VM instruction set and reference evaluator

**Files:**
- Create: `docs/vm-instruction-set.md`, `src/vm/ops.ts`, `src/vm/compile.ts`, `src/vm/evaluate.ts`, `src/vm/render.ts`, `src/__tests__/vm.test.ts`, `fixtures/oracles/v1-traces/<program>.json`

**Interfaces:**
- Produces: `compileProgram(p: Program, programs: Map<string, Program>): Compiled` where `Compiled = { ops: Op[]; slots: number; paramSlots: Record<parameterId, number>; outputs: { kind; slot; valueSlots: number[] }[] }` and `Op = { op: OpCode; in: number[]; out: number; const?: number }`; `evaluate(c: Compiled, env: Env, state: VoiceState): Outputs` with `Env = { time: number; beat: number; velocity: number; member: { index: number; count: number }; params: Float32Array; gate: boolean; random: () => number }`; `render(attrs: AttributeWrite[], fixture, type, mode, park): Uint8Array` (bytes for that fixture only).
- Produces in the doc: one section per node type with inputs, outputs, exact formula, and V1 provenance; the compiled form; voice lifecycle (spec 6.2); merge order (spec 6.1 step 5); render rules incl. 16-bit `fineOf`, `invert`, virtual intensity (spec 6.4).

Formulas to pin verbatim from V1 (cite file paths in the doc): `envelope` = V1 `adsr` in `packages/lib-domains/src/runner.domain.ts` with `easeOutQuint(x) = 1 - (1-x)^5`; `distortion` from the same file; `hsvToRgb` from `packages/lib-utils/src/color.ts`; V1 `toChannelValue` clamping (`NaN→0`, `+∞→255`, `-∞→0`, `round(v*255)` clamped 0..255) applies in `render` for V1 parity.

- [ ] **Step 1: Generate V1 traces.** From the V1 repo, a Node script calling `compile(program)` from `@ptah-app/lib-domains` for `flash, sine, distorded, red, strobe, P1, WI-red-CC1`, evaluating at `time = k/24` for `k = 0..96` with `inputs = new Map([[0,64],[1,100],[2,127],[3,90]])` and `parameter = 100`, writing `{ outputs: Record<slot, number[]>, colors: Record<slot, {r,g,b}[]> }` per program into `fixtures/oracles/v1-traces/`.
- [ ] **Step 2: Failing tests**: for each traced program, the imported V2 program (Task 7) compiled and evaluated with `velocity = 100/127`, `params` set from the same CC values, at the same 97 times, matches the trace within `1e-9` on every output; `envelope(0.1,0.2,0.5,0.3)(t)` matches the V1 function at `t ∈ {0, 0.05, 0.1, 0.2, 0.5, 0.8, 1, 1.5}`; `render` of `pan = 1.0` on the 16-bit mover gives bytes `[255,255]` at the pan/pan-fine offsets and `pan = 0.5` gives `[128,0]`; `render` of an inverted dimmer at `level 1` gives `0`; `render` of the rgb type with intensity `0.5` and color `(1,1,1)` and no intensity channel gives `[128,128,128]` (virtual intensity); `render` with nothing written and `park {pan: 0.25}` gives the park bytes, else the mode defaults; `adsr` (gate-aware) sustains while `gate` and releases to 0 over `release` beats after `gate` falls.
- [ ] **Step 3: Run** → FAIL. **Step 4: Write `docs/vm-instruction-set.md` and implement** `ops.ts` (one `OpCode` per node type), `compile.ts` (topological order; `z1` reads the previous evaluation's slot from `VoiceState`), `evaluate.ts`, `render.ts`.
- [ ] **Step 5: Run** → PASS. **Step 6: Commit** `feat(vm): instruction set document, reference evaluator, V1 traces`.

---

### Task 11: Re-authored HILLDALE and the synthetic show

**Files:**
- Create: `fixtures/shows/hilldale-reauthored/{show.json,programs/*.json}`, `fixtures/venues/hilldale-physical.json` (4 × `v1-rgb` pars at 4,10,16,19; 3 × `example-strobe-3ch` at 1,7,13; patch for the re-authored show)
- Create: `fixtures/shows/synthetic/{show.json,programs/*.json,timeline.mid}`, `fixtures/venues/synthetic-a.json` (two universes: `usbpro` and `artnet`; 8 × rgbw pars, 4 × `example-mover-16bit`, 2 × dimmers, 1 × `example-inverted-dimmer`), `fixtures/venues/synthetic-b.json` (4 pars, no movers, 2 dimmers)
- Create: `src/__tests__/fixtures.test.ts`

Content requirements for `synthetic` (spec 1.1): programs `hsv-sweep` (out.color hsv, `lfo` on hue), `palette` (color from three parameters), `chase` (spread, `member` phase offset into `lfo`), `mover-circle` (out.position from two `lfo`s), `strobe-burst` (out.strobe, `adsr`), `wash` scene with `fadeInBeats 2` on members `[0,1,2,3]` color only, a `subgraph` `pulse` used by `hsv-sweep` and `chase`; instances covering `all`, `per-member`, `spread`, one with `routing`, one `legacy`, two with priorities 0 and 10 on the same group; bindings on `midi.cc`, `midi.cc14`, `midi.polyAftertouch`, `osc`, `audio`, across channels 1 and 2; every override bound; `songs` with two entries; `timeline.mid` a minimal SMF (type 1, 120 bpm, 8 bars) with the mapped notes and one CC lane, generated by a small script `src/scripts/write-synthetic-timeline.ts`.

- [ ] **Step 1: Failing tests**: every file under `fixtures/` validates against its schema; every lint returns zero `error`s (warnings allowed and asserted by count: `hilldale-physical` 0, `synthetic-b` patch ≥ 1 for the mover fallback); `proposePatch(hilldale-reauthored, hilldale-physical)` fills every position; `channelMap` of the re-authored show on `hilldale-physical` reaches the same 21 addresses as the literal (set equality per note is **not** expected; assert the set of all addresses touched equals 1..21 and note 21 reaches exactly `[4,10,16,19]`); `proposePatch(synthetic, synthetic-b)` folds the 8-par group to `[[a,b],[c,d],[e,f],[g,h]]`-shaped positions and yields a fallback for `position` on the movers group.
- [ ] **Step 2: Run** → FAIL. **Step 3: Author the fixtures** (by hand, ids fixed uuids). **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `fixtures: re-authored HILLDALE and synthetic full-featured show`.

---

### Task 12: Health computation

**Files:**
- Create: `src/health.ts`, `src/midi/smf.ts` (minimal SMF reader: notes with channel/start/end, CCs, program changes, tempo), `src/__tests__/health.test.ts`

**Interfaces:**
- Produces: `readSmf(bytes: Uint8Array): Timeline` with `Timeline = { ppq; tempo: {tick, bpm}[]; notes: {channel, note, startTick, endTick, velocity}[]; ccs: {channel, cc, tick, value}[]; programChanges: {channel, program, tick}[] }`; `health(input: { show; programs; venue; patch; types; timeline?: Timeline }): Issue[]` producing the spec 7 list with codes `unfilled-position`, `missing-capability`, `address-overlap`, `missing-program`, `unused-note`, `unmapped-note`, `unmapped-channel`, `offset-stale`.

- [ ] **Step 1: Failing tests**: `readSmf(synthetic timeline)` finds the expected note count; `health` on `synthetic` + `synthetic-b` contains `missing-capability` for the movers group; a show mapping note 99 that the timeline never plays → `unused-note`; a timeline note on channel 5 with no mapping → `unmapped-channel`; literal HILLDALE with its venue → `[]` apart from `address-overlap` warnings count `0`; a show with a missing program → `missing-program` and no throw.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(model-tools): health computation and SMF reader`.

---

### Task 13: Settings schema, file layout doc, and repo gate

**Files:**
- Create: `schemas/settings.schema.json` (spec 3.11), `fixtures/settings.json`, `docs/file-layout.md` (spec 4 verbatim with the `.ptah-settings.json` V1 note), `docs/schemas.md` (one paragraph per schema, link to spec section)
- Modify: `README.md` (how Step 1 consumes these: "the Rust engine must reproduce `fixtures/oracles/*` and pass `fixtures/**` through its own validator")
- Create: `src/__tests__/all-fixtures.test.ts` (walks `fixtures/`, validates every JSON by its `schema` tag, runs every applicable lint, asserts zero errors — the single test Step 1 will port)

**Interfaces:**
- Produces: `validateTree(root: string): { file: string; issues: Issue[] }[]` exported from `src/index.ts` together with every public function of Tasks 2–12.

- [ ] **Step 1: Failing test**: `validateTree(fixturesDir)` has no `error`-level issue in any file; `fixtures/settings.json` validates.
- [ ] **Step 2: Implement** schema, docs, `src/index.ts` exports. **Step 3: Run `pnpm allcheck`** → all green.
- [ ] **Step 4: Commit** `docs: file layout, schema index, step 0 gate` and tag `step0-complete`.

---

## Self-review notes

- Spec coverage: 3.1 → T3; 3.2 → T4; 3.3–3.8, 3.10 → T5; 3.9 → T6; 3.11 → T13; 4 → T13; 5 → T7, T9; 6 → T10; 7 → T12; 1.1 synthetic → T11; chase (6.1 step 1) is specified in `docs/vm-instruction-set.md` (T10) as the voice-rebuild rule over `Timeline` (T12) but has no reference implementation here — Step 1 implements it; noted in the doc as "engine-only".
- Names used across tasks: `Issue`, `validate`, `capabilitiesOf`, `lintVenue/lintProgram/lintShow`, `fold`, `proposePatch`, `importV1`, `collapse`, `channelMap`, `compileProgram/evaluate/render`, `readSmf`, `health`, `validateTree` — consistent.
- Review Focus items are pinned to T10 (16-bit), T5/T12 (missing program), T5 (range), T6 (no capability), T7 (audio/cycle).
