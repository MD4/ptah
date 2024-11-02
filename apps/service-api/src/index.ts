import "dotenv/config";

import { log, logError } from "@ptah/lib-logger";
import { services } from "@ptah/lib-shared";

import { createServer, killServer } from "./services/server.service";

const kill = async (gracefully: boolean): Promise<void> => {
  log(process.env.SERVICE_NAME, "killing...");
  if (gracefully) {
    await killServer();
  } else {
    void killServer();
  }
  log(process.env.SERVICE_NAME, "killed.");
  process.exitCode = gracefully ? 0 : 1;
  process.exit();
};

const killVoid = (gracefully: boolean) => (): void => void kill(gracefully);

const main = async (): Promise<void> => {
  log(process.env.SERVICE_NAME, "starting..");

  process.on("SIGINT", killVoid(true));
  process.on("SIGTERM", killVoid(true));
  process.on("SIGKILL", killVoid(false));

  await services.settings.loadSettingsOrInitialize();
  await createServer();

  log(process.env.SERVICE_NAME, "service is running");
};

main().catch((error: unknown) => {
  logError(process.env.SERVICE_NAME, error);
  return kill(false);
});
