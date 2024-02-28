import * as React from "react";
import { useSocket, useSocketEvent } from "socket.io-react-hook";
import type {
  PubsubMessageMidi,
  PubsubMessageSystem,
  ShowName,
} from "@ptah/lib-models";
import type { SystemState, SystemAction } from "./system.domain.types";

const systemEditReducer = (
  state: SystemState,
  { type, payload }: SystemAction
): SystemState => {
  switch (type) {
    case "update-status":
      return { ...state, connected: payload.connected };
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

const initialSystemState: SystemState = {
  connected: false,
  keysPressed: [],
};

interface SystemApi {
  loadShow: (showName: ShowName) => void;
}

interface System {
  state: SystemState;
  api: SystemApi;
}

interface SocketMessages {
  midi: (message: PubsubMessageMidi) => void;
  system: (message: PubsubMessageSystem) => void;
}

export function useSystem(): System {
  const [state, dispatch] = React.useReducer(
    systemEditReducer,
    initialSystemState
  );

  const wsUrl = `ws://${String(
    import.meta.env.VITE_SERVICE_GATEWAY_WS_HOST
  )}:${Number(import.meta.env.VITE_SERVICE_GATEWAY_WS_PORT)}`;

  const { socket, connected } = useSocket<SocketMessages>(wsUrl);

  useSocketEvent(socket, "midi", {
    onMessage: (message) => {
      switch (message.type) {
        case "note:on":
          dispatch({
            type: "update-key-state",
            payload: {
              key: message.keyNumber,
              pressed: true,
            },
          });
          break;
        case "note:off":
          dispatch({
            type: "update-key-state",
            payload: {
              key: message.keyNumber,
              pressed: false,
            },
          });
          break;
        default:
      }
    },
  });

  React.useEffect(() => {
    dispatch({
      type: "update-status",
      payload: { connected },
    });
  }, [connected]);

  const loadShow = React.useCallback(
    (showName: ShowName) => {
      socket.emit("system", { type: "show:load", showName });
    },
    [socket]
  );

  const blackout = React.useCallback(() => {
    socket.emit("system", { type: "blackout" });
  }, [socket]);

  const api = React.useMemo(
    () => ({ loadShow, blackout }),
    [loadShow, blackout]
  );

  return React.useMemo(() => ({ state, api }), [state, api]);
}
