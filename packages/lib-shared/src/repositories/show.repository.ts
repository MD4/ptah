import fs from "node:fs/promises";
import * as models from "@ptah/lib-models";
import { listFilesFromPath } from "./file.repository";

export const loadShowFromPath = async (path: string): Promise<models.Show> => {
  const buffer = await fs.readFile(path, "utf8");

  return models.show.parseAsync(JSON.parse(buffer));
};

export const saveShowToPath = async (
  show: models.Show,
  path: string
): Promise<void> => {
  const json = JSON.stringify(show, undefined, 2);

  return fs.writeFile(path, json);
};

export const listShowFromPath = (path: string): Promise<string[]> =>
  listFilesFromPath(path, ["json"]);
