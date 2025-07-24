import * as models from "@ptah/lib-models";

import {
  deleteFileFromPath,
  listFilesFromPath,
  readFileFromPath,
  writeFileToPath,
} from "./file.repository";

export const loadProgramFromPath = async (
  path: string,
): Promise<models.Program> => {
  const buffer = await readFileFromPath(path);

  return models.program.parseAsync(JSON.parse(buffer));
};

export const saveProgramToPath = async (
  program: models.Program,
  path: string,
): Promise<void> => {
  const json = JSON.stringify(program, undefined, 2);

  return writeFileToPath(path, json);
};

export const listProgramFromPath = (path: string): Promise<string[]> =>
  listFilesFromPath(path, ["json"]);

export const deleteProgramFromPath = (path: string): Promise<void> =>
  deleteFileFromPath(path);
