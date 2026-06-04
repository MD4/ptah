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
