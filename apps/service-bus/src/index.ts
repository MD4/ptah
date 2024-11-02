import "dotenv/config";
import { log, logError } from "@ptah/lib-logger";

import * as server from "./server";

const kill = (gracefully: boolean): void => {
  log(process.env.SERVICE_NAME, "killing...");
  server.stop();
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

  await server.start();

  log(process.env.SERVICE_NAME, "service is running");
};

main().catch((error: unknown) => {
  logError(process.env.SERVICE_NAME, error);
  kill(false);
});
