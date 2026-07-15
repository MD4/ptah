import * as models from "@ptah-app/lib-models";

import { PTAH_SETTINGS_BACKUPS_PATH } from "../env/vars.env";
import { getStampVersion, settingsMigrations } from "../migrations";
import { writeFileToPath } from "./file.repository";
import { loadAndMigrate } from "./migrate-resource";

export const loadSettingsFromPath = (path: string): Promise<models.Settings> =>
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
  const stamped = { ...settings, version: getStampVersion(settingsMigrations) };

  await writeFileToPath(path, JSON.stringify(stamped, undefined, 2));

  return stamped;
};
