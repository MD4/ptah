# File Migration System — Design

- **Date:** 2026-06-03
- **Status:** Approved (brainstorming), pending implementation plan
- **Branch:** `worktree-feat+file-migrations`

## Problem

PTAH persists three resource types as JSON files under `~/.ptah/`:

- **Settings** — single file (`~/.ptah/.ptah-settings.json`).
- **Shows** — one file per show (`~/.ptah/shows/<name>.json`).
- **Programs** — one file per program (`~/.ptah/programs/<name>.json`).

Each is loaded in `packages/lib-shared/src/repositories/` via
`JSON.parse(...)` → `zodModel.parseAsync(...)`. When a model change alters the
JSON shape, old files on disk no longer satisfy the current Zod schema and
loading throws. This has already happened: **PR #218** (commit `cb7f6d1`,
merged 2026-05-01) renamed the edge field `targetIntput` → `targetInput`. Edges
live inside program files, so every program written before that rename now fails
`program.parseAsync` with *"Required: targetInput"* — program loading is broken.

We need a file migration system that upgrades old files to the current schema
before validation.

## Decisions (locked)

| Decision | Choice |
| --- | --- |
| Version scheme | **Tie to app version** — files carry a semver `version` = the app version that wrote them; migrations are keyed to app versions. |
| Trigger | **Lazy on load + write-back** — migrate transparently in the repository load path, then persist the upgraded file. |
| Safety | **Backup before write-back** — copy the original to a backups tree before overwriting. |
| Backup location | **`~/.ptah/.backups/` tree** — mirrored per type, stamped with the old version. |
| Scope | **All three** resources (settings, shows, programs). |
| Legacy files | **Treat missing `version` as baseline** (`0.2.3`, the current app version). |
| Engine approach | **Approach A** — ordered semver-keyed migration chain operating on raw JSON; the existing current Zod model is the final validation gate. |

## Architecture

### Module layout

New module `packages/lib-shared/src/migrations/`:

```
migrations/
  migration.types.ts      # Migration, MigrationChain types
  migrate.ts              # runMigrations() core engine (pure, no I/O)
  app-version.ts          # CURRENT_APP_VERSION + BASELINE_VERSION resolution + semver compare
  settings.migrations.ts  # ordered chain for settings (empty initially)
  show.migrations.ts      # ordered chain for shows (empty initially)
  program.migrations.ts   # ordered chain for programs (targetIntput fix)
  index.ts                # re-exports + registry { settings, show, program }
  __tests__/              # engine + per-chain tests
```

Plus a shared repository helper `packages/lib-shared/src/repositories/migrate-resource.ts`
and a `PTAH_BACKUPS_PATH` addition to `packages/lib-shared/src/env/vars.env.ts`.

### Data-model changes (`packages/lib-models`)

- **Show** and **Program** gain a required `version: version` field (reusing the
  existing semver schema in `version.model.ts`). In-memory objects are always
  stamped; the repository layer supplies the baseline default for unstamped files
  *before* `parseAsync`, so the canonical model can require it.
- **Settings** already has `version`; it is repurposed as *the* schema stamp (the
  app version that wrote the file). `appVersion` keeps its existing runtime-display
  role (injected from env on GET in `settings.service.ts`); a one-line comment in
  the model documents the distinction.
- `createSettings()`, plus the create paths for shows/programs, stamp
  `CURRENT_APP_VERSION` instead of the hardcoded `"0.0.1"`.

### Version resolution (`app-version.ts`)

- `CURRENT_APP_VERSION` — resolved from `process.env.APP_VERSION`, falling back to
  `BASELINE_VERSION` (matches the existing pattern in `settings.service.ts`).
- `BASELINE_VERSION = "0.2.3"` — the version assumed for any file with no `version`.
- A small internal semver comparator for the `major.minor.patch[-pre][+build]`
  shape already defined in `version.model.ts` (no new dependency).

## The engine

### Types

```ts
// migration.types.ts
export type Migration = {
  version: Version;               // app version this migration upgrades the file TO
  up: (raw: unknown) => unknown;  // operates on plain JSON, never a parsed model
};
export type MigrationChain = Migration[]; // authored in ascending version order
```

### `runMigrations` (pure, no I/O, no Zod)

```ts
runMigrations(raw, chain, { from, to }): unknown
```

1. `from` = the file's `version` (or `BASELINE_VERSION` if absent); `to` = `CURRENT_APP_VERSION`.
2. Select migrations where `from < migration.version <= to`, sorted ascending by semver.
3. Fold each `up` over `raw`.
4. Return `{ ...migrated, version: to }` (re-stamp).

It does no file I/O and no Zod parsing — purely transforms an object. Migrations
operate on plain JSON because old shapes will not satisfy the current Zod schema.

### Shared repository helper

```ts
loadAndMigrate(path, chain, zodModel, backupDir):
  raw      = JSON.parse(readFileFromPath(path))
  from     = raw?.version ?? BASELINE_VERSION
  migrated = runMigrations(raw, chain, { from, to: CURRENT_APP_VERSION })
  if (from !== CURRENT_APP_VERSION):              # changed and/or needs stamping
     mkdir -p backupDir
     write backupDir/<name>.<from>.json  = original raw
     write path                          = JSON.stringify(migrated, null, 2)
  return zodModel.parseAsync(migrated)            # existing Zod gate, unchanged
```

