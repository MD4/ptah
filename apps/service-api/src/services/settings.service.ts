import type * as models from "@ptah/lib-models";
import { env, repositories } from "@ptah/lib-shared";

export const handleSettingsGet = async (): Promise<models.Settings> =>
  repositories.settings.loadSettingsFromPath(env.vars.PTAH_SETTINGS_PATH);
