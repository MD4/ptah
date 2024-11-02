import "dotenv/config";
import { log, logError } from "@ptah/lib-logger";
import { services } from "@ptah/lib-shared";

import { handleMessage } from "./handlers/message-handlers";
import * as dmx from "./utils/dmx";

const kill = (gracefully: boolean): void => {
  log(process.env.SERVICE_NAME, "killing...");
  services.pubsub.disconnect();
  log(process.env.SERVICE_NAME, "killed.");
  process.exitCode = gracefully ? 0 : 1;
  process.exit();
};

const killVoid = (gracefully: boolean) => (): void => {
  kill(gracefully);
};

const main = async (): Promise<void> => {
  log(process.env.SERVICE_NAME, "starting..");

  process.on("SIGINT", killVoid(true));
  process.on("SIGTERM", killVoid(true));
  process.on("SIGKILL", killVoid(false));

  await Promise.all([
    services.pubsub.connect(
      ["midi", "system"],
      (channel, message) => void handleMessage(channel, message),
    ),
    dmx.initialize(),
  ]);

  log(process.env.SERVICE_NAME, "service is running");
};

main().catch((error: unknown) => {
  logError(process.env.SERVICE_NAME, error);
  kill(false);
});