- The three repository load functions (`loadShowFromPath`, `loadProgramFromPath`,
  `loadSettingsFromPath`) become thin callers of `loadAndMigrate` with their own
  chain + model + backup subdir.
- Save paths stamp `version: CURRENT_APP_VERSION` before writing.
- **Empty chains are valid** — wiring a resource in with zero migrations is a
  no-op that simply starts stamping files.

### Backups on disk

```
~/.ptah/
  .backups/
    shows/    <name>.<oldver>.json
    programs/ <name>.<oldver>.json
    settings/ .ptah-settings.<oldver>.json
```

Backups are written only when `from !== CURRENT_APP_VERSION`, stamped with the
*old* version so successive upgrades don't clobber each other. A dedicated
`.backups/` tree (rather than sibling `.bak` files) keeps backups out of
`listFilesFromPath`, which lists `shows/` and `programs/` by `.json` extension.

### One-time rewrite-on-first-load (accepted)

Because `from !== CURRENT_APP_VERSION` is true for every legacy/unstamped file,
the first load after this ships will back up and rewrite each existing file once,
stamping it with the current version. This is intentional — it is how legacy
files acquire their version stamp.

## First real migration: `targetIntput` → `targetInput`

PR #218 renamed the edge field. Only **programs** are affected (edges live only in
program files). The migration lives in `program.migrations.ts`:

```ts
{
  version: "0.3.0",                 // ships in the release carrying the migration system
  up: (raw) => ({
    ...raw,
    edges: (raw.edges ?? []).map((e) =>
      "targetIntput" in e
        ? { ...omit(e, "targetIntput"), targetInput: e.targetIntput }
        : e,                         // idempotent: already-correct edges untouched
    ),
  }),
}
```

### Version-keying rationale

The rename landed at/before the current `0.2.3`, yet broken files exist now. The
rule "missing `version` ⇒ baseline `0.2.3`" means a migration keyed at or below
`0.2.3` would never run on those baseline files. So the migration is keyed to the
**next release (`0.3.0`)** — the version shipping the migration system itself — so
that `baseline 0.2.3 < 0.3.0` and it fires on every unstamped program. Written
idempotently, it leaves already-correct programs untouched.

This couples migration target-versions to actual released versions. The coupling
is managed by changesets: this work adds a **minor** changeset, bumping all
(lockstep) packages `0.2.3` → `0.3.0` to match the migration's `version`.

The settings and show chains ship **empty**; only the program chain has an entry.

## Testing

- **Engine (`migrate.test.ts`):** version filtering (`from < v <= to`), ordering
  of out-of-order chains, empty-chain no-op, missing-version ⇒ baseline,
  re-stamp correctness, idempotency (running twice = once).
- **Program chain:** fixture of a real pre-#218 program (edge with `targetIntput`)
  → loads successfully, key renamed, value preserved, second load is a no-op; an
  already-migrated program passes through unchanged.
- **Repository (`migrate-resource`) tests** (temp dir): legacy unstamped file is
  stamped + backed up exactly once; already-current file is a no-op (no backup);
  backup lands at `.backups/<type>/<name>.<oldver>.json`; corrupt JSON still
  throws cleanly.
- **Models test:** extend `models.test.ts` for the new required `version` on show
  and program.

## Rollout / PR

- Ships **infrastructure + one real program migration** (not empty-chains-only).
- Add a **minor** changeset (`0.2.3` → `0.3.0`).
- Gate before PR: `pnpm allcheck` (format → lint → typecheck → build → test).
  - Note: `pnpm i` currently aborts on the `midi` native rebuild
    (`node-gyp` missing locally); this is a pre-existing toolchain gap in
    `service-midi`, unrelated to this change.
- Add a short "File migrations" section to `AGENTS.md`.

### Branch / PR conventions (must match repo)

Observed from the two human-authored PRs in the repo (`feat/tests-and-bugs`,
`feat/node-input-audio`); all other PRs are dependabot.

- **Branch name:** `feat/<kebab-desc>` → **`feat/file-migrations`**.
  - The local worktree branch is `worktree-feat+file-migrations` (the worktree
    tool sanitizes `/`). Keep it as-is locally and push to the convention-correct
    remote branch: `git push -u origin HEAD:feat/file-migrations`.
- **PR title:** the repo's convention is the branch name verbatim →
  **`feat/file-migrations`**.
- **PR body:** fill out every section of `.github/pull_request_template.md`:
  - *Description* — the migration system + the #218 program-loading fix.
  - *Type of Change* — check **Bug fix** and **New feature**.
  - *Changes Made* — the migration engine, version stamping, backup-on-write-back,
    the `targetIntput → targetInput` program migration, the minor changeset, docs.
  - *Testing* — check **Unit tests added/updated** and **Manual testing performed**.
  - *Checklist* — tick the items that hold (style, self-review, docs updated,
    no new warnings, tests pass locally).
  - *Related Issues* — reference the #218 regression.
  - *Additional Notes* — document the **migration-authoring recipe**: when a model
    change breaks an old file, add one `{ version, up }` entry to that resource's
    chain + a fixture test, and bump the target version via changeset.

## Out of scope (YAGNI)

- Down-migrations / rollback (backups cover recovery).
- Atomic temp-file-and-rename writes (backup chosen as the safety net).
- A standalone `ptah migrate` command (lazy-on-load covers the need).
- Validating every intermediate migration step against a frozen historical schema
  (Approach B) — the final current-model Zod gate plus per-migration fixtures
  suffice.
