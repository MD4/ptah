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
