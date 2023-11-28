import "dotenv/config";
import { log, logError } from "@ptah/lib-logger";
import { services } from "@ptah/lib-shared";
import { handleMessage } from "./message-handlers";
import * as dmx from "./dmx";
import { loadMapping } from "./patch.api";

const kill = (gracefully = true): void => {
  log(process.env.SERVICE_NAME, "killing...");
  services.pubsub.disconnect();
  log(process.env.SERVICE_NAME, "killed.");
  process.exitCode = gracefully ? 0 : 1;
  process.exit();
};

const main = async (): Promise<void> => {
  log(process.env.SERVICE_NAME, "starting..");

  process.on("SIGINT", kill);
  process.on("SIGTERM", kill);

  loadMapping();

  await Promise.all([
    services.pubsub.connect(["midi"], handleMessage),
    dmx.initialize(),
  ]);

  log(process.env.SERVICE_NAME, "service is running");
};

main().catch((err) => {
  logError(process.env.SERVICE_NAME, err);
  kill(false);
});
