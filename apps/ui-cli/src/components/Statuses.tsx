import type { DmxStatus, MidiStatus } from "@ptah-app/lib-models";
import { Box, Text } from "ink";
import React from "react";

import { dmxStatusColor, midiStatusColor, theme } from "../theme.js";

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
            {" UI: connected"}
          </Text>
        ) : (
          <Text>
            <Text color={theme.colorWarning}>•</Text>
            {" UI: linking.."}
          </Text>
        )}
      </Text>
      <Text color={theme.colorPrimary}>|</Text>
      <Text>
        {dmxStatus === "connecting" ? (
          <Text color={theme.colorWarning}>•</Text>
        ) : (
          <Text color={dmxStatusColor[dmxStatus]}>•</Text>
        )}
        {` DMX: ${dmxStatus}${dmxStatus === "connecting" ? ".." : ""}`}
      </Text>
      <Text color={theme.colorPrimary}>|</Text>
      <Text>
        {midiStatus === "inactive" ? (
          <Text color={theme.colorWarning}>•</Text>
        ) : (
          <Text color={midiStatusColor[midiStatus]}>•</Text>
        )}
        {` MIDI: ${midiStatus}`}
      </Text>
      <div />
    </Box>
  );
}
