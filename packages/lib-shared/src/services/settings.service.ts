import * as domains from "@ptah/lib-domains";
import { log } from "@ptah/lib-logger";
import type * as models from "@ptah/lib-models";

import { PTAH_DIRECTORY, PTAH_SETTINGS_PATH } from "../env/vars.env";
import {
  checkIfDirectoryExists,
  createDirectory,
  checkIfFileExists,
} from "../repositories/file.repository";
import {
  loadSettingsFromPath,
  saveSettingsToPath,
} from "../repositories/settings.repository";

const LOG_CONTEXT = `${process.env.UI_ADMIN_NAME ?? ""}:settings`;

export const loadSettingsOrInitialize = async (): Promise<models.Settings> => {
  log(LOG_CONTEXT, `loading settings..`);

  if (!(await checkIfDirectoryExists(PTAH_DIRECTORY))) {
    log(LOG_CONTEXT, `settings directory does not exists, creating..`);
    await createDirectory(PTAH_DIRECTORY);
    log(LOG_CONTEXT, `settings directory created`);
  }

  if (!(await checkIfFileExists(PTAH_SETTINGS_PATH))) {
    log(LOG_CONTEXT, `settings file does not exists, creating..`);
    const settings = domains.settings.createSettings();

    await saveSettingsToPath(settings, PTAH_SETTINGS_PATH);
    log(LOG_CONTEXT, `settings directory created`);

    return settings;
  }

  const settings = await loadSettingsFromPath(PTAH_SETTINGS_PATH);

  log(LOG_CONTEXT, `settings loaded`);

  return settings;
};
