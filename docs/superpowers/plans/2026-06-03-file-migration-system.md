# File Migration System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a lazy, app-version-keyed file migration system so model changes that alter JSON shape no longer break loading of existing `~/.ptah/` resources — and ship the first real migration fixing the `targetIntput → targetInput` regression from PR #218.

**Architecture:** Each resource file carries a semver `version` = the app version that wrote it. On load, the repository runs an ordered chain of migrations (`from = file.version ?? baseline`, `to = current app version`) over the raw JSON, backs up the original under `~/.ptah/.backups/`, writes the upgraded file back, then validates with the existing Zod model. Migrations operate on plain JSON, not parsed models.

**Tech Stack:** TypeScript (strict), Zod v4, Jest 30 + ts-jest, pnpm + Turbo monorepo, Biome (format/lint), Changesets.

---

## Deviations from the design spec (plan-time discoveries)

Both reduce risk and are reflected throughout this plan:

1. **Version constant lives in `lib-models`** (`app-version.model.ts`), not `lib-shared/migrations`. `createSettings` (lib-domains) and the migration engine (lib-shared) both need it, and `lib-shared` depends on `lib-domains` → placing it in `lib-shared` would create a circular import. `lib-models` is depended on by both, so it is the safe home. The migration engine, chains, and repository helper stay in `lib-shared` as specced.
2. **`version` is OPTIONAL on the Show and Program Zod models**, not required. Making it required would force edits to ~35 `const prog: Program = {…}` literals in existing `lib-domains` tests. The on-disk version guarantee comes from the repository **save path** (the only writer), so migrations behave identically. Settings keeps its existing required `version`.

## File structure

**`packages/lib-models/`**
- Create `src/app-version.model.ts` — `BASELINE_VERSION` const + `getCurrentAppVersion()`.
- Modify `src/index.ts` — export the new module.
- Modify `src/program.model.ts` — add optional `version`.
- Modify `src/show.model.ts` — add optional `version`.
- Modify `src/__tests__/models.test.ts` — add version-field tests for program & show.

**`packages/lib-domains/`**
- Modify `src/settings.domain.ts` — stamp `getCurrentAppVersion()` instead of `"0.0.1"`.
- Modify `src/__tests__/settings.domain.test.ts` — update the version assertion.

**`packages/lib-shared/`**
- Modify `package.json` — add `@types/jest` devDependency (tests need jest globals to typecheck).
- Modify `src/env/vars.env.ts` — add backup paths.
- Create `src/migrations/migration.types.ts` — `Migration`, `MigrationChain`.
- Create `src/migrations/semver.ts` — `parseVersion`, `compareVersions`.
- Create `src/migrations/migrate.ts` — `runMigrations`.
- Create `src/migrations/program.migrations.ts` — the `targetIntput → targetInput` migration.
- Create `src/migrations/show.migrations.ts` — empty chain.
- Create `src/migrations/settings.migrations.ts` — empty chain.
- Create `src/migrations/index.ts` — re-exports.
- Create `src/migrations/__tests__/semver.test.ts`.
- Create `src/migrations/__tests__/migrate.test.ts`.
- Create `src/migrations/__tests__/program.migrations.test.ts`.
- Create `src/repositories/migrate-resource.ts` — `loadAndMigrate` (read → migrate → backup → write-back → validate).
- Create `src/repositories/__tests__/migrate-resource.test.ts`.
- Modify `src/repositories/show.repository.ts` — load via `loadAndMigrate`, stamp on save.
- Modify `src/repositories/program.repository.ts` — load via `loadAndMigrate`, stamp on save.
- Modify `src/repositories/settings.repository.ts` — load via `loadAndMigrate`, stamp on save.

**Root**
- Create `.changeset/file-migrations.md` — minor bump for `app`, `lib-models`, `lib-shared`, `lib-domains` → `0.3.0`.
- Modify `AGENTS.md` — add a "File migrations" section.

## Commands reference

- Single package test: `pnpm --filter @ptah-app/lib-models test`
- Multi: `pnpm --filter @ptah-app/lib-models --filter @ptah-app/lib-shared --filter @ptah-app/lib-domains test`
- Typecheck one package: `pnpm --filter @ptah-app/lib-shared typecheck`
- Full gate: `pnpm allcheck`
- **Env note:** a full `pnpm i` aborts locally on the `midi` native rebuild (`node-gyp` missing); use `pnpm i --ignore-scripts` in this worktree. This does not affect `lib-models`/`lib-shared`/`lib-domains`.

---

## Task 1: App-version constant in lib-models

**Files:**
- Create: `packages/lib-models/src/app-version.model.ts`
- Modify: `packages/lib-models/src/index.ts`
- Test: `packages/lib-models/src/__tests__/app-version.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/lib-models/src/__tests__/app-version.test.ts`:

```ts
import { BASELINE_VERSION, getCurrentAppVersion } from "../app-version.model";

describe("app version", () => {
  const original = process.env.APP_VERSION;
  afterEach(() => {
    if (original === undefined) {
      delete process.env.APP_VERSION;
    } else {
      process.env.APP_VERSION = original;
    }
  });

  it("BASELINE_VERSION is the version migrations are introduced at", () => {
    expect(BASELINE_VERSION).toBe("0.2.3");
  });

  it("getCurrentAppVersion returns APP_VERSION when set", () => {
    process.env.APP_VERSION = "0.3.0";
    expect(getCurrentAppVersion()).toBe("0.3.0");
  });

  it("getCurrentAppVersion falls back to BASELINE_VERSION when unset", () => {
    delete process.env.APP_VERSION;
    expect(getCurrentAppVersion()).toBe(BASELINE_VERSION);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ptah-app/lib-models test -- app-version`
Expected: FAIL — cannot find module `../app-version.model`.

