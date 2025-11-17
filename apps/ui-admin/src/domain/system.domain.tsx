import type { PubsubMessage, ShowName } from "@ptah-app/lib-models";
import { noop, sleep } from "@ptah-app/lib-utils";
import * as React from "react";
import { useSocket, useSocketEvent } from "socket.io-react-hook";

import { useProgramInvalidate } from "../repositories/program.repository";
import { systemReducer } from "./system.domain.reducer";
import type {
  SocketMessages,
  SystemApi,
  SystemState,
} from "./system.domain.types";

const initialSystemState: SystemState = {
  connected: false,
  dmxStatus: "disconnected",
  midiStatus: "inactive",
  keysPressed: [],
  tempo: 0,
};

const SystemStateContext = React.createContext<SystemState>(initialSystemState);
const SystemApiContext = React.createContext<SystemApi>({
  loadShow: noop,
  unloadShow: noop,
  dmxBlackout: noop,
  dmxGetStatus: noop,
  midiGetStatus: noop,
});

export function SystemProvider({
  children,
  onMessage = noop,
}: {
  onMessage: (message: PubsubMessage) => void;
  children: React.ReactNode;
}) {
  const [state, dispatch] = React.useReducer(systemReducer, initialSystemState);

  const wsUrl = `ws://${String(
    window.location.hostname,
  )}:${String(Number(import.meta.env.VITE_SERVICE_GATEWAY_WS_PORT))}`;

  const { socket, connected } = useSocket<SocketMessages>(wsUrl);
  const { lastMessage: systemMessage } = useSocketEvent(socket, "system");
  const { lastMessage: midiMessage } = useSocketEvent(socket, "midi");

  const invalidateProgram = useProgramInvalidate();

  React.useEffect(() => {
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

      case "tempo:change":
        dispatch({
          type: "update-midi-tempo",
          payload: { tempo: midiMessage.tempo },
        });
        break;

      default:
    }

    onMessage(midiMessage);
  }, [midiMessage, onMessage]);

  React.useEffect(() => {
    if (!systemMessage) {
      return;
    }

    switch (systemMessage.type) {
      case "dmx:status:connected":
        dispatch({
          type: "update-dmx-status",
          payload: { dmxStatus: "connected" },
        });
        break;
      case "dmx:status:connecting":
        dispatch({
          type: "update-dmx-status",
          payload: { dmxStatus: "connecting" },
        });
        break;
      case "dmx:status:disconnected":
        dispatch({
          type: "update-dmx-status",
          payload: { dmxStatus: "disconnected" },
        });
        break;

      case "midi:status:inactive":
        dispatch({
          type: "update-midi-status",
          payload: { midiStatus: "inactive" },
        });
        break;
      case "midi:status:active":
        dispatch({
          type: "update-midi-status",
          payload: { midiStatus: "active" },
        });
        break;
      case "midi:status:idle":
        dispatch({
          type: "update-midi-status",
          payload: { midiStatus: "idle" },
        });
        break;

      case "program:save:success":
        invalidateProgram(systemMessage.programName);
        break;

      default:
    }

    onMessage(systemMessage);
  }, [invalidateProgram, systemMessage, onMessage]);

  const loadShow = React.useCallback(
    (showName: ShowName) =>
      socket.emit("system", { type: "show:load", showName }),
    [socket],
  );

  const unloadShow = React.useCallback(
    () => socket.emit("system", { type: "show:unload" }),
    [socket],
  );

  const dmxBlackout = React.useCallback(
    () => socket.emit("system", { type: "dmx:blackout" }),
    [socket],
  );

  const dmxGetStatus = React.useCallback(
    () => socket.emit("system", { type: "dmx:status:get" }),
    [socket],
  );

  const midiGetStatus = React.useCallback(
    () => socket.emit("system", { type: "midi:status:get" }),
    [socket],
  );

  const api = React.useMemo(
    () => ({
      loadShow,
      unloadShow,
      dmxBlackout,
      dmxGetStatus,
      midiGetStatus,
    }),
    [loadShow, unloadShow, dmxBlackout, dmxGetStatus, midiGetStatus],
  );

  const onConnected = React.useCallback(async () => {
    dispatch({
      type: "update-status",
      payload: { connected },
    });

    await sleep(100);

    dmxGetStatus();
    midiGetStatus();
  }, [connected, dmxGetStatus, midiGetStatus]);

  React.useEffect(() => void onConnected(), [onConnected]);

  return (
    <SystemStateContext.Provider value={state}>
      <SystemApiContext.Provider value={api}>
        {children}
      </SystemApiContext.Provider>
    </SystemStateContext.Provider>
  );
}

export function useSystemState(): SystemState {
  return React.useContext(SystemStateContext);
}

export function useSystemApi(): SystemApi {
  return React.useContext(SystemApiContext);
}
