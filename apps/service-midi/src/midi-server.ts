import { log } from "@ptah/lib-logger";
import type { MidiCallback } from "midi";
import { Input } from "midi";

const LOG_CONTEXT = `${process.env.SERVICE_NAME}:midi`;

const input = new Input();

export const start = (midiMessageCallback: MidiCallback): void => {
  log(LOG_CONTEXT, "creating virtual port..");

  input.ignoreTypes(true, false, true);
  input.openVirtualPort("ptah");
  input.on("message", midiMessageCallback);

  log(LOG_CONTEXT, "virtual port ready");
};

export const stop = (): void => {
  input.closePort();
};
