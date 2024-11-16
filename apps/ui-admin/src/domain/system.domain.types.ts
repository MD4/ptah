import {
  type PubsubMessageSystem,
  type PubsubMessageMidi,
  type ShowName,
  type MidiStatus,
  type DmxStatus,
} from "@ptah/lib-models";

export type SystemState = {
  connected: boolean;
  dmxStatus: DmxStatus;
  midiStatus: MidiStatus;
  keysPressed: number[];
  tempo: number;
};

export type SystemApi = {
  loadShow: (showName: ShowName) => void;
  unloadShow: () => void;
  dmxBlackout: () => void;
  dmxGetStatus: () => void;
  midiGetStatus: () => void;
};

export type SocketMessages = {
  midi: (message: PubsubMessageMidi) => void;
  system: (message: PubsubMessageSystem) => void;
};

type SystemActionUpdateStatus = {
  type: "update-status";
  payload: {
    connected: boolean;
  };
};

type SystemActionUpdateDmxStatus = {
  type: "update-dmx-status";
  payload: {
    dmxStatus: DmxStatus;
  };
};

type SystemActionUpdateMidiStatus = {
  type: "update-midi-status";
  payload: {
    midiStatus: MidiStatus;
  };
};

type SystemActionUpdateMidiTempo = {
  type: "update-midi-tempo";
  payload: {
    tempo: number;
  };
};

type SystemActionUpdateKeyState = {
  type: "update-key-state";
  payload: {
    key: number;
    pressed: boolean;
  };
};

export type SystemAction =
  | SystemActionUpdateStatus
  | SystemActionUpdateDmxStatus
  | SystemActionUpdateMidiStatus
  | SystemActionUpdateMidiTempo
  | SystemActionUpdateKeyState;
