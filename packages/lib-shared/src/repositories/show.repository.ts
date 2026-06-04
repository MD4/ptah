import * as models from "@ptah-app/lib-models";

import { PTAH_SHOWS_BACKUPS_PATH } from "../env/vars.env";
import { showMigrations } from "../migrations";
import {
  deleteFileFromPath,
  listFilesFromPath,
  writeFileToPath,
} from "./file.repository";
import { loadAndMigrate } from "./migrate-resource";

export const loadShowFromPath = (path: string): Promise<models.Show> =>
  loadAndMigrate(path, showMigrations, models.show, PTAH_SHOWS_BACKUPS_PATH);

export const saveShowToPath = (
  show: models.Show,
  path: string,
): Promise<void> => {
  const json = JSON.stringify(
    { ...show, version: models.getCurrentAppVersion() },
    undefined,
    2,
  );

  return writeFileToPath(path, json);
};

export const listShowFromPath = (path: string): Promise<string[]> =>
  listFilesFromPath(path, ["json"]);

export const deleteShowFromPath = (path: string) => deleteFileFromPath(path);
