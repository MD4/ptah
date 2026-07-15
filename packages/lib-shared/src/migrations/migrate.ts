import {
  BASELINE_VERSION,
  getCurrentAppVersion,
  MAX_VERSION,
} from "@ptah-app/lib-models";
import type { MigrationChain } from "./migration.types";
import { compareVersions } from "./semver";

/**
 * The version to stamp into files on write. The real app version when known;
 * otherwise the newest migration in the resource's chain — a truthful "this
 * shape has every known migration applied" stamp that keeps future migrations
 * runnable (unlike the MAX_VERSION sentinel, which would exempt the file from
 * every migration forever). Baseline when the chain is empty.
 */
export const getStampVersion = (chain: MigrationChain): string => {
  const appVersion = getCurrentAppVersion();

  if (appVersion !== MAX_VERSION) {
    return appVersion;
  }

  return (
    [...chain].sort((a, b) => compareVersions(a.version, b.version)).at(-1)
      ?.version ?? BASELINE_VERSION
  );
};

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
