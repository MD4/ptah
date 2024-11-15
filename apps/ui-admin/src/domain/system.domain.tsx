import type {
  PubsubMessage,
  PubsubMessageMidi,
  PubsubMessageSystem,
  ShowName,
} from "@ptah/lib-models";
import * as React from "react";
import { useSocket, useSocketEvent } from "socket.io-react-hook";

import type { SystemState, SystemAction } from "./system.domain.types";
import { useProgramInvalidate } from "../repositories/program.repository";

const systemEditReducer = (
  state: SystemState,
  { type, payload }: SystemAction,
): SystemState => {
  switch (type) {
    case "update-status":
    case "update-dmx-status":
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

const initialSystemState: SystemState = {
  connected: false,
  dmxStatus: "disconnected",
  keysPressed: [],
};

type SystemApi = {
  loadShow: (showName: ShowName) => void;
  unloadShow: () => void;
};

type System = {
  state: SystemState;
  api: SystemApi;
};

type SocketMessages = {
  midi: (message: PubsubMessageMidi) => void;
  system: (message: PubsubMessageSystem) => void;
};

export function useSystem(
  onMessage: (message: PubsubMessage) => void = () => undefined,
): System {
  const [state, dispatch] = React.useReducer(
    systemEditReducer,
    initialSystemState,
  );

  const wsUrl = `ws://${String(
    import.meta.env.VITE_SERVICE_GATEWAY_WS_HOST,
  )}:${String(Number(import.meta.env.VITE_SERVICE_GATEWAY_WS_PORT))}`;

  const { socket, connected } = useSocket<SocketMessages>(wsUrl);
  const { lastMessage: systemMessage } = useSocketEvent(socket, "system");
  const { lastMessage: midiMessage } = useSocketEvent(socket, "midi");

  const invalidateProgram = useProgramInvalidate();

  React.useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- false positive
    if (!midiMessage) {
      return;
    }

    switch (midiMessage.type) {
      case "note:on":
        dispatch({
          type: "update-key-state",
          payload: {
            key: midiMessage.keyNumber,
            pressed: true,
          },
        });
        break;
      case "note:off":
        dispatch({
          type: "update-key-state",
          payload: {
            key: midiMessage.keyNumber,
            pressed: false,
          },
        });
        break;

      default:
    }

    onMessage(midiMessage);
  }, [invalidateProgram, midiMessage, onMessage]);

  React.useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- false positive
    if (!systemMessage) {
      return;
    }

    switch (systemMessage.type) {
      case "dmx:connected":
        dispatch({
          type: "update-dmx-status",
          payload: { dmxStatus: "connected" },
        });
        break;
      case "dmx:connecting":
        dispatch({
          type: "update-dmx-status",
          payload: { dmxStatus: "connecting" },
        });
        break;
      case "dmx:disconnected":
        dispatch({
          type: "update-dmx-status",
          payload: { dmxStatus: "disconnected" },
        });
        break;

      case "program:save:success":
        invalidateProgram(systemMessage.programName);
        break;

      default:
    }

    onMessage(systemMessage);
  }, [invalidateProgram, systemMessage, onMessage]);

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
    [socket],
  );

  const unloadShow = React.useCallback(() => {
    socket.emit("system", { type: "show:unload" });
  }, [socket]);

  const blackout = React.useCallback(() => {
    socket.emit("system", { type: "blackout" });
  }, [socket]);

  const api = React.useMemo(
    () => ({ loadShow, unloadShow, blackout }),
    [loadShow, unloadShow, blackout],
  );

  return React.useMemo(() => ({ state, api }), [state, api]);
}
