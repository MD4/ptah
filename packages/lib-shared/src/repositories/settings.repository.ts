import fs from "node:fs/promises";
import * as models from "@ptah/lib-models";

export const loadSettingsFromPath = async (
  path: string
): Promise<models.Settings> => {
  const buffer = await fs.readFile(path, "utf8");

  return models.settings.parseAsync(JSON.parse(buffer));
};

export const saveSettingsToPath = async (
  show: models.Settings,
  path: string
): Promise<void> => {
  const json = JSON.stringify(show);

  await fs.writeFile(path, json);
};
