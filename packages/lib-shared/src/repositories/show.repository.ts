import * as models from "@ptah/lib-models";

import {
  deleteFileFromPath,
  listFilesFromPath,
  readFileFromPath,
  writeFileToPath,
} from "./file.repository";

export const loadShowFromPath = async (path: string): Promise<models.Show> => {
  return models.show.parseAsync(JSON.parse(await readFileFromPath(path)));
};

export const saveShowToPath = async (
  show: models.Show,
  path: string,
): Promise<void> => {
  const json = JSON.stringify(show, undefined, 2);

  return writeFileToPath(path, json);
};

export const listShowFromPath = (path: string): Promise<string[]> =>
  listFilesFromPath(path, ["json"]);

export const deleteShowFromPath = (path: string) => deleteFileFromPath(path);
