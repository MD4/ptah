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

  const [_, restoredShow] = await Promise.all([
    services.pubsub.connect(
      ["midi", "system"],
      (channel, message) => void handleMessage(channel, message),
    ),
    showService.restoreShow(),
  ]);

  if (restoredShow) {
    log(process.env.SERVICE_MAIN_NAME, "show restored:", restoredShow.name);
  }

  log(process.env.SERVICE_MAIN_NAME, "service is running");

  await dmx.initialize();
};

main().catch((error: unknown) => {
  logError(process.env.SERVICE_MAIN_NAME, error);
  kill(false);
});
