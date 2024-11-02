import "dotenv/config";
import { log, logError } from "@ptah/lib-logger";
import { services } from "@ptah/lib-shared";
import * as midiServer from "./midi-server";
import { handleMidiCallback } from "./midi-handlers";

const kill = (gracefully: boolean): void => {
  log(process.env.SERVICE_NAME, "killing...");
  midiServer.stop();
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

  await services.pubsub.connect();

  midiServer.start(handleMidiCallback);

  log(process.env.SERVICE_NAME, "service is running");
};

main().catch((err: unknown) => {
  logError(process.env.SERVICE_NAME, err);
  kill(false);
});
