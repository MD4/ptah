import * as models from "@ptah/lib-models";
import { readFileFromPath, writeFileToPath } from "./file.repository";

export const loadSettingsFromPath = async (
  path: string,
): Promise<models.Settings> => {
  const buffer = await readFileFromPath(path);

  return models.settings.parseAsync(JSON.parse(buffer));
};

export const saveSettingsToPath = async (
  settings: models.Settings,
  path: string,
): Promise<models.Settings> => {
  const json = JSON.stringify(settings, undefined, 2);

  await writeFileToPath(path, json);

  return settings;
};
