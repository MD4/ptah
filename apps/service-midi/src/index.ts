import "dotenv/config";
import { log, logError } from "@ptah/lib-logger";
import { services } from "@ptah/lib-shared";
import * as midiServer from "./midi-server";
import { handleMidiCallback } from "./midi-handlers";

const kill = (gracefully = true): void => {
  log(process.env.SERVICE_NAME, "killing...");
  midiServer.stop();
  services.pubsub.disconnect();
  log(process.env.SERVICE_NAME, "killed.");
  process.exitCode = gracefully ? 0 : 1;
  process.exit();
};

const main = async (): Promise<void> => {
  log(process.env.SERVICE_NAME, "starting..");

  process.on("SIGINT", kill);
  process.on("SIGTERM", kill);

  await services.pubsub.connect();

  midiServer.start(handleMidiCallback);

  log(process.env.SERVICE_NAME, "service is running");
};

main().catch((err) => {
  logError(process.env.SERVICE_NAME, err);
  kill(false);
});
