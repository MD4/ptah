import { log } from "@ptah/lib-logger";
import type { Show, ShowName } from "@ptah/lib-models";
import { env, repositories, services } from "@ptah/lib-shared";
import * as dmx from "./dmx.service";
import * as patchService from "./patch.service";
import * as runner from "./runner.service";

let show: Show | undefined;

export const getCurrentShow = (): Show | undefined => show;

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
  runner.reset(true);
  dmx.reset();

  await services.settings.setCurrentShow(showName);

  return show;
};

export const reloadShow = async (): Promise<Show | undefined> => {
  if (show) {
    return loadShow(show.name);
  }
};

export const unloadShow = async (): Promise<void> => {
  patchService.reset();
  runner.reset(true);
  dmx.reset();

  show = undefined;

  await services.settings.removeCurrentShow();
};

export const containsProgram = (programName: string): boolean => {
  if (!show) {
    return false;
  }

  return Object.values(show.programs).includes(programName);
};

export const restoreShow = async (): Promise<Show | undefined> => {
  const { currentShow } = await services.settings.loadSettingsOrInitialize();

  if (currentShow) {
    log(process.env.SERVICE_MAIN_NAME, `Restoring show "${currentShow}"...`);
    try {
      return await loadShow(currentShow);
    } catch (_) {
      log(
        process.env.SERVICE_MAIN_NAME,
        `Error restoring show "${currentShow}". It may have been deleted or moved.`,
      );

      await services.settings.removeCurrentShow();
    }
  }
};