- [ ] **Step 3: Write minimal implementation**

Create `packages/lib-models/src/app-version.model.ts`:

```ts
/**
 * The app version at which the file migration system was introduced. Files with
 * no `version` stamp (legacy files written before migrations existed) are
 * assumed to be at this baseline.
 */
export const BASELINE_VERSION = "0.2.3";

/**
 * The current app version, used to stamp files on write and as the migration
 * target on load. The app sets `APP_VERSION` from its package.json at startup
 * (apps/app/index.js) and propagates it to spawned services; the fallback only
 * applies in standalone/test contexts.
 */
export const getCurrentAppVersion = (): string =>
  process.env.APP_VERSION ?? BASELINE_VERSION;
```

- [ ] **Step 4: Export it from the package index**

Add to `packages/lib-models/src/index.ts` (alongside the other `export *` lines):

```ts
export * from "./app-version.model";
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @ptah-app/lib-models test -- app-version`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/lib-models/src/app-version.model.ts packages/lib-models/src/index.ts packages/lib-models/src/__tests__/app-version.test.ts
git commit -m "feat(lib-models): add app-version baseline + getCurrentAppVersion"
```

---

## Task 2: Optional `version` field on Show & Program models

**Files:**
- Modify: `packages/lib-models/src/program.model.ts`
- Modify: `packages/lib-models/src/show.model.ts`
- Test: `packages/lib-models/src/__tests__/models.test.ts`

- [ ] **Step 1: Write the failing tests**

In `packages/lib-models/src/__tests__/models.test.ts`, add to the existing
`describe("program schema", ...)` block (after the `programCreate` tests, before
its closing `});`):

```ts
  it("accepts an optional version stamp", () => {
    const parsed = program.parse({ ...validProgram, version: "0.3.0" });
    expect(parsed.version).toBe("0.3.0");
  });
  it("accepts a program with no version", () => {
    expect(program.parse(validProgram).version).toBeUndefined();
  });
  it("rejects an invalid version string", () => {
    expect(() => program.parse({ ...validProgram, version: "nope" })).toThrow(
      ZodError,
    );
  });
```

Add to the existing `describe("show schema", ...)` block (before its closing `});`):

```ts
  it("accepts an optional version stamp", () => {
    const parsed = show.parse({ ...validShow, version: "0.3.0" });
    expect(parsed.version).toBe("0.3.0");
  });
  it("accepts a show with no version", () => {
    expect(show.parse(validShow).version).toBeUndefined();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @ptah-app/lib-models test`
Expected: FAIL — `version` is stripped (undefined when set to "0.3.0"); the invalid-version test does not throw.

- [ ] **Step 3: Add the field to the program model**

Modify `packages/lib-models/src/program.model.ts` — add the import and the field:

```ts
import * as z from "zod";

import { edge } from "./edge.model";
import { node } from "./node.model";
import { uuid } from "./uuid.model";
import { version } from "./version.model";

export const programName = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[\w-]+$/);
export type ProgramName = z.infer<typeof programName>;

export const program = z.object({
  id: uuid,
  name: programName,
  nodes: z.array(node),
  edges: z.array(edge),
  version: z.optional(version),
});
export type Program = z.infer<typeof program>;

export const programCreate = program.pick({ name: true });
export type ProgramCreate = z.infer<typeof programCreate>;
```

- [ ] **Step 4: Add the field to the show model**

Modify `packages/lib-models/src/show.model.ts` — add the import and the field to
the `show` object:

```ts
import * as z from "zod";

import { showMapping } from "./show-mapping.model";
import { showPatch } from "./show-patch.model";
import { showPrograms } from "./show-programs.model";
import { uuid } from "./uuid.model";
import { version } from "./version.model";

export const showName = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[\w-]+$/);
export type ShowName = z.infer<typeof showName>;

export const show = z.object({
  id: uuid,
  name: showName,
  mapping: showMapping,
  patch: showPatch,
  programs: showPrograms,
  version: z.optional(version),
});
export type Show = z.infer<typeof show>;

export const showCreate = show.pick({ name: true });
export type ShowCreate = z.infer<typeof showCreate>;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @ptah-app/lib-models test`
Expected: PASS (all existing 60 tests + 5 new).

- [ ] **Step 6: Commit**

```bash
git add packages/lib-models/src/program.model.ts packages/lib-models/src/show.model.ts packages/lib-models/src/__tests__/models.test.ts
git commit -m "feat(lib-models): add optional version stamp to show and program"
```

---

## Task 3: createSettings stamps the current app version

**Files:**
- Modify: `packages/lib-domains/src/settings.domain.ts`
- Test: `packages/lib-domains/src/__tests__/settings.domain.test.ts`

- [ ] **Step 1: Update the failing test**

Replace the body of `packages/lib-domains/src/__tests__/settings.domain.test.ts`
with (the only change is the version assertion + import):

```ts
import { getCurrentAppVersion } from "@ptah-app/lib-models";
import { createSettings } from "../settings.domain";

