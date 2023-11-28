import "dotenv/config";
import { log, logError } from "@ptah/lib-logger";
import * as server from "./server";

const kill = (gracefully = true): void => {
  log(process.env.SERVICE_NAME, "killing...");
  server.stop();
  log(process.env.SERVICE_NAME, "killed.");
  process.exitCode = gracefully ? 0 : 1;
  process.exit();
};

const main = async (): Promise<void> => {
  log(process.env.SERVICE_NAME, "starting..");

  process.on("SIGINT", kill);
  process.on("SIGTERM", kill);

  await server.start();

  log(process.env.SERVICE_NAME, "service is running");
};

main().catch((err) => {
  logError(process.env.SERVICE_NAME, err);
  kill(false);
});
