import { services } from "@ptah-app/lib-shared";
import type { MidiCallback } from "midi";

import {
  MIDI_STATUS_CHANNEL_CONTROL_CHANGE,
  MIDI_STATUS_CHANNEL_NOTE_OFF,
  MIDI_STATUS_CHANNEL_NOTE_ON,
  MIDI_STATUS_SYSTEM_CONTINUE_SEQUENCE,
  MIDI_STATUS_SYSTEM_START_SEQUENCE,
  MIDI_STATUS_SYSTEM_STOP_SEQUENCE,
  MIDI_STATUS_SYSTEM_TIMING_CLOCK,
} from "./constants";

let timeout: NodeJS.Timeout;
let tempo = 120;

const updateTempo = (newTempo: number): void => {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    services.pubsub.send("midi", { type: "tempo:change", tempo });
    tempo = newTempo;
  }, 100);
};

const handleMidiStatusSystemStartSequence = (): void => {
  services.pubsub.send("midi", { type: "sequence:start" });
};

const handleMidiStatusSystemContinueSequence = (): void => {
  services.pubsub.send("midi", { type: "sequence:continue" });
};

const handleMidiStatusSystemStopSequence = (): void => {
  services.pubsub.send("midi", { type: "sequence:stop" });
};

const handleMidiStatusSystemTimingClock = (deltaTime: number): void => {
  services.pubsub.send("midi", { type: "clock:tick", deltaTime });

  const newTempo = Math.round((1 / deltaTime / 24) * 60);

  if (tempo !== newTempo) {
    updateTempo(newTempo);
  }

  tempo = newTempo;
};

const handleMidiStatusChannelNoteOn = (
  keyNumber: number,
  velocity: number,
): void => {
  services.pubsub.send("midi", { type: "note:on", keyNumber, velocity });
};

const handleMidiStatusChannelNoteOff = (
  keyNumber: number,
  velocity: number,
): void => {
  services.pubsub.send("midi", { type: "note:off", keyNumber, velocity });
};

const handleMidiStatusChannelControlChange = (
  controlId: number,
  value: number,
): void => {
  if (controlId <= 13) {
    services.pubsub.send("midi", { type: "control:change", controlId, value });
  }
};

export const handleMidiCallback: (midiChannel: number) => MidiCallback =
  (midiChannel: number) => (deltaTime, message) => {
    const [status, data1, data2] = message;

    switch (status) {
      case MIDI_STATUS_SYSTEM_START_SEQUENCE:
        handleMidiStatusSystemStartSequence();
        break;
      case MIDI_STATUS_SYSTEM_CONTINUE_SEQUENCE:
        handleMidiStatusSystemContinueSequence();
        break;
      case MIDI_STATUS_SYSTEM_STOP_SEQUENCE:
        handleMidiStatusSystemStopSequence();
        break;
      case MIDI_STATUS_SYSTEM_TIMING_CLOCK:
        handleMidiStatusSystemTimingClock(deltaTime);
        break;
      case MIDI_STATUS_CHANNEL_NOTE_ON + (midiChannel - 1):
        handleMidiStatusChannelNoteOn(data1, data2);
        break;
      case MIDI_STATUS_CHANNEL_NOTE_OFF + (midiChannel - 1):
        handleMidiStatusChannelNoteOff(data1, data2);
        break;
      case MIDI_STATUS_CHANNEL_CONTROL_CHANGE + (midiChannel - 1):
        handleMidiStatusChannelControlChange(data1, data2);
        break;
    }
  };
