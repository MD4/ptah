import { type SystemState, type SystemAction } from "./system.domain.types";

export const systemReducer = (
  state: SystemState,
  { type, payload }: SystemAction,
): SystemState => {
  switch (type) {
    case "update-status":
    case "update-dmx-status":
      return { ...state, ...payload };
    case "update-midi-status":
      return { ...state, ...payload };
    case "update-midi-tempo":
      return { ...state, ...payload };
    case "update-key-state":
      if (payload.pressed) {
        return {
          ...state,
          keysPressed: state.keysPressed.includes(payload.key)
            ? state.keysPressed
            : [...state.keysPressed, payload.key],
        };
      }

      return {
        ...state,
        keysPressed: state.keysPressed.filter((key) => key !== payload.key),
      };
    default:
      return state;
  }
};
