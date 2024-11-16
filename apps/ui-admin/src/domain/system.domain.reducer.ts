import { type SystemState, type SystemAction } from "./system.domain.types";

export const systemReducer = (
  state: SystemState,
  action: SystemAction,
): SystemState => {
  switch (action.type) {
    case "update-status": {
      const { connected } = action.payload;

      return { ...state, connected };
    }
    case "update-dmx-status": {
      const { dmxStatus } = action.payload;

      return { ...state, dmxStatus };
    }
    case "update-midi-status": {
      const { midiStatus } = action.payload;

      return { ...state, midiStatus };
    }
    case "update-midi-tempo": {
      const { tempo } = action.payload;

      return { ...state, tempo };
    }
    case "update-key-state": {
      const { key, pressed } = action.payload;

      if (pressed) {
        return {
          ...state,
          keysPressed: state.keysPressed.includes(key)
            ? state.keysPressed
            : [...state.keysPressed, key],
        };
      }

      return {
        ...state,
        keysPressed: state.keysPressed.filter(
          (keyPressed) => keyPressed !== key,
        ),
      };
    }
    default:
      return state;
  }
};
