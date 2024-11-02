export type SystemState = {
  connected: boolean;
  dmxStatus: "connected" | "disconnected" | "connecting";
  keysPressed: number[];
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
    dmxStatus: SystemState["dmxStatus"];
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
  | SystemActionUpdateKeyState;
