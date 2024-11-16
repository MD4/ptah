import { type Show, type ShowName } from "@ptah/lib-models";
import { env, repositories } from "@ptah/lib-shared";

import * as dmx from "./dmx.service";
import * as patchService from "./patch.service";
import * as runner from "./runner.service";

let show: Show | undefined;

export const loadShow = async (showName: ShowName): Promise<Show> => {
  show = await repositories.show.loadShowFromPath(
    `${env.vars.PTAH_SHOWS_PATH}/${showName}.json`,
  );

  const programs = await Promise.all(
    Object.values(show.programs).map((programName) =>
      repositories.program.loadProgramFromPath(
        `${env.vars.PTAH_PROGRAMS_PATH}/${programName}.json`,
      ),
    ),
  );

  patchService.loadMapping(show, programs);
  runner.reset();
  dmx.reset();

  return show;
};

export const reloadShow = async (): Promise<Show | undefined> => {
  if (show) {
    return loadShow(show.name);
  }
};

export const unloadShow = (): void => {
  patchService.reset();
  runner.reset();
  dmx.reset();

  show = undefined;
};

export const containsProgram = (programName: string): boolean => {
  if (!show) {
    return false;
  }

  return Object.values(show.programs).includes(programName);
};
