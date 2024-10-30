export interface SystemState {
  connected: boolean;
  dmxStatus: "connected" | "disconnected" | "connecting";
  keysPressed: number[];
}

interface SystemActionUpdateStatus {
  type: "update-status";
  payload: {
    connected: boolean;
  };
}

interface SystemActionUpdateDmxStatus {
  type: "update-dmx-status";
  payload: {
    dmxStatus: SystemState["dmxStatus"];
  };
}

interface SystemActionUpdateKeyState {
  type: "update-key-state";
  payload: {
    key: number;
    pressed: boolean;
  };
}

export type SystemAction =
  | SystemActionUpdateStatus
  | SystemActionUpdateDmxStatus
  | SystemActionUpdateKeyState;
