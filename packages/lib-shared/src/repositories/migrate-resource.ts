import path from "node:path";
import { log } from "@ptah-app/lib-logger";
import {
  BASELINE_VERSION,
  getCurrentAppVersion,
  MAX_VERSION,
} from "@ptah-app/lib-models";
import type { MigrationChain } from "../migrations";
import { getStampVersion, runMigrations } from "../migrations";
import {
  createDirectory,
  readFileFromPath,
  writeFileToPath,
} from "./file.repository";

/**
 * Load a JSON resource, upgrade it from its stamped version to the current app
 * version, and validate with `schema`. When the upgrade changes the file, the
 * original is backed up under `backupDir` (stamped with the old version) and
 * the upgraded file is written back in place.
 *
 * A stored MAX_VERSION stamp means the file was written in a context where the
 * real app version was unknown (e.g. services run standalone). It says nothing
 * about which migrations have been applied, so it is treated as "unknown" and
 * the whole chain re-runs — migrations are idempotent by contract, and the
 * content comparison keeps already-migrated files untouched.
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
  const storedVersion = raw?.version ?? BASELINE_VERSION;
  const from = storedVersion === MAX_VERSION ? BASELINE_VERSION : storedVersion;
  // The migration window still targets MAX when the app version is unknown
  // (never skip anything); the stamp written back is always a real version.
  const to = getCurrentAppVersion();
  const stampVersion = getStampVersion(chain);

  const migrated = {
    ...(runMigrations(raw, chain, { from, to }) as object),
    version: stampVersion,
  };

  if (JSON.stringify(migrated) !== JSON.stringify(raw)) {
    log(
      `Migrating resource at ${filePath} from version ${storedVersion} to ${stampVersion}.`,
    );

    await createDirectory(backupDir);
    const base = path.basename(filePath).replace(/\.json$/, "");
    await writeFileToPath(
      `${backupDir}/${base}.${storedVersion}.json`,
      JSON.stringify(raw, undefined, 2),
    );
    await writeFileToPath(filePath, JSON.stringify(migrated, undefined, 2));
  }

  return schema.parseAsync(migrated);
};
