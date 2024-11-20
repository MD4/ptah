import {
	DmxStatus,
	MidiStatus,
	PubsubMessage,
	ShowName,
} from "@ptah/lib-models";
import React from "react";
import { io, Socket } from "socket.io-client";

export type SystemState = {
	connected: boolean;
	dmxStatus: DmxStatus;
	midiStatus: MidiStatus;
	tempo: number;
	activeProgramsIds: number[];
	showStatus: "running" | "stopped";
};

export type SystemApi = {
	loadShow: (showName: ShowName) => void;
	unloadShow: () => void;
};

let _socket: Socket;

const getSocket = (
	onConnect: () => void,
	onDisconnect: () => void,
	onMessage: (channelId: string, message: PubsubMessage) => void,
): Socket => {
	if (!_socket) {
		_socket = io("ws://0.0.0.0:5002")
			.on("connect", async () => {
				_socket
					.emit("system", { type: "dmx:status:get" })
					.emit("system", { type: "midi:status:get" });
			})
			.on("connect", onConnect)
			.on("disconnect", onDisconnect)
			.onAny(onMessage);
	}

	return _socket;
};

export const kill = (): void => {
	_socket.emit("system", { type: "show:unload" });
	_socket.disconnect();
	console.clear();
	process.exit();
};

const initialSystemState: SystemState = {
	connected: false,
	dmxStatus: "disconnected",
	midiStatus: "inactive",
	tempo: 0,
	activeProgramsIds: [],
	showStatus: "stopped",
};

const SystemStateContext = React.createContext<SystemState>(initialSystemState);
const SystemApiContext = React.createContext<SystemApi>({
	loadShow: () => {},
	unloadShow: () => {},
});

process.on("SIGINT", kill);
process.on("SIGTERM", kill);

export function SystemProvider({
	children,
}: {
	children: React.ReactNode;
}): JSX.Element {
	const [state, setState] = React.useState(initialSystemState);

	const handleConnect = React.useCallback(
		() =>
			setState((state) => ({
				...state,
				connected: true,
			})),
		[setState],
	);

	const handleDisconnect = React.useCallback(
		() =>
			setState((state) => ({
				...state,
				connected: false,
			})),
		[setState],
	);

	const handleMessage = React.useCallback(
		(_: string, message: PubsubMessage) => {
			switch (message.type) {
				case "program:started":
					setState((state) => ({
						...state,
						activeProgramsIds: [...state.activeProgramsIds, message.id],
					}));
					break;
				case "program:stopped":
					setState((state) => ({
						...state,
						activeProgramsIds: state.activeProgramsIds.filter(
							(id) => id !== message.id,
						),
					}));
					break;
				case "sequence:continue":
				case "sequence:start":
				case "sequence:stop":
					setState((state) => ({
						...state,
						tempo: 0,
						activeProgramsIds: [],
						showStatus:
							message.type === "sequence:stop" ? "stopped" : "running",
					}));
					break;
				case "tempo:change":
					setState((state) => ({
						...state,
						tempo: message.tempo,
					}));
					break;
				case "dmx:status:connected":
					setState((state) => ({
						...state,
						dmxStatus: "connected",
					}));
					break;
				case "dmx:status:connecting":
					setState((state) => ({
						...state,
						dmxStatus: "connecting",
					}));
					break;
				case "dmx:status:disconnected":
					setState((state) => ({
						...state,
						dmxStatus: "disconnected",
					}));
					break;
				case "midi:status:active":
					setState((state) => ({
						...state,
						midiStatus: "active",
						showStatus: "running",
					}));
					break;
				case "midi:status:inactive":
					setState((state) => ({
						...state,
						tempo: 0,
						midiStatus: "inactive",
						showStatus: "stopped",
					}));
					break;
				case "midi:status:idle":
					setState((state) => ({
						...state,
						tempo: 0,
						midiStatus: "idle",
						showStatus: "stopped",
					}));
					break;
			}
		},
		[setState],
	);

	const socket = React.useMemo(
		() => getSocket(handleConnect, handleDisconnect, handleMessage),
		[getSocket, handleConnect, handleDisconnect, handleMessage],
	);

	const loadShow = React.useCallback(
		(showName: ShowName) =>
			socket.emit("system", { type: "show:load", showName }),
		[socket],
	);

	const unloadShow = React.useCallback(
		() => socket.emit("system", { type: "show:unload" }),
		[socket],
	);

	const api: SystemApi = React.useMemo(
		() => ({ loadShow, unloadShow }),
		[loadShow, unloadShow],
	);

	return (
		<SystemStateContext.Provider value={state}>
			<SystemApiContext.Provider value={api}>
				{children}
			</SystemApiContext.Provider>
		</SystemStateContext.Provider>
	);
}

export const useSystemState = (): SystemState =>
	React.useContext(SystemStateContext);

export const useSystemApi = (): SystemApi => React.useContext(SystemApiContext);
