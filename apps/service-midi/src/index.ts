import "dotenv/config";
import { log, logError } from "@ptah/lib-logger";
import { services } from "@ptah/lib-shared";

import { handleMessage } from "./handlers/message-handlers";
import { handleMidiCallback } from "./midi-handlers";
import * as midiServer from "./midi-server";

const kill = (gracefully: boolean): void => {
  log(process.env.SERVICE_MIDI_NAME, "killing...");
  midiServer.stop();
  services.pubsub.disconnect();
  log(process.env.SERVICE_MIDI_NAME, "killed.");
  process.exitCode = gracefully ? 0 : 1;
  process.exit();
};

const killVoid = (gracefully: boolean) => (): void => {
  kill(gracefully);
};

const main = async (): Promise<void> => {
  log(process.env.SERVICE_MIDI_NAME, "starting..");

  process.on("SIGINT", killVoid(true));
  process.on("SIGTERM", killVoid(true));
  // process.on("SIGKILL", killVoid(false));

  const { midiChannel, midiVirtualPortName } =
    await services.settings.loadSettingsOrInitialize();

  void services.pubsub.connect(["system"], (channel, message) =>
    handleMessage(channel, message),
  );

  midiServer.start(handleMidiCallback(midiChannel), midiVirtualPortName);

  log(process.env.SERVICE_MIDI_NAME, "service is running");
};

main().catch((err: unknown) => {
  logError(process.env.SERVICE_MIDI_NAME, err);
  kill(false);
});
