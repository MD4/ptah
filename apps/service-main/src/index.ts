import "dotenv/config";
import { log, logError } from "@ptah/lib-logger";
import { services } from "@ptah/lib-shared";

import { handleMessage } from "./handlers/message-handlers";
import * as dmx from "./services/dmx.service";
import * as showService from "./services/show.service";

const kill = (gracefully: boolean): void => {
  log(process.env.SERVICE_MAIN_NAME, "killing...");
  services.pubsub.disconnect();
  log(process.env.SERVICE_MAIN_NAME, "killed.");
  process.exitCode = gracefully ? 0 : 1;
  process.exit();
};

const killVoid = (gracefully: boolean) => (): void => {
  kill(gracefully);
};

const main = async (): Promise<void> => {
  log(process.env.SERVICE_MAIN_NAME, "starting..");
  process.on("SIGINT", killVoid(true));
  process.on("SIGTERM", killVoid(true));
  // process.on("SIGKILL", killVoid(false));

  void services.pubsub.connect(
    ["midi", "system"],
    (channel, message) => void handleMessage(channel, message),
  );

  const restoredShow = await showService.restoreShow();

  if (restoredShow) {
    log(process.env.SERVICE_MAIN_NAME, "show restored:", restoredShow.name);
  }

  await dmx.initialize();

  log(process.env.SERVICE_MAIN_NAME, "service is running");
};

main().catch((error: unknown) => {
  logError(process.env.SERVICE_MAIN_NAME, error);
  kill(false);
});
