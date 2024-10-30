import "dotenv/config";
import { log, logError } from "@ptah/lib-logger";
import { services } from "@ptah/lib-shared";
import { createServer, killServer } from "./services/server.service";

const kill = (gracefully = true): void => {
  log(process.env.SERVICE_NAME, "killing...");
  killServer();
  log(process.env.SERVICE_NAME, "killed.");
  process.exitCode = gracefully ? 0 : 1;
  process.exit();
};

const main = async (): Promise<void> => {
  log(process.env.SERVICE_NAME, "starting..");

  process.on("SIGINT", kill);
  process.on("SIGTERM", kill);

  await services.settings.loadSettingsOrInitialize();
  await createServer();

  log(process.env.SERVICE_NAME, "service is running");
};

main().catch((err) => {
  logError(process.env.SERVICE_NAME, err);
  kill(false);
});
