# Tests & Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Write comprehensive tests for all pure-logic packages and the API service, and fix all bugs discovered during exploration.

**Architecture:** Tests live alongside source under `src/__tests__/`. Pure-logic packages (lib-utils, lib-domains, lib-models) need no mocking. Service-api tests use supertest with mocked file repositories. Service-midi tests mock the pubsub service.

**Tech Stack:** Jest + ts-jest (via `@ptah-app/config-jest`), supertest for HTTP, pnpm workspace aliases for jest preset resolution.

---

## Bugs Inventory

| # | Location | Description |
|---|----------|-------------|
| B1 | `packages/lib-utils/src/clamp.ts:9` | `clampGraph([5,5,5])` → NaN (divides by `max-min = 0`) |
| B2 | `apps/service-api/src/routes/show.route.ts:50` | `GET /show/:name` returns status **201** (should be 200) |
| B3 | `apps/service-api/src/routes/show.route.ts:71` | `PUT /show/:name` returns status **201** (should be 200) |
| B4 | `apps/service-api/src/routes/program.route.ts:83` | `PUT /program/:name` returns status **201** (should be 200) |
| B5 | `apps/service-midi/src/midi-handlers.ts:20` | `updateTempo` sends stale `tempo` value before assigning `newTempo` |
| B6 | `apps/service-midi/src/midi-handlers.ts:67` | `controlId <= 13` silently drops CC messages 14–127 with no justification |
| B7 | `packages/lib-models/src/pubsub-message.models.ts:65,98` | Typo: `ShowLoadSucess`, `ProgramSaveSucess` (missing 'c') |
| B8 | `packages/lib-models/src/edge.model.ts:10` | Typo: `targetIntput` (should be `targetInput`) |

> **Note on B7 & B8:** These are public API typos baked into pubsub message types and the edge model. Fixing them is a breaking rename. Tasks below fix the typos AND update every callsite.

---

## File Map

**New test files:**
- `packages/lib-utils/src/__tests__/clamp.test.ts`
- `packages/lib-utils/src/__tests__/array.test.ts`
- `packages/lib-utils/src/__tests__/debounce.test.ts`
- `packages/lib-utils/src/__tests__/easing.test.ts`
- `packages/lib-utils/src/__tests__/range.test.ts`
- `packages/lib-utils/src/__tests__/types.test.ts`
- `packages/lib-domains/src/__tests__/runner.domain.test.ts`
- `packages/lib-domains/src/__tests__/patch.domain.test.ts`
- `packages/lib-domains/src/__tests__/program.domain.test.ts`
- `packages/lib-domains/src/__tests__/settings.domain.test.ts`
- `packages/lib-domains/src/__tests__/show.domain.test.ts`
- `packages/lib-models/src/__tests__/models.test.ts`
- `apps/service-api/src/__tests__/show.routes.test.ts`
- `apps/service-api/src/__tests__/program.routes.test.ts`
- `apps/service-midi/src/__tests__/midi-handlers.test.ts`

**Modified source files (bug fixes):**
- `packages/lib-utils/src/clamp.ts` (B1)
- `apps/service-api/src/routes/show.route.ts` (B2, B3)
- `apps/service-api/src/routes/program.route.ts` (B4)
- `apps/service-midi/src/midi-handlers.ts` (B5, B6)
- `packages/lib-models/src/pubsub-message.models.ts` (B7)
- `packages/lib-models/src/edge.model.ts` (B8)
- `packages/lib-domains/src/program.domain.ts` (callsite of B8: `targetIntput`)
- All packages' `package.json` — add `"jest-presets"` alias so the existing preset path resolves

---

## Task 1: Fix jest-presets alias in all packages

The preset `jest-presets/jest/node` resolves to `@ptah-app/config-jest/jest/node`, but the alias is missing from every `devDependencies`. Until this is fixed, no `pnpm test` in any workspace package works.

**Files:** every `package.json` that has `"@ptah-app/config-jest": "workspace:*"` in devDependencies:
- `packages/lib-utils/package.json`
- `packages/lib-domains/package.json`
- `packages/lib-models/package.json`
- `packages/lib-shared/package.json`
- `apps/service-api/package.json`
- `apps/service-midi/package.json`

- [ ] **Step 1: Add alias to each devDependencies block**

In each file listed above, inside `"devDependencies"`, add:
```json
"jest-presets": "npm:@ptah-app/config-jest@*"
```

- [ ] **Step 2: Install**

```bash
cd /path/to/ptah && pnpm install
```

Expected: `node_modules/jest-presets` symlink appears in each package (or pnpm resolves it via virtual store).

- [ ] **Step 3: Verify preset resolves**

```bash
cd packages/lib-utils && pnpm test
```

Expected: `No tests found, exiting with code 1` (or similar — error about no test files, NOT about preset not found).

- [ ] **Step 4: Commit**

```bash
git add packages/lib-utils/package.json packages/lib-domains/package.json packages/lib-models/package.json packages/lib-shared/package.json apps/service-api/package.json apps/service-midi/package.json pnpm-lock.yaml
git commit -m "fix(jest): add jest-presets alias so preset path resolves in all packages

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 2: Fix B1 — clampGraph NaN on constant arrays

**Files:** `packages/lib-utils/src/clamp.ts`, `packages/lib-utils/src/__tests__/clamp.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/lib-utils/src/__tests__/clamp.test.ts`:

```typescript
import { clamp, clampGraph } from "../clamp";