describe("createSettings", () => {
  it("returns an object with required fields", () => {
    const s = createSettings();
    expect(s.version).toBe(getCurrentAppVersion());
    expect(s.midiVirtualPortName).toBe("ptah");
    expect(s.midiChannel).toBe(1);
    expect(s.appAdminPort).toBe(3001);
  });

  it("does not include currentShow by default", () => {
    expect(createSettings().currentShow).toBeUndefined();
  });

  it("returns a new object on each call", () => {
    const a = createSettings();
    const b = createSettings();
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ptah-app/lib-domains test -- settings.domain`
Expected: FAIL — `s.version` is `"0.0.1"`, not `getCurrentAppVersion()` (`"0.2.3"` in tests).

- [ ] **Step 3: Update the implementation**

Modify `packages/lib-domains/src/settings.domain.ts`:

```ts
import { getCurrentAppVersion } from "@ptah-app/lib-models";
import type * as models from "@ptah-app/lib-models";

export const createSettings = (): models.Settings => ({
  version: getCurrentAppVersion(),
  midiVirtualPortName: "ptah",
  midiChannel: 1,
  appAdminPort: 3001,
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ptah-app/lib-domains test -- settings.domain`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/lib-domains/src/settings.domain.ts packages/lib-domains/src/__tests__/settings.domain.test.ts
git commit -m "feat(lib-domains): stamp current app version in createSettings"
```

---

## Task 4: Backup paths in env vars

**Files:**
- Modify: `packages/lib-shared/src/env/vars.env.ts`

(No test — these are derived path constants; they are exercised by Task 8/9 tests.)

- [ ] **Step 1: Add the backup path constants**

Append to `packages/lib-shared/src/env/vars.env.ts`:

```ts
export const PTAH_BACKUPS_PATH = `${PTAH_DIRECTORY}/.backups`;
export const PTAH_SHOWS_BACKUPS_PATH = `${PTAH_BACKUPS_PATH}/shows`;
export const PTAH_PROGRAMS_BACKUPS_PATH = `${PTAH_BACKUPS_PATH}/programs`;
export const PTAH_SETTINGS_BACKUPS_PATH = `${PTAH_BACKUPS_PATH}/settings`;
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @ptah-app/lib-shared typecheck`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add packages/lib-shared/src/env/vars.env.ts
git commit -m "feat(lib-shared): add .backups path constants"
```

---

## Task 5: Add @types/jest to lib-shared

**Files:**
- Modify: `packages/lib-shared/package.json`

`lib-shared` currently has no tests and no `@types/jest`; the tests added in later
tasks need jest globals to typecheck.

- [ ] **Step 1: Add the devDependency**

In `packages/lib-shared/package.json`, add `"@types/jest": "^30.0.0"` to
`devDependencies` (match the version `lib-models` uses):

```json
  "devDependencies": {
    "@ptah-app/config-jest": "workspace:*",
    "@ptah-app/config-ts": "workspace:*",
    "@types/jest": "^30.0.0",
    "@types/node": "^25.6.2",
    "tsup": "^8.5.1",
    "typescript": "^6.0.3",
    "jest-presets": "npm:@ptah-app/config-jest@*"
  },
```

- [ ] **Step 2: Install**

Run: `pnpm i --ignore-scripts`
Expected: lockfile updated, `@types/jest` linked into `lib-shared`.

- [ ] **Step 3: Commit**

```bash
git add packages/lib-shared/package.json pnpm-lock.yaml
git commit -m "build(lib-shared): add @types/jest for tests"
```

---

## Task 6: Semver comparator

**Files:**
- Create: `packages/lib-shared/src/migrations/semver.ts`
- Test: `packages/lib-shared/src/migrations/__tests__/semver.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/lib-shared/src/migrations/__tests__/semver.test.ts`:

```ts
import { compareVersions, parseVersion } from "../semver";

describe("parseVersion", () => {
  it("parses major.minor.patch", () => {
    expect(parseVersion("1.2.3")).toEqual([1, 2, 3]);
  });
  it("ignores prerelease and build metadata", () => {
    expect(parseVersion("0.3.0-rc1+build5")).toEqual([0, 3, 0]);
  });
});

describe("compareVersions", () => {
  it("returns -1 when a < b", () => {
    expect(compareVersions("0.2.3", "0.3.0")).toBe(-1);
  });
  it("returns 1 when a > b", () => {
    expect(compareVersions("0.3.0", "0.2.3")).toBe(1);
  });
  it("returns 0 when equal", () => {
    expect(compareVersions("0.3.0", "0.3.0")).toBe(0);
  });
  it("compares patch level", () => {
    expect(compareVersions("0.0.1", "0.0.2")).toBe(-1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ptah-app/lib-shared test -- semver`
Expected: FAIL — cannot find module `../semver`.

- [ ] **Step 3: Write minimal implementation**

Create `packages/lib-shared/src/migrations/semver.ts`:

```ts
/**
 * Parse a semver string into its numeric [major, minor, patch] core. Prerelease
 * (`-rc1`) and build (`+build`) metadata are ignored for ordering — PTAH ships
 * clean release versions, so core comparison is sufficient.
 */
export const parseVersion = (v: string): [number, number, number] => {
  const core = v.split("+")[0].split("-")[0];
  const [major = 0, minor = 0, patch = 0] = core.split(".").map(Number);
  return [major, minor, patch];
};

/** Returns -1 if a < b, 1 if a > b, 0 if equal (by major.minor.patch). */
export const compareVersions = (a: string, b: string): number => {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) {
      return pa[i] < pb[i] ? -1 : 1;
    }
  }
  return 0;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ptah-app/lib-shared test -- semver`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/lib-shared/src/migrations/semver.ts packages/lib-shared/src/migrations/__tests__/semver.test.ts
git commit -m "feat(lib-shared): add semver comparator for migrations"
```

---

## Task 7: Migration types and runMigrations engine

**Files:**
- Create: `packages/lib-shared/src/migrations/migration.types.ts`
- Create: `packages/lib-shared/src/migrations/migrate.ts`
- Test: `packages/lib-shared/src/migrations/__tests__/migrate.test.ts`

- [ ] **Step 1: Write the migration types**

Create `packages/lib-shared/src/migrations/migration.types.ts`:

```ts
import type { Version } from "@ptah-app/lib-models";

export type Migration = {
  /** The app version this migration upgrades the file TO. */
  version: Version;
  /** Transforms plain JSON (never a parsed model) from the previous shape. */
  up: (raw: unknown) => unknown;
};

/** Migrations for a resource type, authored in ascending version order. */
export type MigrationChain = Migration[];
```

- [ ] **Step 2: Write the failing test**

Create `packages/lib-shared/src/migrations/__tests__/migrate.test.ts`:

```ts
import type { MigrationChain } from "../migration.types";
import { runMigrations } from "../migrate";

const chain: MigrationChain = [
  { version: "0.3.0", up: (raw) => ({ ...(raw as object), a: 1 }) },
  { version: "0.4.0", up: (raw) => ({ ...(raw as object), b: 2 }) },
];

describe("runMigrations", () => {
  it("applies only migrations in (from, to]", () => {
    const result = runMigrations({ version: "0.3.0" }, chain, {
      from: "0.3.0",
      to: "0.4.0",
    }) as Record<string, unknown>;
    expect(result.b).toBe(2);
    expect(result.a).toBeUndefined();
  });

  it("applies all migrations newer than a baseline 'from'", () => {
    const result = runMigrations({}, chain, {
      from: "0.2.3",
      to: "0.4.0",
    }) as Record<string, unknown>;
    expect(result.a).toBe(1);
    expect(result.b).toBe(2);
  });

  it("applies out-of-order chains in ascending version order", () => {
    const order: string[] = [];
    const unordered: MigrationChain = [
      { version: "0.4.0", up: (r) => (order.push("b"), r) },
      { version: "0.3.0", up: (r) => (order.push("a"), r) },
    ];
    runMigrations({}, unordered, { from: "0.2.3", to: "0.4.0" });
    expect(order).toEqual(["a", "b"]);
  });

  it("re-stamps the result with the target version", () => {
    const result = runMigrations({ version: "0.2.3" }, [], {
      from: "0.2.3",
      to: "0.3.0",
    }) as Record<string, unknown>;
    expect(result.version).toBe("0.3.0");
  });

  it("is a no-op transform for an empty chain", () => {
    const result = runMigrations({ keep: true }, [], {
      from: "0.3.0",
      to: "0.3.0",
    }) as Record<string, unknown>;
    expect(result.keep).toBe(true);
  });

  it("is idempotent when run twice", () => {
    const once = runMigrations({}, chain, { from: "0.2.3", to: "0.4.0" });
    const twice = runMigrations(once, chain, { from: "0.4.0", to: "0.4.0" });
    expect(twice).toEqual(once);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @ptah-app/lib-shared test -- migrate`
Expected: FAIL — cannot find module `../migrate`.

- [ ] **Step 4: Write minimal implementation**

Create `packages/lib-shared/src/migrations/migrate.ts`:

```ts
import type { MigrationChain } from "./migration.types";
import { compareVersions } from "./semver";

/**
 * Apply every migration whose target version is in the half-open range
 * (from, to], in ascending version order, then re-stamp the result's `version`
 * to `to`. Pure: no file I/O, no Zod parsing. Operates on plain JSON.
 */
export const runMigrations = (
  raw: unknown,
  chain: MigrationChain,
  { from, to }: { from: string; to: string },
): unknown => {
  const applicable = chain
    .filter(
      (migration) =>
        compareVersions(from, migration.version) < 0 &&
        compareVersions(migration.version, to) <= 0,
    )
    .sort((a, b) => compareVersions(a.version, b.version));

  const migrated = applicable.reduce<unknown>(
    (data, migration) => migration.up(data),
    raw,
  );

  return { ...(migrated as object), version: to };
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @ptah-app/lib-shared test -- migrate`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/lib-shared/src/migrations/migration.types.ts packages/lib-shared/src/migrations/migrate.ts packages/lib-shared/src/migrations/__tests__/migrate.test.ts
git commit -m "feat(lib-shared): add runMigrations engine"
```

---

## Task 8: Resource migration chains (incl. the #218 program fix)

**Files:**
- Create: `packages/lib-shared/src/migrations/program.migrations.ts`
- Create: `packages/lib-shared/src/migrations/show.migrations.ts`
- Create: `packages/lib-shared/src/migrations/settings.migrations.ts`
- Create: `packages/lib-shared/src/migrations/index.ts`
- Test: `packages/lib-shared/src/migrations/__tests__/program.migrations.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/lib-shared/src/migrations/__tests__/program.migrations.test.ts`:

```ts
import { programMigrations } from "../program.migrations";

const up = programMigrations[0].up;

describe("program migration: targetIntput -> targetInput (#218)", () => {
  it("is keyed to version 0.3.0", () => {
    expect(programMigrations[0].version).toBe("0.3.0");
  });

  it("renames targetIntput to targetInput, preserving the value", () => {
    const result = up({
      id: "p1",
      edges: [{ id: "e1", source: "a", target: "b", sourceOutput: 0, targetIntput: 3 }],
    }) as { edges: Array<Record<string, unknown>> };
    expect(result.edges[0].targetInput).toBe(3);
    expect("targetIntput" in result.edges[0]).toBe(false);
  });

  it("leaves already-correct edges untouched (idempotent)", () => {
    const input = {
      edges: [{ id: "e1", source: "a", target: "b", sourceOutput: 0, targetInput: 5 }],
    };
    expect(up(input)).toEqual(input);
  });

  it("handles a program with no edges", () => {
    expect(up({ id: "p1" })).toEqual({ id: "p1" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ptah-app/lib-shared test -- program.migrations`
Expected: FAIL — cannot find module `../program.migrations`.

- [ ] **Step 3: Write the program migration**

Create `packages/lib-shared/src/migrations/program.migrations.ts`:

```ts
import type { MigrationChain } from "./migration.types";

/**
 * PR #218 renamed the edge field `targetIntput` → `targetInput`. Programs
 * persisted before that release store the misspelled key and fail to load.
 * Idempotent: edges that already use `targetInput` pass through unchanged.
 */
const renameTargetInput = (raw: unknown): unknown => {
  const program = raw as { edges?: unknown };
  if (!Array.isArray(program.edges)) {
    return raw;
  }
  return {
    ...(raw as object),
    edges: program.edges.map((edge) => {
      const e = edge as Record<string, unknown>;
      if (!("targetIntput" in e)) {
        return e;
      }
      const { targetIntput, ...rest } = e;
      return { ...rest, targetInput: targetIntput };
    }),
  };
};

export const programMigrations: MigrationChain = [
  { version: "0.3.0", up: renameTargetInput },
];
```

- [ ] **Step 4: Write the empty chains**

Create `packages/lib-shared/src/migrations/show.migrations.ts`:

```ts
import type { MigrationChain } from "./migration.types";

export const showMigrations: MigrationChain = [];
```

Create `packages/lib-shared/src/migrations/settings.migrations.ts`:

```ts
import type { MigrationChain } from "./migration.types";

export const settingsMigrations: MigrationChain = [];
```

- [ ] **Step 5: Write the migrations barrel**

Create `packages/lib-shared/src/migrations/index.ts`:

```ts
export type { Migration, MigrationChain } from "./migration.types";
export { runMigrations } from "./migrate";
export { compareVersions, parseVersion } from "./semver";
export { programMigrations } from "./program.migrations";
export { settingsMigrations } from "./settings.migrations";
export { showMigrations } from "./show.migrations";
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm --filter @ptah-app/lib-shared test -- program.migrations`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add packages/lib-shared/src/migrations/program.migrations.ts packages/lib-shared/src/migrations/show.migrations.ts packages/lib-shared/src/migrations/settings.migrations.ts packages/lib-shared/src/migrations/index.ts packages/lib-shared/src/migrations/__tests__/program.migrations.test.ts
git commit -m "feat(lib-shared): add program targetInput migration (#218) + empty chains"
```

---

## Task 9: loadAndMigrate repository helper

**Files:**
- Create: `packages/lib-shared/src/repositories/migrate-resource.ts`
- Test: `packages/lib-shared/src/repositories/__tests__/migrate-resource.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/lib-shared/src/repositories/__tests__/migrate-resource.test.ts`:

```ts
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as z from "zod";
import type { MigrationChain } from "../../migrations";
import { loadAndMigrate } from "../migrate-resource";

const schema = z.object({ id: z.string(), version: z.optional(z.string()) });
const bump: MigrationChain = [
  { version: "0.3.0", up: (raw) => ({ ...(raw as object), migrated: true }) },
];

describe("loadAndMigrate", () => {
  const original = process.env.APP_VERSION;
  let dir: string;
  let backupDir: string;

  beforeEach(() => {
    process.env.APP_VERSION = "0.3.0";
    dir = mkdtempSync(join(tmpdir(), "ptah-mig-"));
    backupDir = join(dir, ".backups");
  });
  afterEach(() => {
    if (original === undefined) {
      delete process.env.APP_VERSION;
    } else {
      process.env.APP_VERSION = original;
    }
  });

  it("migrates a legacy (unstamped) file, backs it up, and writes it back", async () => {
    const file = join(dir, "thing.json");
    writeFileSync(file, JSON.stringify({ id: "x" }));

    const result = await loadAndMigrate(file, bump, schema, backupDir);
    expect(result).toEqual({ id: "x", version: "0.3.0" });

    // backup holds the original, stamped with the baseline version
    const backup = JSON.parse(
      readFileSync(join(backupDir, "thing.0.2.3.json"), "utf8"),
    );
    expect(backup).toEqual({ id: "x" });

    // file on disk is upgraded + re-stamped
    const onDisk = JSON.parse(readFileSync(file, "utf8"));
    expect(onDisk.version).toBe("0.3.0");
    expect(onDisk.migrated).toBe(true);
  });

  it("is a no-op for an already-current file (no backup written)", async () => {
    const file = join(dir, "current.json");
    writeFileSync(file, JSON.stringify({ id: "y", version: "0.3.0" }));

    await loadAndMigrate(file, bump, schema, backupDir);

    expect(() => readFileSync(join(backupDir, "current.0.3.0.json"))).toThrow();
  });

  it("throws on corrupt JSON", async () => {
    const file = join(dir, "bad.json");
    writeFileSync(file, "{ not json");
    await expect(loadAndMigrate(file, bump, schema, backupDir)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ptah-app/lib-shared test -- migrate-resource`
Expected: FAIL — cannot find module `../migrate-resource`.

- [ ] **Step 3: Write minimal implementation**

Create `packages/lib-shared/src/repositories/migrate-resource.ts`:

```ts
import path from "node:path";
import { BASELINE_VERSION, getCurrentAppVersion } from "@ptah-app/lib-models";
import type { MigrationChain } from "../migrations";
import { runMigrations } from "../migrations";
import {
  createDirectory,
  readFileFromPath,
  writeFileToPath,
} from "./file.repository";

/**
 * Load a JSON resource, upgrade it from its stamped version to the current app
 * version, and validate with `schema`. When the file's version differs from the
 * current version, the original is backed up under `backupDir` (stamped with the
 * old version) and the upgraded file is written back in place.
 */
export const loadAndMigrate = async <T>(
  filePath: string,
  chain: MigrationChain,
  schema: { parseAsync: (data: unknown) => Promise<T> },
  backupDir: string,
): Promise<T> => {
  const raw = JSON.parse(await readFileFromPath(filePath)) as {
    version?: string;
  };
  const from = raw?.version ?? BASELINE_VERSION;
  const to = getCurrentAppVersion();
  const migrated = runMigrations(raw, chain, { from, to });

  if (from !== to) {
    await createDirectory(backupDir);
    const base = path.basename(filePath).replace(/\.json$/, "");
    await writeFileToPath(
      `${backupDir}/${base}.${from}.json`,
      JSON.stringify(raw, undefined, 2),
    );
    await writeFileToPath(filePath, JSON.stringify(migrated, undefined, 2));
  }

  return schema.parseAsync(migrated);
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ptah-app/lib-shared test -- migrate-resource`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/lib-shared/src/repositories/migrate-resource.ts packages/lib-shared/src/repositories/__tests__/migrate-resource.test.ts
git commit -m "feat(lib-shared): add loadAndMigrate repository helper"
```

---

## Task 10: Wire the program repository

**Files:**
- Modify: `packages/lib-shared/src/repositories/program.repository.ts`
- Test: `packages/lib-shared/src/repositories/__tests__/program.repository.test.ts`

- [ ] **Step 1: Write the failing integration test**

Create `packages/lib-shared/src/repositories/__tests__/program.repository.test.ts`:

```ts
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  PTAH_PROGRAMS_BACKUPS_PATH,
} from "../../env/vars.env";
import { loadProgramFromPath, saveProgramToPath } from "../program.repository";

const validUuid = "123e4567-e89b-12d3-a456-426614174000";

describe("program repository migration", () => {
  const original = process.env.APP_VERSION;
  let dir: string;

  beforeEach(() => {
    process.env.APP_VERSION = "0.3.0";
    dir = mkdtempSync(join(tmpdir(), "ptah-prog-"));
  });
  afterEach(() => {
    if (original === undefined) delete process.env.APP_VERSION;
    else process.env.APP_VERSION = original;
  });

  it("loads a pre-#218 program by migrating targetIntput -> targetInput", async () => {
    const file = join(dir, "legacy.json");
    writeFileSync(
      file,
      JSON.stringify({
        id: validUuid,
        name: "legacy",
        nodes: [],
        edges: [
          { id: validUuid, source: "a", target: "b", sourceOutput: 0, targetIntput: 2 },
        ],
      }),
    );

    const program = await loadProgramFromPath(file);
    expect(program.edges[0].targetInput).toBe(2);
    expect(program.version).toBe("0.3.0");

    // written back in place with the corrected shape
    const onDisk = JSON.parse(readFileSync(file, "utf8"));
    expect(onDisk.edges[0].targetInput).toBe(2);
    expect("targetIntput" in onDisk.edges[0]).toBe(false);
  });

  it("stamps the current version on save", async () => {
    const file = join(dir, "saved.json");
    await saveProgramToPath(
      { id: validUuid, name: "saved", nodes: [], edges: [] },
      file,
    );
    const onDisk = JSON.parse(readFileSync(file, "utf8"));
    expect(onDisk.version).toBe("0.3.0");
  });

  it("uses the shared backups path constant for shows/programs siblings", () => {
    expect(PTAH_PROGRAMS_BACKUPS_PATH.endsWith("/.backups/programs")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ptah-app/lib-shared test -- program.repository`
Expected: FAIL — `loadProgramFromPath` does not migrate; `saveProgramToPath` does not stamp version.

- [ ] **Step 3: Update the implementation**

Replace `packages/lib-shared/src/repositories/program.repository.ts`:

```ts
import * as models from "@ptah-app/lib-models";

import { PTAH_PROGRAMS_BACKUPS_PATH } from "../env/vars.env";
import { programMigrations } from "../migrations";
import {
  deleteFileFromPath,
  listFilesFromPath,
  writeFileToPath,
} from "./file.repository";
import { loadAndMigrate } from "./migrate-resource";

export const loadProgramFromPath = (path: string): Promise<models.Program> =>
  loadAndMigrate(
    path,
    programMigrations,
    models.program,
    PTAH_PROGRAMS_BACKUPS_PATH,
  );

export const saveProgramToPath = (
  program: models.Program,
  path: string,
): Promise<void> => {
  const json = JSON.stringify(
    { ...program, version: models.getCurrentAppVersion() },
    undefined,
    2,
  );

  return writeFileToPath(path, json);
};

export const listProgramFromPath = (path: string): Promise<string[]> =>
  listFilesFromPath(path, ["json"]);

export const deleteProgramFromPath = (path: string): Promise<void> =>
  deleteFileFromPath(path);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ptah-app/lib-shared test -- program.repository`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/lib-shared/src/repositories/program.repository.ts packages/lib-shared/src/repositories/__tests__/program.repository.test.ts
git commit -m "feat(lib-shared): migrate + version-stamp programs in the repository"
```

---

## Task 11: Wire the show repository

**Files:**
- Modify: `packages/lib-shared/src/repositories/show.repository.ts`
- Test: `packages/lib-shared/src/repositories/__tests__/show.repository.test.ts`

- [ ] **Step 1: Write the failing integration test**

Create `packages/lib-shared/src/repositories/__tests__/show.repository.test.ts`:

```ts
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadShowFromPath, saveShowToPath } from "../show.repository";

const validUuid = "123e4567-e89b-12d3-a456-426614174000";

describe("show repository migration", () => {
  const original = process.env.APP_VERSION;
  let dir: string;

  beforeEach(() => {
    process.env.APP_VERSION = "0.3.0";
    dir = mkdtempSync(join(tmpdir(), "ptah-show-"));
  });
  afterEach(() => {
    if (original === undefined) delete process.env.APP_VERSION;
    else process.env.APP_VERSION = original;
  });

  it("loads and re-stamps a legacy unstamped show", async () => {
    const file = join(dir, "legacy.json");
    writeFileSync(
      file,
      JSON.stringify({
        id: validUuid,
        name: "legacy",
        mapping: {},
        patch: {},
        programs: {},
      }),
    );

    const show = await loadShowFromPath(file);
    expect(show.version).toBe("0.3.0");
    expect(JSON.parse(readFileSync(file, "utf8")).version).toBe("0.3.0");
  });

  it("stamps the current version on save", async () => {
    const file = join(dir, "saved.json");
    await saveShowToPath(
      { id: validUuid, name: "saved", mapping: {}, patch: {}, programs: {} },
      file,
    );
    expect(JSON.parse(readFileSync(file, "utf8")).version).toBe("0.3.0");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ptah-app/lib-shared test -- show.repository`
Expected: FAIL — show is not re-stamped on load; save does not stamp version.

- [ ] **Step 3: Update the implementation**

Replace `packages/lib-shared/src/repositories/show.repository.ts`:

```ts
import * as models from "@ptah-app/lib-models";

import { PTAH_SHOWS_BACKUPS_PATH } from "../env/vars.env";
import { showMigrations } from "../migrations";
import {
  deleteFileFromPath,
  listFilesFromPath,
  writeFileToPath,
} from "./file.repository";
import { loadAndMigrate } from "./migrate-resource";

export const loadShowFromPath = (path: string): Promise<models.Show> =>
  loadAndMigrate(path, showMigrations, models.show, PTAH_SHOWS_BACKUPS_PATH);

export const saveShowToPath = (
  show: models.Show,
  path: string,
): Promise<void> => {
  const json = JSON.stringify(
    { ...show, version: models.getCurrentAppVersion() },
    undefined,
    2,
  );

  return writeFileToPath(path, json);
};

export const listShowFromPath = (path: string): Promise<string[]> =>
  listFilesFromPath(path, ["json"]);

export const deleteShowFromPath = (path: string) => deleteFileFromPath(path);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ptah-app/lib-shared test -- show.repository`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/lib-shared/src/repositories/show.repository.ts packages/lib-shared/src/repositories/__tests__/show.repository.test.ts
git commit -m "feat(lib-shared): migrate + version-stamp shows in the repository"
```

---

## Task 12: Wire the settings repository

**Files:**
- Modify: `packages/lib-shared/src/repositories/settings.repository.ts`
- Test: `packages/lib-shared/src/repositories/__tests__/settings.repository.test.ts`

- [ ] **Step 1: Write the failing integration test**

Create `packages/lib-shared/src/repositories/__tests__/settings.repository.test.ts`:

```ts
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadSettingsFromPath,
  saveSettingsToPath,
} from "../settings.repository";

const validSettings = {
  version: "0.0.1",
  midiVirtualPortName: "ptah",
  midiChannel: 1,
  appAdminPort: 3001,
};

describe("settings repository migration", () => {
  const original = process.env.APP_VERSION;
  let dir: string;

  beforeEach(() => {
    process.env.APP_VERSION = "0.3.0";
    dir = mkdtempSync(join(tmpdir(), "ptah-set-"));
  });
  afterEach(() => {
    if (original === undefined) delete process.env.APP_VERSION;
    else process.env.APP_VERSION = original;
  });

  it("re-stamps an old settings file on load", async () => {
    const file = join(dir, "settings.json");
    writeFileSync(file, JSON.stringify(validSettings));

    const settings = await loadSettingsFromPath(file);
    expect(settings.version).toBe("0.3.0");
    expect(JSON.parse(readFileSync(file, "utf8")).version).toBe("0.3.0");
  });

  it("stamps the current version on save", async () => {
    const file = join(dir, "settings.json");
    await saveSettingsToPath(validSettings, file);
    expect(JSON.parse(readFileSync(file, "utf8")).version).toBe("0.3.0");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ptah-app/lib-shared test -- settings.repository`
Expected: FAIL — load does not re-stamp; save does not stamp.

- [ ] **Step 3: Update the implementation**

Replace `packages/lib-shared/src/repositories/settings.repository.ts`:

```ts
import * as models from "@ptah-app/lib-models";

import { PTAH_SETTINGS_BACKUPS_PATH } from "../env/vars.env";
import { settingsMigrations } from "../migrations";
import { writeFileToPath } from "./file.repository";
import { loadAndMigrate } from "./migrate-resource";

export const loadSettingsFromPath = (
  path: string,
): Promise<models.Settings> =>
  loadAndMigrate(
    path,
    settingsMigrations,
    models.settings,
    PTAH_SETTINGS_BACKUPS_PATH,
  );

export const saveSettingsToPath = async (
  settings: models.Settings,
  path: string,
): Promise<models.Settings> => {
  const stamped = { ...settings, version: models.getCurrentAppVersion() };

  await writeFileToPath(path, JSON.stringify(stamped, undefined, 2));

  return stamped;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ptah-app/lib-shared test -- settings.repository`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the full lib-shared + lib-models + lib-domains suite**

Run: `pnpm --filter @ptah-app/lib-shared --filter @ptah-app/lib-models --filter @ptah-app/lib-domains test`
Expected: PASS (all suites green).

- [ ] **Step 6: Commit**

```bash
git add packages/lib-shared/src/repositories/settings.repository.ts packages/lib-shared/src/repositories/__tests__/settings.repository.test.ts
git commit -m "feat(lib-shared): migrate + version-stamp settings in the repository"
```

---

## Task 13: Changeset (version bump to 0.3.0)

**Files:**
- Create: `.changeset/file-migrations.md`

The program migration is keyed to `0.3.0`, so the app must release as `0.3.0`.
Because `@ptah-app/app` reads its own `package.json` version into `APP_VERSION`,
it must be bumped **minor** explicitly (an internal-dependency patch bump would
make it `0.2.4` and the `0.3.0` migration would never run).

- [ ] **Step 1: Write the changeset**

Create `.changeset/file-migrations.md`:

```md
---
"@ptah-app/app": minor
"@ptah-app/lib-models": minor
"@ptah-app/lib-shared": minor
"@ptah-app/lib-domains": minor
---

Add a file migration system: resource JSON files are stamped with the app
version and upgraded on load (lazy, with a backup under `~/.ptah/.backups/`)
before Zod validation. Ships the first migration, fixing program loading broken
by the `targetIntput → targetInput` edge-field rename (#218).
```

- [ ] **Step 2: Verify changeset status**

Run: `pnpm changeset status` (if available) or visually confirm the four packages
are listed as `minor`.
Expected: all four bump `0.2.3 → 0.3.0`.

- [ ] **Step 3: Commit**

```bash
git add .changeset/file-migrations.md
git commit -m "chore(changeset): file migration system, minor bump to 0.3.0"
```

---

## Task 14: Document the migration-authoring recipe

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Add a "File migrations" section**

Insert this section into `AGENTS.md` after the "Testing" section:

```md
## File migrations

Resources in `~/.ptah/` (settings, shows, programs) are JSON files validated with
Zod on load. Each file carries a `version` stamp (the app version that wrote it).
When a model change alters a file's shape, add a migration so old files still
load:

1. Add an entry to the relevant chain in
   `packages/lib-shared/src/migrations/<resource>.migrations.ts`:
   `{ version: "<next-release>", up: (raw) => /* transform plain JSON */ }`.
   The `version` is the app version the migration upgrades TO.
2. Write `up` against plain JSON (old shapes won't satisfy the current Zod model)
   and make it idempotent.
3. Add a fixture test under `packages/lib-shared/src/migrations/__tests__/`.
4. Bump the app version to that release via a changeset (the migration only runs
   for files whose stamped version is older than the current `APP_VERSION`).

Loads run lazily through `repositories/migrate-resource.ts`: the original is
backed up under `~/.ptah/.backups/<resource>/<name>.<oldversion>.json`, the
upgraded file is written back, then validated.
```

- [ ] **Step 2: Commit**

```bash
git add AGENTS.md
git commit -m "docs: document the file-migration authoring recipe"
```

---

## Task 15: Full verification gate

- [ ] **Step 1: Typecheck the touched packages**

Run: `pnpm --filter @ptah-app/lib-models --filter @ptah-app/lib-domains --filter @ptah-app/lib-shared typecheck`
Expected: PASS (no errors).

- [ ] **Step 2: Format + lint (Biome)**

Run: `pnpm format` then `pnpm check`
Expected: PASS. If format reports issues, run `pnpm format:fix` and re-commit.

- [ ] **Step 3: Run the full test gate for touched packages**

Run: `pnpm --filter @ptah-app/lib-models --filter @ptah-app/lib-domains --filter @ptah-app/lib-shared --filter @ptah-app/service-api test`
Expected: PASS — including the pre-existing `service-api` route tests (they mock
the services, so repository changes do not affect them).

- [ ] **Step 4: Attempt the full gate (best-effort given the env caveat)**

Run: `pnpm allcheck`
Expected: PASS where the toolchain allows. If it fails **only** in `service-midi`
due to the `node-gyp`/`midi` native build, note that in the PR as a pre-existing
local-environment limitation; CI builds it normally.

- [ ] **Step 5: Commit any formatting fixups**

```bash
git add -A
git commit -m "style: biome formatting for migration system" || echo "nothing to commit"
```

---

## Task 16: Push branch and open the PR

Follows the repo convention (the two human-authored PRs use a `feat/<desc>`
branch and the branch name as the PR title).

- [ ] **Step 1: Push to the convention-correct remote branch**

Run:
```bash
git push -u origin HEAD:feat/file-migrations
```
Expected: remote branch `feat/file-migrations` created.

- [ ] **Step 2: Create the PR with the template filled in**

Title: `feat/file-migrations`

Body — fill out `.github/pull_request_template.md`:
- **Description:** the file migration system (app-version-keyed, lazy load +
  write-back, backups) and the #218 program-loading fix.
- **Type of Change:** check **Bug fix** and **New feature**.
- **Changes Made:** migration engine (`runMigrations` + semver), version stamping
  in `lib-models` + repositories, `loadAndMigrate` with backups, the
  `targetIntput → targetInput` program migration, minor changeset → `0.3.0`,
  docs.
- **Testing:** check **Unit tests added/updated** and **Manual testing performed**.
- **Checklist:** tick style, self-review, documentation updated, no new warnings,
  tests pass locally.
- **Related Issues:** reference the #218 regression.
- **Additional Notes:** the migration-authoring recipe (now in `AGENTS.md`); the
  `service-midi`/`node-gyp` local build caveat.

Run (example):
```bash
gh pr create --base master --head feat/file-migrations --title "feat/file-migrations" --body-file <filled-template>
```

- [ ] **Step 3: Report the PR URL to the user.**

---

## Self-review (completed by plan author)

- **Spec coverage:** version scheme (Task 1), lazy load + write-back (Task 9),
  backup-before-write-back (Tasks 4, 9), `.backups/` tree (Task 4), all three
  resources (Tasks 10–12), legacy=baseline (Tasks 1, 9), Approach A engine (Tasks
  6–8), #218 program fix (Task 8), branch/PR/template conventions (Task 16),
  minor changeset → 0.3.0 (Task 13), `AGENTS.md` recipe (Task 14). All covered.
- **Placeholder scan:** none — every code/test step is concrete.
- **Type consistency:** `getCurrentAppVersion`, `BASELINE_VERSION`,
  `runMigrations({from,to})`, `loadAndMigrate(filePath, chain, schema, backupDir)`,
  `MigrationChain`, and the `PTAH_*_BACKUPS_PATH` constants are named identically
  across all tasks.
- **Deviations:** version constant in `lib-models` and optional `version` field —
  documented at the top and applied consistently.
