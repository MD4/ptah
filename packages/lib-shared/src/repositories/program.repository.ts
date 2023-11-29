import fs from "node:fs/promises";
import * as models from "@ptah/lib-models";
import { listFilesFromPath } from "./file.repository";

export const loadProgramFromPath = async (
  path: string
): Promise<models.Program> => {
  const buffer = await fs.readFile(path, "utf8");

  return models.program.parseAsync(JSON.parse(buffer));
};

export const saveProgramToPath = async (
  program: models.Program,
  path: string
): Promise<void> => {
  const json = JSON.stringify(program, undefined, 2);

  return fs.writeFile(path, json);
};

export const listProgramFromPath = (path: string): Promise<string[]> =>
  listFilesFromPath(path, ["json"]);
