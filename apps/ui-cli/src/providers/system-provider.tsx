import type {
  DmxStatus,
  MidiStatus,
  PubsubMessage,
  ShowName,
  SocketPubsubMessage,
} from "@ptah/lib-models";
import { noop, sleep } from "@ptah/lib-utils";
import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { type Socket, io } from "socket.io-client";

export type SystemState = {
  connected: boolean;
  dmxStatus: DmxStatus;
  midiStatus: MidiStatus;
  showStatus: "loading" | "running" | "stopped";
  tempo: number;
  activeProgramsIds: number[];
  dmxDebugOutputs: number[];
  initialShowName?: ShowName;
};

export type SystemApi = {
  loadShow: (showName: ShowName) => void;
  unloadShow: () => void;
  setDmxDebug: (enabled: boolean) => void;
};

let _socket: Socket<SocketPubsubMessage, SocketPubsubMessage> | undefined;

const getSocket = (
  onConnect: () => void,
  onDisconnect: () => void,
  onMessage: (channelId: string, message: PubsubMessage) => void,
): Socket<SocketPubsubMessage, SocketPubsubMessage> => {
  if (!_socket) {
    _socket = io("ws://0.0.0.0:5002")
      .on("connect", () => {
        if (_socket) {
          _socket
            .emit("system", { type: "show:get" })
            .emit("system", { type: "dmx:status:get" })
            .emit("system", { type: "midi:status:get" });
        }
      })
      .on("connect", onConnect)
      .on("disconnect", onDisconnect)
      .onAny(onMessage);
  }

  return _socket;
};

export const kill = (): void => {
  if (_socket) {
    _socket.emit("system", { type: "show:unload" });
    _socket.disconnect();
  }

  console.clear();
  process.exit();
};

const initialSystemState: SystemState = {
  connected: false,
  dmxStatus: "disconnected",
  midiStatus: "inactive",
  showStatus: "loading",
  tempo: 0,
  activeProgramsIds: [],
  dmxDebugOutputs: Array<number>(512).fill(0),
};

const SystemStateContext = createContext<SystemState>(initialSystemState);
const SystemApiContext = createContext<SystemApi>({
  loadShow: noop,
  unloadShow: noop,
  setDmxDebug: noop,
});

process.on("SIGINT", kill);
process.on("SIGTERM", kill);

export function SystemProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, setState] = useState(initialSystemState);

  const handleConnect = useCallback(() => {
    setState((_state) => ({
      ..._state,
      connected: true,
    }));
  }, []);

  const handleDisconnect = useCallback(() => {
    setState((_state) => ({
      ..._state,
      connected: false,
    }));
  }, []);

  const handleMessage = useCallback(
    (_: string, message: PubsubMessage) => {
      switch (message.type) {
        case "program:started":
          setState((_state) => ({
            ..._state,
            activeProgramsIds: [...state.activeProgramsIds, message.id],
            showStatus: "running",
          }));
          break;
        case "program:stopped":
          setState((_state) => ({
            ..._state,
            activeProgramsIds: state.activeProgramsIds.filter(
              (id) => id !== message.id,
            ),
            showStatus: "running",
          }));
          break;
        case "sequence:continue":
        case "sequence:start":
        case "sequence:stop":
          setState((_state) => ({
            ..._state,
            tempo: 0,
            activeProgramsIds: [],
            showStatus:
              message.type === "sequence:stop" ? "stopped" : "running",
          }));
          break;
        case "tempo:change":
          setState((_state) => ({
            ..._state,
            tempo: message.tempo,
          }));
          break;
        case "dmx:status:connected":
          setState((_state) => ({
            ..._state,
            dmxStatus: "connected",
          }));
          break;
        case "dmx:status:connecting":
          setState((_state) => ({
            ..._state,
            dmxStatus: "connecting",
          }));
          break;
        case "dmx:status:disconnected":
          setState((_state) => ({
            ..._state,
            dmxStatus: "disconnected",
          }));
          break;
        case "midi:status:active":
          setState((_state) => ({
            ..._state,
            midiStatus: "active",
          }));
          break;
        case "midi:status:inactive":
          setState((_state) => ({
            ..._state,
            tempo: 0,
            midiStatus: "inactive",
            showStatus: "stopped",
          }));
          break;
        case "midi:status:idle":
          setState((_state) => ({
            ..._state,
            tempo: 0,
            midiStatus: "idle",
            showStatus: "stopped",
          }));
          break;
        case "dmx:debug:data":
          setState((_state) => ({
            ..._state,
            dmxDebugOutputs: message.data,
          }));
          break;
        case "show:load:success":
          setState((_state) => ({
            ..._state,
            showStatus: "stopped",
          }));
          break;
        case "show:get:result":
          setState((_state) => ({
            ..._state,
            initialShowName: message.showName,
          }));
          break;
        default:
          break;
      }
    },
    [state.activeProgramsIds],
  );

  const socket = useMemo(
    () => getSocket(handleConnect, handleDisconnect, handleMessage),
    [handleConnect, handleDisconnect, handleMessage],
  );

  const loadShow = useCallback(
    async (showName: ShowName) => {
      setState((_state) => ({
        ..._state,
        showStatus: "loading",
      }));
      await sleep(500);
      socket.emit("system", { type: "show:load", showName });
    },
    [socket],
  );

  const unloadShow = useCallback(
    () => socket.emit("system", { type: "show:unload" }),
    [socket],
  );

  const setDmxDebug = useCallback(
    (enabled: boolean) => socket.emit("system", { type: "dmx:debug", enabled }),
    [socket],
  );

  const api: SystemApi = useMemo(
    () => ({ loadShow, unloadShow, setDmxDebug }),
    [loadShow, unloadShow, setDmxDebug],
  );

  return (
    <SystemStateContext.Provider value={state}>
      <SystemApiContext.Provider value={api}>
        {children}
      </SystemApiContext.Provider>
    </SystemStateContext.Provider>
  );
}

export const useSystemState = (): SystemState => useContext(SystemStateContext);

export const useSystemApi = (): SystemApi => useContext(SystemApiContext);