describe("clamp", () => {
  it("clamps value below min to min", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });
  it("clamps value above max to max", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
  it("returns value when within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it("returns min when value equals min", () => {
    expect(clamp(0, 0, 10)).toBe(0);
  });
  it("returns max when value equals max", () => {
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe("clampGraph", () => {
  it("normalizes a spread array to [0, 1] range", () => {
    expect(clampGraph([0, 5, 10])).toEqual([0, 0.5, 1]);
  });
  it("handles negative values", () => {
    expect(clampGraph([-10, 0, 10])).toEqual([0, 0.5, 1]);
  });
  it("returns zeros when all values are the same (not NaN)", () => {
    // BUG: currently returns [NaN, NaN, NaN] — divide by (max-min) = 0
    expect(clampGraph([5, 5, 5])).toEqual([0, 0, 0]);
  });
  it("returns [0] for a single-element array", () => {
    expect(clampGraph([42])).toEqual([0]);
  });
  it("handles array with two identical values", () => {
    expect(clampGraph([3, 3])).toEqual([0, 0]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd packages/lib-utils && pnpm test
```

Expected: FAIL on `returns zeros when all values are the same (not NaN)` — `[NaN, NaN, NaN]` received.

- [ ] **Step 3: Fix clampGraph in clamp.ts**

Replace the function body in `packages/lib-utils/src/clamp.ts`:

```typescript
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const clampGraph = (values: number[]): number[] => {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min;

  if (range === 0) {
    return values.map(() => 0);
  }

  return values.map((value) => (value - min) / range);
};
```

- [ ] **Step 4: Run to verify it passes**

```bash
cd packages/lib-utils && pnpm test
```

Expected: all `clamp` and `clampGraph` tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/lib-utils/src/clamp.ts packages/lib-utils/src/__tests__/clamp.test.ts
git commit -m "fix(lib-utils): clampGraph returns zeros instead of NaN for constant arrays

When all values are equal max-min is 0, causing divide-by-zero NaN.
Guard with a range === 0 early return that maps to 0.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 3: Tests for remaining lib-utils helpers

**Files:** `packages/lib-utils/src/__tests__/array.test.ts`, `packages/lib-utils/src/__tests__/debounce.test.ts`, `packages/lib-utils/src/__tests__/easing.test.ts`, `packages/lib-utils/src/__tests__/range.test.ts`, `packages/lib-utils/src/__tests__/types.test.ts`

- [ ] **Step 1: Create array.test.ts**

```typescript
import { deduplicate } from "../array";

describe("deduplicate", () => {
  it("removes duplicate primitives", () => {
    expect(deduplicate([1, 2, 2, 3])).toEqual([1, 2, 3]);
  });
  it("preserves order (first occurrence wins)", () => {
    expect(deduplicate([3, 1, 2, 1, 3])).toEqual([3, 1, 2]);
  });
  it("returns same array when no duplicates", () => {
    expect(deduplicate([1, 2, 3])).toEqual([1, 2, 3]);
  });
  it("handles empty array", () => {
    expect(deduplicate([])).toEqual([]);
  });
  it("handles single element", () => {
    expect(deduplicate([42])).toEqual([42]);
  });
  it("uses custom predicate for object equality", () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 1 }];
    const result = deduplicate(items, (a, b) => a.id === b.id);
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });
});
```

- [ ] **Step 2: Create easing.test.ts**

```typescript
import { easeOutQuint, easeOutQuintInvert } from "../easing";

describe("easeOutQuint", () => {
  it("returns 0 at x=0", () => {
    expect(easeOutQuint(0)).toBeCloseTo(0);
  });
  it("returns 1 at x=1", () => {
    expect(easeOutQuint(1)).toBeCloseTo(1);
  });
  it("returns value between 0 and 1 for midpoint", () => {
    const v = easeOutQuint(0.5);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(1);
  });
  it("is monotonically increasing", () => {
    expect(easeOutQuint(0.3)).toBeLessThan(easeOutQuint(0.7));
  });
});

describe("easeOutQuintInvert", () => {
  it("returns 1 at x=0", () => {
    expect(easeOutQuintInvert(0)).toBeCloseTo(1);
  });
  it("returns 0 at x=1", () => {
    expect(easeOutQuintInvert(1)).toBeCloseTo(0);
  });
  it("is inverse of easeOutQuint (approximately)", () => {
    expect(easeOutQuintInvert(0.5)).toBeCloseTo(1 - easeOutQuint(0.5));
  });
});
```

- [ ] **Step 3: Create range.test.ts**

```typescript
import { range } from "../range";

describe("range", () => {
  it("returns array [0..n-1] for positive n", () => {
    expect(range(5)).toEqual([0, 1, 2, 3, 4]);
  });
  it("returns empty array for n=0", () => {
    expect(range(0)).toEqual([]);
  });
  it("returns [0] for n=1", () => {
    expect(range(1)).toEqual([0]);
  });
});
```

- [ ] **Step 4: Create types.test.ts**

```typescript
import { isDefined } from "../types";

describe("isDefined", () => {
  it("returns true for defined values", () => {
    expect(isDefined(0)).toBe(true);
    expect(isDefined("")).toBe(true);
    expect(isDefined(false)).toBe(true);
    expect(isDefined(null)).toBe(true);
  });
  it("returns false for undefined", () => {
    expect(isDefined(undefined)).toBe(false);
  });
});
```

- [ ] **Step 5: Create debounce.test.ts**

```typescript
import { debounce } from "../debounce";

jest.useFakeTimers();

describe("debounce (trailing)", () => {
  it("calls function once after wait ms", () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced();
    debounced();
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("resets the timer on each call", () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced();
    jest.advanceTimersByTime(50);
    debounced();
    jest.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("debounce (immediate/leading)", () => {
  it("calls function immediately on first invocation", () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100, true);

    debounced();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does not call again until after wait ms of silence", () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100, true);

    debounced();
    debounced();
    debounced();
    expect(fn).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(100);
    debounced();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 6: Run all lib-utils tests**

```bash
cd packages/lib-utils && pnpm test
```

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/lib-utils/src/__tests__/
git commit -m "test(lib-utils): add tests for array, debounce, easing, range, types

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 4: Tests for lib-domains — runner, patch, settings, show

**Files:** `packages/lib-domains/src/__tests__/runner.domain.test.ts`, `packages/lib-domains/src/__tests__/patch.domain.test.ts`, `packages/lib-domains/src/__tests__/settings.domain.test.ts`, `packages/lib-domains/src/__tests__/show.domain.test.ts`

- [ ] **Step 1: Create runner.domain.test.ts**

```typescript
import { adsr, distortion, mathNodeOperatorHasSecondValue } from "../runner.domain";

describe("adsr", () => {
  const fn = adsr(0.1, 0.1, 0.5, 0.1);

  it("returns 0 at t=0 (start of attack)", () => {
    expect(fn(0)).toBeCloseTo(0);
  });

  it("reaches near 1 at end of attack phase (t = attackRate)", () => {
    expect(fn(0.1)).toBeCloseTo(1, 1);
  });

  it("decays toward sustainLevel during decay phase", () => {
    const v = fn(0.15); // midway through decay
    expect(v).toBeGreaterThan(0.5);
    expect(v).toBeLessThan(1);
  });

  it("holds sustainLevel during sustain phase", () => {
    expect(fn(0.5)).toBeCloseTo(0.5, 1);
  });

  it("releases from sustainLevel toward 0 at end", () => {
    const v = fn(0.95); // midway through release
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(0.5);
  });

  it("clamps output to [0, 1]", () => {
    // attack overshoot is clamped
    expect(fn(0.05)).toBeGreaterThanOrEqual(0);
    expect(fn(0.05)).toBeLessThanOrEqual(1);
  });

  it("handles zero attack rate (immediate onset)", () => {
    const instant = adsr(0, 0.1, 0.5, 0.1);
    expect(instant(0)).toBeCloseTo(1, 1);
  });
});

describe("distortion", () => {
  it("returns a number", () => {
    const fn = distortion(0.5, 0.5, 0.5, 0.5);
    expect(typeof fn(0)).toBe("number");
  });

  it("with zero drive produces simple linear output", () => {
    // drive=0 eliminates the harmonic terms; result = value * level + (1-level)/2
    const fn = distortion(0.5, 0, 0.5, 0.5);
    expect(fn(0)).toBeCloseTo(0.5 * 0.5 + 0.5 / 2);
  });

  it("outputs differ for different time values when drive > 0", () => {
    const fn = distortion(0.5, 0.8, 0.5, 0.5);
    expect(fn(0)).not.toBeCloseTo(fn(0.5));
  });
});

describe("mathNodeOperatorHasSecondValue", () => {
  it.each(["add", "substract", "divide", "multiply", "modulo", "power"])(
    "returns true for binary operator %s",
    (op) => {
      expect(mathNodeOperatorHasSecondValue(op)).toBe(true);
    }
  );

  it.each(["sinus", "cosinus", "tangent", "arcsinus", "arccosinus", "arctangent", "exponential", "logarithm", "square-root", "absolute", "round", "floor", "ceil"])(
    "returns false for unary operator %s",
    (op) => {
      expect(mathNodeOperatorHasSecondValue(op)).toBe(false);
    }
  );

  it("returns false for unknown operator", () => {
    expect(mathNodeOperatorHasSecondValue("unknown")).toBe(false);
  });
});
```

- [ ] **Step 2: Create patch.domain.test.ts**

```typescript
import {
  applyMapping,
  capValue,
  extractProgramMappingFromShowPatch,
  fromChannelValue,
  toChannelValue,
  unInfinitifyValue,
  unNaNifyValue,
} from "../patch.domain";

describe("unNaNifyValue", () => {
  it("returns 0 for NaN", () => expect(unNaNifyValue(NaN)).toBe(0));
  it("passes through finite numbers", () => expect(unNaNifyValue(0.5)).toBe(0.5));
  it("passes through 0", () => expect(unNaNifyValue(0)).toBe(0));
});

describe("unInfinitifyValue", () => {
  it("maps +Infinity to 255", () => expect(unInfinitifyValue(Infinity)).toBe(255));
  it("maps -Infinity to 0", () => expect(unInfinitifyValue(-Infinity)).toBe(0));
  it("maps NaN (non-finite) to 0", () => expect(unInfinitifyValue(NaN)).toBe(0));
  it("passes through finite values", () => expect(unInfinitifyValue(0.7)).toBe(0.7));
});

describe("capValue", () => {
  it("converts 0.0 to 0", () => expect(capValue(0)).toBe(0));
  it("converts 1.0 to 255", () => expect(capValue(1)).toBe(255));
  it("converts 0.5 to 128 (rounds)", () => expect(capValue(0.5)).toBe(128));
  it("clamps below 0 to 0", () => expect(capValue(-1)).toBe(0));
  it("clamps above 1 to 255", () => expect(capValue(2)).toBe(255));
});

describe("toChannelValue", () => {
  it("converts NaN to 0", () => expect(toChannelValue(NaN)).toBe(0));
  it("converts Infinity to 255", () => expect(toChannelValue(Infinity)).toBe(255));
  it("converts -Infinity to 0", () => expect(toChannelValue(-Infinity)).toBe(0));
  it("converts 0.5 to 128", () => expect(toChannelValue(0.5)).toBe(128));
  it("converts 1.0 to 255", () => expect(toChannelValue(1)).toBe(255));
  it("converts 0.0 to 0", () => expect(toChannelValue(0)).toBe(0));
});

describe("fromChannelValue", () => {
  it("converts 255 to 1", () => expect(fromChannelValue(255)).toBe(1));
  it("converts 0 to 0", () => expect(fromChannelValue(0)).toBe(0));
  it("clamps above 255 to 1", () => expect(fromChannelValue(300)).toBe(1));
  it("clamps below 0 to 0", () => expect(fromChannelValue(-50)).toBe(0));
});

describe("extractProgramMappingFromShowPatch", () => {
  const programId = "abc-123";

  it("returns empty mapping when patch is empty", () => {
    expect(extractProgramMappingFromShowPatch({}, programId)).toEqual({});
  });

  it("maps a single channel output correctly", () => {
    const patch = {
      "1": [{ programId, programOutput: 0 }],
    };
    expect(extractProgramMappingFromShowPatch(patch, programId)).toEqual({
      0: [1],
    });
  });

  it("maps multiple outputs to different channels", () => {
    const patch = {
      "1": [{ programId, programOutput: 0 }],
      "2": [{ programId, programOutput: 1 }],
    };
    const result = extractProgramMappingFromShowPatch(patch, programId);
    expect(result).toEqual({ 0: [1], 1: [2] });
  });

  it("maps one output to multiple channels (fan-out)", () => {
    const patch = {
      "1": [{ programId, programOutput: 0 }],
      "2": [{ programId, programOutput: 0 }],
    };
    const result = extractProgramMappingFromShowPatch(patch, programId);
    expect(result[0]).toContain(1);
    expect(result[0]).toContain(2);
  });

  it("ignores entries for other programIds", () => {
    const patch = {
      "1": [{ programId: "other-program", programOutput: 0 }],
      "2": [{ programId, programOutput: 0 }],
    };
    const result = extractProgramMappingFromShowPatch(patch, programId);
    expect(result).toEqual({ 0: [2] });
  });
});

describe("applyMapping", () => {
  it("applies a single output to a single channel", () => {
    const output = {
      outputs: { 0: 0.5 },
      registry: new Map(),
    };
    const mapping = { 0: [10] };
    expect(applyMapping(output, mapping)).toEqual({ 10: 128 });
  });

  it("fans out one output to multiple channels", () => {
    const output = {
      outputs: { 0: 1.0 },
      registry: new Map(),
    };
    const mapping = { 0: [1, 2, 3] };
    expect(applyMapping(output, mapping)).toEqual({ 1: 255, 2: 255, 3: 255 });
  });

  it("returns empty for empty mapping", () => {
    const output = { outputs: { 0: 0.5 }, registry: new Map() };
    expect(applyMapping(output, {})).toEqual({});
  });
});
```

- [ ] **Step 3: Create settings.domain.test.ts**

```typescript
import { createSettings } from "../settings.domain";

describe("createSettings", () => {
  it("returns an object with required fields", () => {
    const s = createSettings();
    expect(s.version).toBe("0.0.1");
    expect(s.midiVirtualPortName).toBe("ptah");
    expect(s.midiChannel).toBe(1);
    expect(s.appAdminPort).toBe(3001);
  });

  it("does not include currentShow by default", () => {
    expect(createSettings().currentShow).toBeUndefined();
  });
});
```

- [ ] **Step 4: Create show.domain.test.ts**

```typescript
import { createShow } from "../show.domain";

describe("createShow", () => {
  it("creates a show with the given name", () => {
    const show = createShow("my-show");
    expect(show.name).toBe("my-show");
  });

  it("assigns a UUID id", () => {
    const show = createShow("test");
    expect(show.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it("initializes empty mapping, patch, and programs", () => {
    const show = createShow("test");
    expect(show.mapping).toEqual({});
    expect(show.patch).toEqual({});
    expect(show.programs).toEqual({});
  });

  it("generates different ids for each call", () => {
    const a = createShow("a");
    const b = createShow("b");
    expect(a.id).not.toBe(b.id);
  });
});
```

- [ ] **Step 5: Run lib-domains tests**

```bash
cd packages/lib-domains && pnpm test
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/lib-domains/src/__tests__/
git commit -m "test(lib-domains): add tests for runner, patch, settings, show domains

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 5: Tests for lib-domains — program.domain (compile + evaluate)

**Files:** `packages/lib-domains/src/__tests__/program.domain.test.ts`

This is the most complex test file. It exercises the node graph compiler end-to-end.

- [ ] **Step 1: Create program.domain.test.ts**

```typescript
import { compile, createProgram, getProgramInitialState, performTick } from "../program.domain";
import type { Program } from "@ptah-app/lib-models";
import { v4 as uuidv4 } from "uuid";

const pos = { x: 0, y: 0 };

// Helpers to build valid nodes and edges
const constantNode = (id: string, value: number) => ({
  id,
  type: "input-constant" as const,
  position: pos,
  value,
});

const timeNode = (id: string) => ({
  id,
  type: "input-time" as const,
  position: pos,
});

const controlNode = (id: string, controlId: number, defaultValue = 0) => ({
  id,
  type: "input-control" as const,
  position: pos,
  controlId,
  defaultValue,
});

const velocityNode = (id: string, defaultValue = 0) => ({
  id,
  type: "input-velocity" as const,
  position: pos,
  defaultValue,
});

const outputNode = (id: string, outputId: number) => ({
  id,
  type: "output-result" as const,
  position: pos,
  outputId,
});

const mathNode = (
  id: string,
  operation: string,
  valueA = 0,
  valueB = 0
) => ({
  id,
  type: "fx-math" as const,
  position: pos,
  operation: operation as any,
  valueA,
  valueB,
});

const adsrNode = (
  id: string,
  attackRate = 0.1,
  decayRate = 0.1,
  sustainLevel = 0.5,
  releaseRate = 0.1
) => ({
  id,
  type: "fx-adsr" as const,
  position: pos,
  attackRate,
  decayRate,
  sustainLevel,
  releaseRate,
});

const edge = (
  source: string,
  target: string,
  sourceOutput = 0,
  targetIntput = 0
) => ({
  id: uuidv4(),
  source,
  target,
  sourceOutput,
  targetIntput,
});

const emptyControls = new Map<number, number>();

describe("createProgram", () => {
  it("creates a program with the given name", () => {
    const p = createProgram("test");
    expect(p.name).toBe("test");
    expect(p.nodes).toEqual([]);
    expect(p.edges).toEqual([]);
  });

  it("assigns unique UUIDs", () => {
    const a = createProgram("a");
    const b = createProgram("b");
    expect(a.id).not.toBe(b.id);
  });
});

describe("compile — empty program", () => {
  it("returns empty outputs for a program with no output nodes", () => {
    const prog: Program = { id: uuidv4(), name: "empty", nodes: [], edges: [] };
    const compute = compile(prog);
    const result = compute(0, emptyControls);
    expect(result.outputs).toEqual({});
  });
});

describe("compile — constant → output", () => {
  const prog: Program = {
    id: uuidv4(),
    name: "const-out",
    nodes: [constantNode("c", 0.5), outputNode("out", 0)],
    edges: [edge("c", "out", 0, 0)],
  };
  const compute = compile(prog);

  it("passes constant value to output", () => {
    const result = compute(0, emptyControls);
    expect(result.outputs[0]).toBe(0.5);
  });

  it("output is same at any time (constant is time-independent)", () => {
    expect(compute(0, emptyControls).outputs[0]).toBe(
      compute(100, emptyControls).outputs[0]
    );
  });
});

describe("compile — time → output", () => {
  const prog: Program = {
    id: uuidv4(),
    name: "time-out",
    nodes: [timeNode("t"), outputNode("out", 0)],
    edges: [edge("t", "out", 0, 0)],
  };
  const compute = compile(prog);

  it("passes time as output", () => {
    expect(compute(0.42, emptyControls).outputs[0]).toBe(0.42);
  });
});

describe("compile — control → output", () => {
  const prog: Program = {
    id: uuidv4(),
    name: "ctrl-out",
    nodes: [controlNode("ctrl", 7, 0), outputNode("out", 0)],
    edges: [edge("ctrl", "out", 0, 0)],
  };
  const compute = compile(prog);

  it("uses control value from inputs map", () => {
    const inputs = new Map([[7, 0.8]]);
    expect(compute(0, inputs).outputs[0]).toBe(0.8);
  });

  it("falls back to defaultValue when control not in map", () => {
    expect(compute(0, emptyControls).outputs[0]).toBe(0);
  });
});

describe("compile — velocity → output", () => {
  const prog: Program = {
    id: uuidv4(),
    name: "vel-out",
    nodes: [velocityNode("v", 0), outputNode("out", 0)],
    edges: [edge("v", "out", 0, 0)],
  };
  const compute = compile(prog);

  it("uses parameter as velocity", () => {
    expect(compute(0, emptyControls, 0.9).outputs[0]).toBe(0.9);
  });

  it("falls back to defaultValue when parameter is undefined", () => {
    expect(compute(0, emptyControls, undefined).outputs[0]).toBe(0);
  });
});

describe("compile — math node (add)", () => {
  const prog: Program = {
    id: uuidv4(),
    name: "add-out",
    nodes: [
      constantNode("a", 0.3),
      constantNode("b", 0.2),
      mathNode("m", "add"),
      outputNode("out", 0),
    ],
    edges: [
      edge("a", "m", 0, 0),
      edge("b", "m", 0, 1),
      edge("m", "out", 0, 0),
    ],
  };
  const compute = compile(prog);

  it("adds two constants", () => {
    expect(compute(0, emptyControls).outputs[0]).toBeCloseTo(0.5);
  });
});

describe("compile — math node operations", () => {
  const makeProgram = (op: string, a: number, b: number): Program => ({
    id: uuidv4(),
    name: op,
    nodes: [
      constantNode("a", a),
      constantNode("b", b),
      mathNode("m", op),
      outputNode("out", 0),
    ],
    edges: [
      edge("a", "m", 0, 0),
      edge("b", "m", 0, 1),
      edge("m", "out", 0, 0),
    ],
  });

  it("substract", () => {
    expect(compile(makeProgram("substract", 1, 0.3))(0, emptyControls).outputs[0]).toBeCloseTo(0.7);
  });
  it("multiply", () => {
    expect(compile(makeProgram("multiply", 2, 3))(0, emptyControls).outputs[0]).toBeCloseTo(6);
  });
  it("divide", () => {
    expect(compile(makeProgram("divide", 1, 4))(0, emptyControls).outputs[0]).toBeCloseTo(0.25);
  });
  it("modulo", () => {
    expect(compile(makeProgram("modulo", 7, 3))(0, emptyControls).outputs[0]).toBeCloseTo(1);
  });
  it("power", () => {
    expect(compile(makeProgram("power", 2, 3))(0, emptyControls).outputs[0]).toBeCloseTo(8);
  });

  const makeUnaryProgram = (op: string, a: number): Program => ({
    id: uuidv4(),
    name: op,
    nodes: [
      constantNode("a", a),
      mathNode("m", op),
      outputNode("out", 0),
    ],
    edges: [
      edge("a", "m", 0, 0),
      edge("m", "out", 0, 0),
    ],
  });

  it("sinus", () => {
    expect(compile(makeUnaryProgram("sinus", Math.PI / 2))(0, emptyControls).outputs[0]).toBeCloseTo(1);
  });
  it("cosinus", () => {
    expect(compile(makeUnaryProgram("cosinus", 0))(0, emptyControls).outputs[0]).toBeCloseTo(1);
  });
  it("absolute", () => {
    expect(compile(makeUnaryProgram("absolute", -5))(0, emptyControls).outputs[0]).toBeCloseTo(5);
  });
  it("square-root", () => {
    expect(compile(makeUnaryProgram("square-root", 9))(0, emptyControls).outputs[0]).toBeCloseTo(3);
  });
  it("round", () => {
    expect(compile(makeUnaryProgram("round", 2.7))(0, emptyControls).outputs[0]).toBe(3);
  });
  it("floor", () => {
    expect(compile(makeUnaryProgram("floor", 2.9))(0, emptyControls).outputs[0]).toBe(2);
  });
  it("ceil", () => {
    expect(compile(makeUnaryProgram("ceil", 2.1))(0, emptyControls).outputs[0]).toBe(3);
  });
});

describe("compile — multiple outputs", () => {
  const prog: Program = {
    id: uuidv4(),
    name: "multi-out",
    nodes: [
      constantNode("c1", 0.1),
      constantNode("c2", 0.9),
      outputNode("out1", 0),
      outputNode("out2", 1),
    ],
    edges: [
      edge("c1", "out1", 0, 0),
      edge("c2", "out2", 0, 0),
    ],
  };
  const compute = compile(prog);

  it("writes to distinct output slots", () => {
    const result = compute(0, emptyControls);
    expect(result.outputs[0]).toBeCloseTo(0.1);
    expect(result.outputs[1]).toBeCloseTo(0.9);
  });
});

describe("compile — output with no connected input defaults to 0", () => {
  const prog: Program = {
    id: uuidv4(),
    name: "disconnected-out",
    nodes: [outputNode("out", 0)],
    edges: [],
  };
  const compute = compile(prog);

  it("defaults disconnected output to 0", () => {
    expect(compile(prog)(0, emptyControls).outputs[0]).toBe(0);
  });
});

describe("compile — cycle detection (visited guard)", () => {
  it("does not infinite-loop on cyclic edges", () => {
    const prog: Program = {
      id: uuidv4(),
      name: "cyclic",
      nodes: [
        mathNode("a", "add"),
        outputNode("out", 0),
      ],
      edges: [
        edge("a", "a", 0, 0), // self-loop
        edge("a", "out", 0, 0),
      ],
    };
    expect(() => compile(prog)(0, emptyControls)).not.toThrow();
  });
});

describe("performTick", () => {
  const prog: Program = {
    id: uuidv4(),
    name: "tick",
    nodes: [timeNode("t"), outputNode("out", 0)],
    edges: [edge("t", "out", 0, 0)],
  };
  const definition = { compute: compile(prog), resetAtEnd: false };
  const initialState = getProgramInitialState(definition, emptyControls);

  it("increments time by 1/24 per tick", () => {
    const next = performTick(definition, emptyControls, initialState, 0);
    expect(next.time).toBeCloseTo(1 / 24);
  });

  it("output reflects new time value", () => {
    const next = performTick(definition, emptyControls, initialState, 0);
    expect(next.output.outputs[0]).toBeCloseTo(1 / 24);
  });
});
```

- [ ] **Step 2: Run to verify all pass**

```bash
cd packages/lib-domains && pnpm test
```

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/lib-domains/src/__tests__/program.domain.test.ts
git commit -m "test(lib-domains): add comprehensive program.domain compile/evaluate tests

Tests cover: empty programs, constant/time/control/velocity inputs, all math
operators, multi-output, disconnected defaults, cycle detection, performTick.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 6: Tests for lib-models Zod schemas

**Files:** `packages/lib-models/src/__tests__/models.test.ts`

- [ ] **Step 1: Create models.test.ts**

```typescript
import { v4 as uuidv4 } from "uuid";
import {
  edge,
  node,
  program,
  programName,
  settings,
  show,
  showName,
} from "../index";

const validUuid = uuidv4();
const pos = { x: 0, y: 0 };

describe("programName", () => {
  it("accepts alphanumeric and hyphens", () => {
    expect(programName.safeParse("my-program-1").success).toBe(true);
  });
  it("rejects empty string", () => {
    expect(programName.safeParse("").success).toBe(false);
  });
  it("rejects spaces", () => {
    expect(programName.safeParse("my program").success).toBe(false);
  });
  it("rejects special chars", () => {
    expect(programName.safeParse("prog!@#").success).toBe(false);
  });
});

describe("showName", () => {
  it("accepts valid names", () => {
    expect(showName.safeParse("show-001").success).toBe(true);
  });
  it("rejects empty", () => {
    expect(showName.safeParse("").success).toBe(false);
  });
});

describe("settings", () => {
  const valid = {
    version: "0.0.1",
    midiVirtualPortName: "ptah",
    midiChannel: 1,
    appAdminPort: 3001,
  };

  it("parses valid settings", () => {
    expect(settings.safeParse(valid).success).toBe(true);
  });
  it("rejects midiChannel < 1", () => {
    expect(settings.safeParse({ ...valid, midiChannel: 0 }).success).toBe(false);
  });
  it("rejects midiChannel > 16", () => {
    expect(settings.safeParse({ ...valid, midiChannel: 17 }).success).toBe(false);
  });
  it("rejects appAdminPort < 1024", () => {
    expect(settings.safeParse({ ...valid, appAdminPort: 80 }).success).toBe(false);
  });
  it("accepts optional currentShow", () => {
    expect(settings.safeParse({ ...valid, currentShow: "my-show" }).success).toBe(true);
  });
});

describe("edge", () => {
  const valid = {
    id: validUuid,
    source: "node-a",
    target: "node-b",
    sourceOutput: 0,
    targetIntput: 0,
  };
  it("parses valid edge", () => {
    expect(edge.safeParse(valid).success).toBe(true);
  });
  it("rejects missing source", () => {
    const { source: _, ...rest } = valid;
    expect(edge.safeParse(rest).success).toBe(false);
  });
});

describe("node union", () => {
  it("parses input-constant node", () => {
    expect(node.safeParse({ id: validUuid, type: "input-constant", position: pos, value: 0.5 }).success).toBe(true);
  });
  it("parses input-time node", () => {
    expect(node.safeParse({ id: validUuid, type: "input-time", position: pos }).success).toBe(true);
  });
  it("parses input-control node", () => {
    expect(node.safeParse({ id: validUuid, type: "input-control", position: pos, controlId: 1, defaultValue: 0 }).success).toBe(true);
  });
  it("rejects input-control with defaultValue > 255", () => {
    expect(node.safeParse({ id: validUuid, type: "input-control", position: pos, controlId: 1, defaultValue: 300 }).success).toBe(false);
  });
  it("parses output-result node", () => {
    expect(node.safeParse({ id: validUuid, type: "output-result", position: pos, outputId: 0 }).success).toBe(true);
  });
  it("rejects output-result with outputId > 127", () => {
    expect(node.safeParse({ id: validUuid, type: "output-result", position: pos, outputId: 200 }).success).toBe(false);
  });
  it("parses fx-adsr node", () => {
    expect(node.safeParse({ id: validUuid, type: "fx-adsr", position: pos, attackRate: 0.1, decayRate: 0.1, sustainLevel: 0.5, releaseRate: 0.1 }).success).toBe(true);
  });
  it("parses fx-math node", () => {
    expect(node.safeParse({ id: validUuid, type: "fx-math", position: pos, operation: "add", valueA: 0, valueB: 0 }).success).toBe(true);
  });
  it("rejects unknown node type", () => {
    expect(node.safeParse({ id: validUuid, type: "unknown", position: pos }).success).toBe(false);
  });
});

describe("program", () => {
  it("parses a valid program with nodes and edges", () => {
    const p = {
      id: validUuid,
      name: "my-prog",
      nodes: [{ id: validUuid, type: "input-time", position: pos }],
      edges: [],
    };
    expect(program.safeParse(p).success).toBe(true);
  });
  it("rejects invalid program name", () => {
    const p = { id: validUuid, name: "bad name!", nodes: [], edges: [] };
    expect(program.safeParse(p).success).toBe(false);
  });
});

describe("show", () => {
  it("parses a valid empty show", () => {
    const s = { id: validUuid, name: "my-show", mapping: {}, patch: {}, programs: {} };
    expect(show.safeParse(s).success).toBe(true);
  });
  it("rejects invalid show name", () => {
    const s = { id: validUuid, name: "bad show!", mapping: {}, patch: {}, programs: {} };
    expect(show.safeParse(s).success).toBe(false);
  });
});
```

- [ ] **Step 2: Add `uuid` to lib-models devDependencies** (needed for test helpers)

In `packages/lib-models/package.json`, add to `"devDependencies"`:
```json
"uuid": "^14.0.0",
"@types/uuid": "^11.0.0"
```

Then run: `cd /path/to/ptah && pnpm install`

- [ ] **Step 3: Run tests**

```bash
cd packages/lib-models && pnpm test
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/lib-models/src/__tests__/models.test.ts packages/lib-models/package.json pnpm-lock.yaml
git commit -m "test(lib-models): add Zod schema validation tests

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 7: Fix B2/B3/B4 — wrong HTTP status codes in service-api

**Files:** `apps/service-api/src/routes/show.route.ts`, `apps/service-api/src/routes/program.route.ts`

- [ ] **Step 1: Fix show.route.ts**

In `apps/service-api/src/routes/show.route.ts`:

Change `GET /show/:name` response (line ~50):
```typescript
// Before:
res.statusCode = 201;
// After:
res.statusCode = 200;
```

Change `PUT /show/:name` response (line ~71):
```typescript
// Before:
res.statusCode = 201;
// After:
res.statusCode = 200;
```

- [ ] **Step 2: Fix program.route.ts**

In `apps/service-api/src/routes/program.route.ts`:

Change `PUT /program/:name` response (line ~83):
```typescript
// Before:
res.statusCode = 201;
// After:
res.statusCode = 200;
```

- [ ] **Step 3: Commit the fixes before writing tests**

```bash
git add apps/service-api/src/routes/show.route.ts apps/service-api/src/routes/program.route.ts
git commit -m "fix(service-api): correct HTTP status codes

GET /show/:name and PUT /show/:name returned 201 (Created) instead of 200 (OK).
PUT /program/:name also returned 201 instead of 200.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 8: Tests for service-api HTTP routes

The tests mock `lib-shared` repositories and use `supertest` to make HTTP calls against a real Express app.

**Files:** `apps/service-api/src/__tests__/show.routes.test.ts`, `apps/service-api/src/__tests__/program.routes.test.ts`

- [ ] **Step 1: Create show.routes.test.ts**

```typescript
import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import supertest from "supertest";
import { v4 as uuidv4 } from "uuid";

// Mock lib-shared repositories and env before importing routes
jest.mock("@ptah-app/lib-shared", () => ({
  repositories: {
    file: { checkPathAndInitialize: jest.fn().mockResolvedValue(undefined) },
    show: {
      listShowFromPath: jest.fn(),
      saveShowToPath: jest.fn(),
      loadShowFromPath: jest.fn(),
      deleteShowFromPath: jest.fn(),
    },
  },
  env: { vars: { PTAH_SHOWS_PATH: "/tmp/test-shows" } },
  services: {
    pubsub: { send: jest.fn(), connect: jest.fn(), disconnect: jest.fn() },
    settings: { loadSettingsOrInitialize: jest.fn() },
  },
}));

import { repositories } from "@ptah-app/lib-shared";
import { configureRoutesShow } from "../routes/show.route";

const mockRepos = repositories as jest.Mocked<typeof repositories>;

const buildApp = () =>
  configureRoutesShow(
    express()
      .disable("x-powered-by")
      .use(bodyParser.json())
      .use(cors())
  );

const validShow = () => ({
  id: uuidv4(),
  name: "my-show",
  mapping: {},
  patch: {},
  programs: {},
});

beforeEach(() => jest.clearAllMocks());

describe("GET /show", () => {
  it("returns 200 with list of show names", async () => {
    (mockRepos.show.listShowFromPath as jest.Mock).mockResolvedValue(["my-show"]);
    const res = await supertest(buildApp()).get("/show");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(["my-show"]);
  });

  it("returns 500 on repository error", async () => {
    (mockRepos.show.listShowFromPath as jest.Mock).mockRejectedValue(new Error("disk error"));
    const res = await supertest(buildApp()).get("/show");
    expect(res.status).toBe(500);
  });
});

describe("POST /show", () => {
  it("returns 201 with the created show", async () => {
    (mockRepos.show.saveShowToPath as jest.Mock).mockResolvedValue(undefined);
    const res = await supertest(buildApp())
      .post("/show")
      .send({ name: "new-show" });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("new-show");
  });

  it("returns 400 for invalid body (missing name)", async () => {
    const res = await supertest(buildApp()).post("/show").send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 for name with spaces", async () => {
    const res = await supertest(buildApp()).post("/show").send({ name: "bad name" });
    expect(res.status).toBe(400);
  });
});

describe("GET /show/:name", () => {
  it("returns 200 with the show", async () => {
    const show = validShow();
    (mockRepos.show.loadShowFromPath as jest.Mock).mockResolvedValue(show);
    const res = await supertest(buildApp()).get("/show/my-show");
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("my-show");
  });

  it("returns 500 when show not found", async () => {
    (mockRepos.show.loadShowFromPath as jest.Mock).mockRejectedValue(new Error("not found"));
    const res = await supertest(buildApp()).get("/show/missing-show");
    expect(res.status).toBe(500);
  });
});

describe("PUT /show/:name", () => {
  it("returns 200 with the saved show", async () => {
    const show = validShow();
    (mockRepos.show.saveShowToPath as jest.Mock).mockResolvedValue(undefined);
    const res = await supertest(buildApp())
      .put(`/show/${show.name}`)
      .send(show);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe(show.name);
  });

  it("returns 400 for invalid show body", async () => {
    const res = await supertest(buildApp())
      .put("/show/my-show")
      .send({ name: "my-show" }); // missing id, mapping, patch, programs
    expect(res.status).toBe(400);
  });
});

describe("DELETE /show/:name", () => {
  it("returns 204 on success", async () => {
    (mockRepos.show.deleteShowFromPath as jest.Mock).mockResolvedValue(undefined);
    const res = await supertest(buildApp()).delete("/show/my-show");
    expect(res.status).toBe(204);
  });

  it("returns 500 on error", async () => {
    (mockRepos.show.deleteShowFromPath as jest.Mock).mockRejectedValue(new Error("fail"));
    const res = await supertest(buildApp()).delete("/show/my-show");
    expect(res.status).toBe(500);
  });
});
```

- [ ] **Step 2: Create program.routes.test.ts**

```typescript
import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import supertest from "supertest";
import { v4 as uuidv4 } from "uuid";

jest.mock("@ptah-app/lib-shared", () => ({
  repositories: {
    file: { checkPathAndInitialize: jest.fn().mockResolvedValue(undefined) },
    program: {
      listProgramFromPath: jest.fn(),
      saveProgramToPath: jest.fn(),
      loadProgramFromPath: jest.fn(),
      deleteProgramFromPath: jest.fn(),
    },
  },
  env: { vars: { PTAH_PROGRAMS_PATH: "/tmp/test-programs" } },
  services: {
    pubsub: { send: jest.fn(), connect: jest.fn(), disconnect: jest.fn() },
    settings: { loadSettingsOrInitialize: jest.fn() },
  },
}));

import { repositories, services } from "@ptah-app/lib-shared";
import { configureRoutesProgram } from "../routes/program.route";

const mockRepos = repositories as jest.Mocked<typeof repositories>;
const mockServices = services as jest.Mocked<typeof services>;

const buildApp = () =>
  configureRoutesProgram(
    express()
      .disable("x-powered-by")
      .use(bodyParser.json())
      .use(cors())
  );

const validProgram = () => ({
  id: uuidv4(),
  name: "my-program",
  nodes: [],
  edges: [],
});

beforeEach(() => jest.clearAllMocks());

describe("GET /program", () => {
  it("returns 200 with list of program names", async () => {
    (mockRepos.program.listProgramFromPath as jest.Mock).mockResolvedValue(["my-program"]);
    const res = await supertest(buildApp()).get("/program");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(["my-program"]);
  });
});

describe("POST /program", () => {
  it("returns 201 with the created program", async () => {
    (mockRepos.program.saveProgramToPath as jest.Mock).mockResolvedValue(undefined);
    const res = await supertest(buildApp())
      .post("/program")
      .send({ name: "new-program" });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("new-program");
  });

  it("returns 400 for invalid body", async () => {
    const res = await supertest(buildApp()).post("/program").send({});
    expect(res.status).toBe(400);
  });
});

describe("GET /program/:name", () => {
  it("returns 200 with the program", async () => {
    const prog = validProgram();
    (mockRepos.program.loadProgramFromPath as jest.Mock).mockResolvedValue(prog);
    const res = await supertest(buildApp()).get("/program/my-program");
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("my-program");
  });
});

describe("PUT /program/:name", () => {
  it("returns 200 with saved program and sends pubsub event", async () => {
    const prog = validProgram();
    (mockRepos.program.saveProgramToPath as jest.Mock).mockResolvedValue(undefined);
    const res = await supertest(buildApp())
      .put(`/program/${prog.name}`)
      .send(prog);
    expect(res.status).toBe(200);
    expect(mockServices.pubsub.send).toHaveBeenCalledWith("system", {
      type: "program:save:success",
      programName: prog.name,
    });
  });

  it("sends pubsub error event on failure", async () => {
    const prog = validProgram();
    (mockRepos.program.saveProgramToPath as jest.Mock).mockRejectedValue(new Error("disk full"));
    const res = await supertest(buildApp())
      .put(`/program/${prog.name}`)
      .send(prog);
    expect(res.status).toBe(500);
    expect(mockServices.pubsub.send).toHaveBeenCalledWith("system", {
      type: "program:save:error",
      programName: prog.name,
    });
  });
});

describe("DELETE /program/:name", () => {
  it("returns 204 on success", async () => {
    (mockRepos.program.deleteProgramFromPath as jest.Mock).mockResolvedValue(undefined);
    const res = await supertest(buildApp()).delete("/program/my-program");
    expect(res.status).toBe(204);
  });
});
```

- [ ] **Step 3: Run service-api tests**

```bash
cd apps/service-api && pnpm test
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/service-api/src/__tests__/
git commit -m "test(service-api): add route tests for show and program endpoints

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 9: Fix B5 — updateTempo sends stale value; fix B6 — controlId filter

**Files:** `apps/service-midi/src/midi-handlers.ts`

- [ ] **Step 1: Fix updateTempo (B5)**

The callback in `updateTempo` sends `tempo` (the old module-level value) then assigns `tempo = newTempo`. Since `tempo = newTempo` also runs synchronously in the caller, the `tempo = newTempo` inside the callback is dead/redundant. Fix by sending `newTempo` directly in the callback:

```typescript
// Replace the entire updateTempo function:
const updateTempo = (newTempo: number): void => {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    services.pubsub.send("midi", { type: "tempo:change", tempo: newTempo });
  }, 100);
};
```

- [ ] **Step 2: Remove the arbitrary controlId <= 13 filter (B6)**

The `handleMidiStatusChannelControlChange` function silently drops CC messages with `controlId > 13`. MIDI CC supports 0–127. Remove the filter:

```typescript
const handleMidiStatusChannelControlChange = (
  controlId: number,
  value: number,
): void => {
  services.pubsub.send("midi", { type: "control:change", controlId, value });
};
```

- [ ] **Step 3: Commit fixes**

```bash
git add apps/service-midi/src/midi-handlers.ts
git commit -m "fix(service-midi): fix updateTempo sending stale value; remove arbitrary CC filter

- updateTempo was sending old tempo value before updating it; fix to send newTempo
- controlId <= 13 silently dropped 114 valid CC messages (14-127); remove filter

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 10: Tests for service-midi MIDI message handler

**Files:** `apps/service-midi/src/__tests__/midi-handlers.test.ts`

- [ ] **Step 1: Create midi-handlers.test.ts**

```typescript
jest.mock("@ptah-app/lib-shared", () => ({
  services: {
    pubsub: { send: jest.fn() },
  },
}));

import { services } from "@ptah-app/lib-shared";
import {
  MIDI_STATUS_CHANNEL_CONTROL_CHANGE,
  MIDI_STATUS_CHANNEL_NOTE_OFF,
  MIDI_STATUS_CHANNEL_NOTE_ON,
  MIDI_STATUS_SYSTEM_CONTINUE_SEQUENCE,
  MIDI_STATUS_SYSTEM_START_SEQUENCE,
  MIDI_STATUS_SYSTEM_STOP_SEQUENCE,
  MIDI_STATUS_SYSTEM_TIMING_CLOCK,
} from "../constants";
import { handleMidiCallback } from "../midi-handlers";

const send = services.pubsub.send as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const handler = handleMidiCallback(1); // channel 1

describe("handleMidiCallback — system messages", () => {
  it("sends sequence:start on status 250", () => {
    handler(0, [MIDI_STATUS_SYSTEM_START_SEQUENCE, 0, 0]);
    expect(send).toHaveBeenCalledWith("midi", { type: "sequence:start" });
  });

  it("sends sequence:continue on status 251", () => {
    handler(0, [MIDI_STATUS_SYSTEM_CONTINUE_SEQUENCE, 0, 0]);
    expect(send).toHaveBeenCalledWith("midi", { type: "sequence:continue" });
  });

  it("sends sequence:stop on status 252", () => {
    handler(0, [MIDI_STATUS_SYSTEM_STOP_SEQUENCE, 0, 0]);
    expect(send).toHaveBeenCalledWith("midi", { type: "sequence:stop" });
  });
});

describe("handleMidiCallback — clock:tick", () => {
  it("sends clock:tick with deltaTime", () => {
    handler(0.02083, [MIDI_STATUS_SYSTEM_TIMING_CLOCK, 0, 0]);
    expect(send).toHaveBeenCalledWith("midi", {
      type: "clock:tick",
      deltaTime: 0.02083,
    });
  });

  it("sends tempo:change after debounce when tempo differs", () => {
    // 120 BPM = deltaTime of 1/24/2 = ~0.020833
    const deltaTime = 1 / 24 / 2; // 120 BPM
    handler(deltaTime, [MIDI_STATUS_SYSTEM_TIMING_CLOCK, 0, 0]);
    expect(send).not.toHaveBeenCalledWith("midi", expect.objectContaining({ type: "tempo:change" }));

    jest.advanceTimersByTime(100);
    expect(send).toHaveBeenCalledWith("midi", {
      type: "tempo:change",
      tempo: 120,
    });
  });

  it("does NOT send tempo:change if tempo is unchanged", () => {
    // Send two identical ticks — second should not retrigger debounce
    const deltaTime = 1 / 24 / 2;
    handler(deltaTime, [MIDI_STATUS_SYSTEM_TIMING_CLOCK, 0, 0]);
    jest.advanceTimersByTime(100);
    send.mockClear();

    handler(deltaTime, [MIDI_STATUS_SYSTEM_TIMING_CLOCK, 0, 0]);
    jest.advanceTimersByTime(100);
    expect(send).not.toHaveBeenCalledWith("midi", expect.objectContaining({ type: "tempo:change" }));
  });
});

describe("handleMidiCallback — note on/off (channel 1)", () => {
  it("sends note:on with keyNumber and velocity", () => {
    handler(0, [MIDI_STATUS_CHANNEL_NOTE_ON, 60, 100]);
    expect(send).toHaveBeenCalledWith("midi", {
      type: "note:on",
      keyNumber: 60,
      velocity: 100,
    });
  });

  it("sends note:off with keyNumber and velocity", () => {
    handler(0, [MIDI_STATUS_CHANNEL_NOTE_OFF, 60, 0]);
    expect(send).toHaveBeenCalledWith("midi", {
      type: "note:off",
      keyNumber: 60,
      velocity: 0,
    });
  });

  it("ignores note:on on different channel (channel 2)", () => {
    const handler2 = handleMidiCallback(2);
    // ch2 note:on status = 144 + 1 = 145
    handler2(0, [MIDI_STATUS_CHANNEL_NOTE_ON, 60, 100]); // channel 1 event
    expect(send).not.toHaveBeenCalledWith("midi", expect.objectContaining({ type: "note:on" }));
  });
});

describe("handleMidiCallback — control change", () => {
  it("sends control:change for any controlId (0–127)", () => {
    handler(0, [MIDI_STATUS_CHANNEL_CONTROL_CHANGE, 7, 64]);
    expect(send).toHaveBeenCalledWith("midi", {
      type: "control:change",
      controlId: 7,
      value: 64,
    });
  });

  it("sends control:change for controlId 14 (previously filtered)", () => {
    handler(0, [MIDI_STATUS_CHANNEL_CONTROL_CHANGE, 14, 100]);
    expect(send).toHaveBeenCalledWith("midi", {
      type: "control:change",
      controlId: 14,
      value: 100,
    });
  });

  it("sends control:change for controlId 127", () => {
    handler(0, [MIDI_STATUS_CHANNEL_CONTROL_CHANGE, 127, 0]);
    expect(send).toHaveBeenCalledWith("midi", {
      type: "control:change",
      controlId: 127,
      value: 0,
    });
  });
});

describe("handleMidiCallback — unknown status", () => {
  it("does not crash on unknown status byte", () => {
    expect(() => handler(0, [0x00, 0, 0])).not.toThrow();
    expect(send).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run service-midi tests**

```bash
cd apps/service-midi && pnpm test
```

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/service-midi/src/__tests__/midi-handlers.test.ts
git commit -m "test(service-midi): add tests for MIDI message handler

Tests cover all message types, channel filtering, tempo debounce,
control change for full 0-127 range.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 11: Fix B7 — typos in pubsub message type names

The `Sucess` typo appears in model type names and their exported string literals. This is a breaking rename — all callsites must be updated.

**Files to update:**
- `packages/lib-models/src/pubsub-message.models.ts` — rename objects and types
- `apps/service-api/src/routes/program.route.ts` — uses `"program:save:success"` string (already correct; string literal is fine)
- `apps/service-main/src/handlers/message-system-handlers.ts` — check callsites
- `apps/ui-admin/src/` — check for `ShowLoadSucess`, `ProgramSaveSucess` type usage
- `apps/ui-cli/src/` — same

- [ ] **Step 1: Search all callsites before renaming**

```bash
cd /path/to/ptah && grep -r "Sucess\|ShowLoadSucess\|ProgramSaveSucess" --include="*.ts" --include="*.tsx" -l | grep -v node_modules | grep -v dist
```

Note the files found. For each file, update the imported type name.

- [ ] **Step 2: Rename in pubsub-message.models.ts**

In `packages/lib-models/src/pubsub-message.models.ts`:

```typescript
// Line 65: rename object and type
export const pubsubMessageShowLoadSuccess = z.object({   // was: pubsubMessageShowLoadSucess
  type: z.literal("show:load:success"),
  showName,
});
// ...
// Line 154: update union member
pubsubMessageShowLoadSuccess,                             // was: pubsubMessageShowLoadSucess

// Line 98: rename object and type  
export const pubsubMessageProgramSaveSuccess = z.object({ // was: pubsubMessageProgramSaveSucess
  type: z.literal("program:save:success"),
  programName,
});
// ...
// Line 161: update union member
pubsubMessageProgramSaveSuccess,                          // was: pubsubMessageProgramSaveSucess

// Lines 213-235: rename exported TypeScript types
export type PubsubMessageShowLoadSuccess = z.infer<typeof pubsubMessageShowLoadSuccess>;
// was: PubsubMessageShowLoadSucess

export type PubsubMessageProgramSaveSuccess = z.infer<typeof pubsubMessageProgramSaveSuccess>;
// was: PubsubMessageProgramSaveSucess
```

- [ ] **Step 3: Update every callsite found in Step 1**

For each file that imports `PubsubMessageShowLoadSucess` or `PubsubMessageProgramSaveSucess`, update the import and usage to the corrected name.

- [ ] **Step 4: Run typecheck to verify no missed callsites**

```bash
cd /path/to/ptah && pnpm typecheck
```

Expected: no TypeScript errors related to the renamed types.

- [ ] **Step 5: Commit**

```bash
git add packages/lib-models/src/pubsub-message.models.ts <all updated callsite files>
git commit -m "fix(lib-models): rename misspelled Sucess types to Success

PubsubMessageShowLoadSucess → PubsubMessageShowLoadSuccess
PubsubMessageProgramSaveSucess → PubsubMessageProgramSaveSuccess

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 12: Fix B8 — targetIntput typo in edge model

The field `targetIntput` on `Edge` is a typo for `targetInput`. This field is used throughout `program.domain.ts` and anywhere edges are constructed.

- [ ] **Step 1: Search all callsites**

```bash
cd /path/to/ptah && grep -r "targetIntput" --include="*.ts" --include="*.tsx" -l | grep -v node_modules | grep -v dist
```

- [ ] **Step 2: Rename field in edge.model.ts**

In `packages/lib-models/src/edge.model.ts`:

```typescript
export const edge = z.object({
  id: uuid,
  source: z.string(),
  target: z.string(),
  sourceOutput: z.number(),
  targetInput: z.number(),   // was: targetIntput
});
export type Edge = z.infer<typeof edge>;
```

- [ ] **Step 3: Update program.domain.ts callsite**

In `packages/lib-domains/src/program.domain.ts` line ~107:

```typescript
// Before:
.reduce<{ id: string; sourceOutput: number }[]>(
  (acc, { source, sourceOutput, targetIntput }) => {
    acc[targetIntput] = {
// After:
.reduce<{ id: string; sourceOutput: number }[]>(
  (acc, { source, sourceOutput, targetInput }) => {
    acc[targetInput] = {
```

- [ ] **Step 4: Update any other callsites found in Step 1**

Update all files that reference `targetIntput`.

- [ ] **Step 5: Run typecheck**

```bash
cd /path/to/ptah && pnpm typecheck
```

Expected: no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add packages/lib-models/src/edge.model.ts packages/lib-domains/src/program.domain.ts <other callsites>
git commit -m "fix(lib-models): rename targetIntput to targetInput in Edge model

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 13: Final verification — run all tests

- [ ] **Step 1: Run the full test suite**

```bash
cd /path/to/ptah && pnpm test
```

Expected output: all packages report `Tests: N passed`.

- [ ] **Step 2: Run typecheck**

```bash
cd /path/to/ptah && pnpm typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit if any last fixes were needed**

```bash
git add -A
git commit -m "chore: final test suite cleanup

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```
