import * as domains from "@ptah-app/lib-domains";
import type * as models from "@ptah-app/lib-models";
import { env, repositories } from "@ptah-app/lib-shared";

export const handleProgramList = async (): Promise<models.ProgramName[]> => {
  await repositories.file.checkPathAndInitialize(env.vars.PTAH_PROGRAMS_PATH);

  return repositories.program.listProgramFromPath(env.vars.PTAH_PROGRAMS_PATH);
};

export const handleProgramCreate = async (
  name: models.ProgramName,
): Promise<models.Program> => {
  await repositories.file.checkPathAndInitialize(env.vars.PTAH_PROGRAMS_PATH);

  const program = domains.program.createProgram(name);

  await repositories.program.saveProgramToPath(
    program,
    `${env.vars.PTAH_PROGRAMS_PATH}/${name}.json`,
  );

  return program;
};

export const handleProgramSave = async (
  name: models.ProgramName,
  program: models.Program,
): Promise<models.Program> => {
  await repositories.file.checkPathAndInitialize(env.vars.PTAH_PROGRAMS_PATH);

  await repositories.program.saveProgramToPath(
    program,
    `${env.vars.PTAH_PROGRAMS_PATH}/${name}.json`,
  );

  return program;
};

export const handleProgramGet = async (
  name: models.ProgramName,
): Promise<models.Program> => {
  await repositories.file.checkPathAndInitialize(env.vars.PTAH_PROGRAMS_PATH);

  return repositories.program.loadProgramFromPath(
    `${env.vars.PTAH_PROGRAMS_PATH}/${name}.json`,
  );
};

export const handleProgramDelete = async (
  name: models.ProgramName,
): Promise<void> => {
  await repositories.file.checkPathAndInitialize(env.vars.PTAH_PROGRAMS_PATH);

  return repositories.program.deleteProgramFromPath(
    `${env.vars.PTAH_PROGRAMS_PATH}/${name}.json`,
  );
};
