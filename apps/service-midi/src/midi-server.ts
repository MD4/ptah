import { log } from "@ptah-app/lib-logger";
import type { MidiStatus } from "@ptah-app/lib-models";
import { services } from "@ptah-app/lib-shared";
import { debounce } from "@ptah-app/lib-utils";
import type { MidiCallback } from "midi";
import { Input } from "midi";

const LOG_CONTEXT = `${process.env.SERVICE_MIDI_NAME ?? ""}:midi`;

const input = new Input();

let status: MidiStatus = "inactive";

const changeStatus = (newStatus: MidiStatus): void => {
  status = newStatus;
  notifyStatus();
};

export const notifyStatus = (): void => {
  services.pubsub.send("system", { type: `midi:status:${status}` });
};

const leadingDebouncedChangeState = debounce(changeStatus, 5000, true);
const trailingDebouncedChangeState = debounce(changeStatus, 5000);

const onMessageReceived: MidiCallback = () => {
  leadingDebouncedChangeState("active");
  trailingDebouncedChangeState("idle");
};

export const start = (
  midiMessageCallback: MidiCallback,
  midiVirtualPortName: string,
): void => {
  log(LOG_CONTEXT, "creating virtual port..");

  changeStatus("inactive");

  input.ignoreTypes(true, false, true);
  input.openVirtualPort(midiVirtualPortName);
  input.on("message", midiMessageCallback);
  input.on("message", onMessageReceived);

  log(LOG_CONTEXT, "virtual port ready");
};

export const stop = (): void => {
  input.closePort();
};
