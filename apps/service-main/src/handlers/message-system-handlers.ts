import { log } from "@ptah-app/lib-logger";
import type { PubsubMessage, ShowName } from "@ptah-app/lib-models";
import { services } from "@ptah-app/lib-shared";

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

export const handleShowUnload = async (): Promise<void> => {
  log(LOG_CONTEXT, "show:unload");

  await showService.unloadShow();

  log(LOG_CONTEXT, "show:unload:success");
};

export const handleShowGet = (): void => {
  log(LOG_CONTEXT, "show:get");

  const showName = showService.getCurrentShow()?.name;

  services.pubsub.send("system", {
    type: "show:get:result",
    showName,
  });

  log(LOG_CONTEXT, "show:get:result", showName);
};

export const handleProgramSaveSuccess = async (
  programName: string,
): Promise<void> => {
  if (showService.containsProgram(programName)) {
    await showService.reloadShow();
  }
};

export const handleDmxBlackout = (): void => {
  log(LOG_CONTEXT, "blackout");

  dmx.reset();
};

export const handleDmxStatusGet = (): void => {
  dmx.notifyStatus();
};

export const handleDmxDebug = (enabled: boolean): void => {
  log(LOG_CONTEXT, "dmx:debug", enabled);
  dmx.setDebug(enabled);
};

export const handleSystemMessage = async (
  message: PubsubMessage,
): Promise<void> => {
  switch (message.type) {
    case "show:load":
      return handleShowLoad(message.showName);
    case "show:unload":
      return handleShowUnload();
    case "show:get": {
      handleShowGet();
      return;
    }
    case "program:save:success":
      return handleProgramSaveSuccess(message.programName);
    case "dmx:blackout":
      handleDmxBlackout();
      break;
    case "dmx:status:get":
      handleDmxStatusGet();
      break;
    case "dmx:debug":
      handleDmxDebug(message.enabled);
      break;
    default:
  }
};
