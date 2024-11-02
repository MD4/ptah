import { log } from "@ptah/lib-logger";
import type { PubsubMessage } from "@ptah/lib-models";
import * as runner from "../services/runner.service";
import * as dmx from "../utils/dmx";

const LOG_CONTEXT = `${process.env.SERVICE_NAME ?? ""}:midi`;

export const handleNoteOn = (keyNumber: number, velocity: number): void => {
  runner.startProgram(keyNumber, velocity);
  log(LOG_CONTEXT, "note:on", keyNumber, velocity);
};

export const handleNoteOff = (keyNumber: number, velocity: number): void => {
  runner.stopProgram(keyNumber);
  log(LOG_CONTEXT, "note:off", keyNumber, velocity);
};

export const handleSequenceStart = (): void => {
  runner.reset();
  dmx.reset();
  log(LOG_CONTEXT, "sequence:start");
};

export const handleSequenceContinue = (): void => {
  runner.reset();
  dmx.reset();
  log(LOG_CONTEXT, "sequence:continue");
};

export const handleSequenceStop = (): void => {
  runner.reset();
  log(LOG_CONTEXT, "sequence:stop");
};

export const handleTempoChange = (tempo: number): void => {
  log(LOG_CONTEXT, "tempo:change", tempo);
};

export const handleClockTick = (): void => {
  dmx.update(runner.tick());
};

export const handleControlChange = (controlId: number, value: number): void => {
  runner.setControlValue(controlId, value);
};

export const handleMidiMessage = (message: PubsubMessage): void => {
  switch (message.type) {
    case "note:on":
      handleNoteOn(message.keyNumber, message.velocity);
      break;
    case "note:off":
      handleNoteOff(message.keyNumber, message.velocity);
      break;
    case "sequence:start":
      handleSequenceStart();
      break;
    case "sequence:continue":
      handleSequenceContinue();
      break;
    case "sequence:stop":
      handleSequenceStop();
      break;
    case "tempo:change":
      handleTempoChange(message.tempo);
      break;
    case "clock:tick":
      handleClockTick();
      break;
    case "control:change":
      handleControlChange(message.controlId, message.value);
      break;
    default:
  }
};
