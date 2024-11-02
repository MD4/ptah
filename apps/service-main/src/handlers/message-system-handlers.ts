import { log } from "@ptah/lib-logger";
import type { PubsubMessage, ShowName } from "@ptah/lib-models";
import { repositories, env, services } from "@ptah/lib-shared";

import * as patchService from "../services/patch.service";
import * as runner from "../services/runner.service";
import * as dmx from "../utils/dmx";

const LOG_CONTEXT = `${process.env.SERVICE_NAME ?? ""}:system`;

export const handleShowLoad = async (showName: ShowName): Promise<void> => {
  log(LOG_CONTEXT, "show:load", showName);

  try {
    const show = await repositories.show.loadShowFromPath(
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

    services.pubsub.send("system", { type: "show:load:success", showName });

    log(LOG_CONTEXT, "show:load:success", showName);
  } catch (error) {
    services.pubsub.send("system", {
      type: "show:load:error",
      showName,
    });

    log(LOG_CONTEXT, "show:load:error", showName, error);
  }
};

export const handleShowUnload = (): void => {
  log(LOG_CONTEXT, "show:unload");

  patchService.reset();
  runner.reset();
  dmx.reset();

  log(LOG_CONTEXT, "show:unload:success");
};

export const handleBlackout = (): void => {
  log(LOG_CONTEXT, "blackout");

  dmx.reset();
};

export const handleSystemMessage = async (
  message: PubsubMessage,
): Promise<void> => {
  switch (message.type) {
    case "show:load":
      return handleShowLoad(message.showName);
    case "show:unload": {
      handleShowUnload();
      return;
    }
    case "blackout":
      handleBlackout();
      break;
    default:
  }
};
