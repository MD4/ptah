import type * as models from "@ptah/lib-models";
import { env, repositories } from "@ptah/lib-shared";

export const handleSettingsGet = async (): Promise<models.Settings> =>
  repositories.settings.loadSettingsFromPath(env.vars.PTAH_SETTINGS_PATH);

export const handleSettingsPut = async (
  settings: models.Settings,
): Promise<models.Settings> =>
  repositories.settings.saveSettingsToPath(
    settings,
    env.vars.PTAH_SETTINGS_PATH,
  );
