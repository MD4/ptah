import type * as models from "@ptah/lib-models";
import { repositories, env } from "@ptah/lib-shared";
import * as domains from "@ptah/lib-domains";

const PTAH_PROGRAMS_PATH = `${env.vars.PTAH_DIRECTORY}/programs`;

export const handleProgramList = async (): Promise<
  models.Program["name"][]
> => {
  await repositories.file.checkPathAndInitialize(PTAH_PROGRAMS_PATH);

  return repositories.program.listProgramFromPath(PTAH_PROGRAMS_PATH);
};

export const handleProgramCreate = async (
  name: string
): Promise<models.Program> => {
  await repositories.file.checkPathAndInitialize(PTAH_PROGRAMS_PATH);

  const program = domains.program.createProgram(name);

  await repositories.program.saveProgramToPath(
    program,
    `${PTAH_PROGRAMS_PATH}/${name}.json`
  );

  return program;
};

export const handleProgramGet = async (
  name: string
): Promise<models.Program> => {
  await repositories.file.checkPathAndInitialize(PTAH_PROGRAMS_PATH);

  return repositories.program.loadProgramFromPath(
    `${PTAH_PROGRAMS_PATH}/${name}.json`
  );
};
