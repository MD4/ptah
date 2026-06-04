# AGENTS.md

Guidance for AI coding agents working in the PTAH repository.

## Overview

PTAH ("Control your lights") is a **MIDI to DMX mapper and program runner**. It
is a pnpm + Turbo TypeScript monorepo published to npm as `@ptah-app/app`. A CLI
entry point orchestrates several backend services that communicate over KALM
IPC, Socket.io, and Express, fronted by a React admin web UI and an Ink-based
terminal UI. Validation is done with Zod throughout.

## Setup

- Node.js **>= 20** (run `nvm use` if you have nvm).
- Package manager is **pnpm 9.15.4** — do not use npm or yarn for installs.

```bash
pnpm i
```

## Commands

Run all of these from the repo root (Turbo fans out across the workspace).

| Purpose | Command |
| --- | --- |
| Install deps | `pnpm i` |
| Dev (all packages, watch) | `pnpm dev` |
| Build all | `pnpm build` |
| Run all tests | `pnpm test` |
| Tests with coverage | `pnpm test:coverage` |
| Typecheck all | `pnpm typecheck` |
| Format check / fix | `pnpm format` / `pnpm format:fix` |
| Lint check / fix | `pnpm check` / `pnpm check:fix` |
| Full gate (format + check + typecheck + test) | `pnpm allcheck` |
| Clean build artifacts | `pnpm clean` |
| Start CLI app | `pnpm start` |
| Start web admin UI | `pnpm start:ui` |

**Before considering any change done, run `pnpm allcheck`** — it mirrors what CI
enforces.

Work on a single package with a filter, e.g.:

```bash
pnpm --filter @ptah-app/lib-domains test
# or
cd packages/lib-domains && pnpm test
```

## Monorepo layout

`apps/*` — runnable applications:

- `app` — CLI entry point; orchestrates all services (the published `ptah` binary).
- `ui-admin` — React 19 + Vite + Ant Design admin web UI.
- `ui-cli` — Ink (React for the terminal) TUI.
- `service-main` — core orchestration / program-runner logic.
- `service-api` — Express REST API.
- `service-bus` — KALM-based message/event bus for inter-service IPC.
- `service-gateway-ws` — Socket.io WebSocket gateway for the web UI.
- `service-midi` — MIDI device input/output handler.

`packages/*` — shared libraries and config:

- `lib-domains` — business/domain logic (heavily tested).
- `lib-models` — Zod data models and types.
- `lib-utils` — utility helpers.
- `lib-shared` — shared IPC/constants across services.
- `lib-logger` — logging utility.
- `config-ts` — base TypeScript configs (`base.json`, `vite.json`, `react-library.json`).
- `config-jest` — shared Jest preset (`jest-presets/jest/node`).

## Conventions

- **Biome is the single source of truth** for formatting and linting (`biome.json`).
  Do **not** add ESLint or Prettier. Style: 2-space indent, 80-column width,
  double quotes, semicolons, trailing commas, organized imports.
- **TypeScript strict mode** via `packages/config-ts`. Uses `isolatedModules`
  and `moduleResolution: bundler`. Keep types sound; avoid `any`.
- **Zod** for runtime validation (models, API inputs, domain objects).
- **Conventional Commits** with scopes, e.g. `fix(lib-domains): ...`,
  `feat(service-api): ...`, `chore(deps): ...`.

## Testing

- Framework: **Jest 30** with `ts-jest`, using the shared preset from `@ptah-app/config-jest`.
- Tests live in `src/__tests__/` and are named `*.test.ts` / `*.test.tsx`.
- Workspace imports are resolved to source via Jest `moduleNameMapper` in each
  package's `package.json`.
- Add or update tests for new features and bug fixes; aim to keep coverage healthy.

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

## CI / before opening a PR

- `.github/workflows/build.yml` runs on push/PR to `master`: format check → lint
  check → typecheck → build → tests → coverage upload (Codecov). Match it locally
  with `pnpm allcheck`.
- There are **no pre-commit hooks** (no husky/lint-staged) — CI is the gate, so
  run checks yourself before pushing.
- The PR template expects: style-guide compliance, self-review, comments where
  needed, tests, and no new warnings.

## Gotchas

- Builds depend on each other (`^build` in `turbo.json`); workspace packages are
  consumed from their `dist/` output, so a stale build can surface as a type or
  import error — `pnpm build` (or `pnpm dev`) resolves it.
- Turbo caches `build`/`test`/`typecheck`. `dev` is persistent and uncached.
- Several tasks read env vars defined in `turbo.json` (e.g. `SERVICE_BUS_PORT`,
  `SERVICE_API_PORT`, `SERVICE_GATEWAY_WS_PORT`, `VITE_UI_ADMIN_NAME`); local
  `.env.*local` files trigger rebuilds.
- The global `ptah` / `ptah-cli` commands are **not** linked during `build`. End
  users get them automatically from the `bin` field on `npm install -g`. For
  local development, link them on demand (after a build) with `pnpm run
  link:global`.
