import * as models from "@ptah-app/lib-models";

import { PTAH_PROGRAMS_BACKUPS_PATH } from "../env/vars.env";
import { programMigrations } from "../migrations";
import {
  deleteFileFromPath,
  listFilesFromPath,
  writeFileToPath,
} from "./file.repository";
import { loadAndMigrate } from "./migrate-resource";

export const loadProgramFromPath = (path: string): Promise<models.Program> =>
  loadAndMigrate(
    path,
    programMigrations,
    models.program,
    PTAH_PROGRAMS_BACKUPS_PATH,
  );

export const saveProgramToPath = (
  program: models.Program,
  path: string,
): Promise<void> => {
  const json = JSON.stringify(
    { ...program, version: models.getCurrentAppVersion() },
    undefined,
    2,
  );

  return writeFileToPath(path, json);
};

export const listProgramFromPath = (path: string): Promise<string[]> =>
  listFilesFromPath(path, ["json"]);

export const deleteProgramFromPath = (path: string): Promise<void> =>
  deleteFileFromPath(path);
