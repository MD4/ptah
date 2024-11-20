import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import React from "react";
import { theme, dmxStatusColor, midiStatusColor } from "../theme.js";
import { DmxStatus, MidiStatus } from "@ptah/lib-models";

export default function Statuses({
	connected,
	dmxStatus,
	midiStatus,
}: {
	connected: boolean;
	dmxStatus: DmxStatus;
	midiStatus: MidiStatus;
}) {
	return (
		<Box justifyContent="space-around" width="100%">
			<div />
			<Text>
				{connected ? (
					<Text>
						<Text color={theme.colorSuccess}>•</Text>
						{" UI: Connected"}
					</Text>
				) : (
					<Text>
						<Text color={theme.colorWarning}>
							<Spinner type="dots" />
						</Text>
						{" UI: Linking"}
					</Text>
				)}
			</Text>
			<Text color={theme.colorPrimary}>|</Text>
			<Text>
				{dmxStatus === "connecting" ? (
					<Text color={theme.colorWarning}>
						<Spinner type="dots" />
					</Text>
				) : (
					<Text color={dmxStatusColor[dmxStatus]}>•</Text>
				)}
				{` DMX: ${dmxStatus}`}
			</Text>
			<Text color={theme.colorPrimary}>|</Text>
			<Text>
				{midiStatus === "inactive" ? (
					<Text color={theme.colorWarning}>
						<Spinner type="dots" />
					</Text>
				) : (
					<Text color={midiStatusColor[midiStatus]}>•</Text>
				)}
				{` MIDI: ${midiStatus}`}
			</Text>
			<div />
		</Box>
	);
}
