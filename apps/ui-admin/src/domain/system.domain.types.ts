export interface SystemState {
  connected: boolean;
  keysPressed: number[];
}

interface SystemActionUpdateStatus {
  type: "update-status";
  payload: {
    connected: boolean;
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
  | SystemActionUpdateKeyState;
