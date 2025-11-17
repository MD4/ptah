import "dotenv/config";

import { log, logError } from "@ptah-app/lib-logger";
import { services } from "@ptah-app/lib-shared";

import { createServer, killServer } from "./services/server.service";

const kill = async (gracefully: boolean): Promise<void> => {
  log(process.env.SERVICE_API_NAME, "killing...");
  services.pubsub.disconnect();
  if (gracefully) {
    await killServer();
  } else {
    void killServer();
  }
  log(process.env.SERVICE_API_NAME, "killed.");
  process.exitCode = gracefully ? 0 : 1;
  process.exit();
};

const killVoid = (gracefully: boolean) => (): void => void kill(gracefully);

const main = async (): Promise<void> => {
  log(process.env.SERVICE_API_NAME, "starting..");

  process.on("SIGINT", killVoid(true));
  process.on("SIGTERM", killVoid(true));
  // process.on("SIGKILL", killVoid(false));

  void services.pubsub.connect();

  await services.settings.loadSettingsOrInitialize();
  await createServer();

  log(process.env.SERVICE_API_NAME, "service is running");
};

main().catch((error: unknown) => {
  logError(process.env.SERVICE_API_NAME, error);
  return kill(false);
});
