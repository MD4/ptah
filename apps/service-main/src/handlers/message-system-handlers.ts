import { log } from "@ptah/lib-logger";
import type { PubsubMessage, ShowName } from "@ptah/lib-models";
import { services } from "@ptah/lib-shared";

import * as dmx from "../services/dmx.service";
import * as showService from "../services/show.service";

const LOG_CONTEXT = `${process.env.SERVICE_MAIN_NAME ?? ""}:system`;

export const handleShowLoad = async (showName: ShowName): Promise<void> => {
  log(LOG_CONTEXT, "show:load", showName);

  try {
    await showService.loadShow(showName);

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

  showService.unloadShow();

  log(LOG_CONTEXT, "show:unload:success");
};

export const handleProgramSaveSuccess = async (
  programName: string,
): Promise<void> => {
  if (showService.containsProgram(programName)) {
    const show = await showService.reloadShow();

    if (show) {
      services.pubsub.send("system", {
        type: "show:reload",
        showName: show.name,
      });
    }
  }
};

export const handleDmxBlackout = (): void => {
  log(LOG_CONTEXT, "blackout");

  dmx.reset();
};

export const handleDmxStatusGet = (): void => {
  dmx.notifyStatus();
};

export const handleSystemMessage = async (
  message: PubsubMessage,
): Promise<void> => {
  switch (message.type) {
    case "show:load":
      return handleShowLoad(message.showName);
    case "show:unload":
      handleShowUnload();
      return;
    case "program:save:success":
      return handleProgramSaveSuccess(message.programName);
    case "dmx:blackout":
      handleDmxBlackout();
      break;
    case "dmx:status:get":
      handleDmxStatusGet();
      break;
    default:
  }
};
