import type { DmxStatus, MidiStatus } from "@ptah-app/lib-models";
import { Badge, theme } from "antd";
import * as React from "react";

import { useSystemState } from "../../../domain/system.domain";

const { useToken } = theme;

const getDmxStatusColor = (
  status: DmxStatus,
): "processing" | "warning" | "error" | "success" | "default" => {
  switch (status) {
    case "connected":
      return "success";
    case "disconnected":
      return "error";
    case "connecting":
      return "processing";
    default:
      return "default";
  }
};

const getMidiStatusColor = (
  status: MidiStatus,
): "processing" | "warning" | "error" | "success" | "default" => {
  switch (status) {
    case "active":
      return "success";
    case "inactive":
      return "error";
    case "idle":
      return "processing";
    default:
      return "default";
  }
};

export default function SystemStatus() {
  const { token } = useToken();
  const { connected, dmxStatus, midiStatus, tempo } = useSystemState();

  const styles = React.useMemo(
    () =>
      ({
        systemStatus: {
          position: "fixed",
          left: token.sizeMD,
          bottom: token.sizeMD,
          display: "flex",
          flexDirection: "column",
          gap: token.sizeXS,
        },
      }) satisfies Record<string, React.CSSProperties>,
    [token.sizeMD, token.sizeXS],
  );

  const tempoString =
    tempo && midiStatus === "active" ? ` (${String(tempo)} BPM)` : "";

  return (
    <div style={styles.systemStatus}>
      <Badge
        className={connected ? "" : "animation-pulse"}
        status={connected ? "success" : "processing"}
        text={`UI: ${connected ? "linked" : "linking"}`}
      />
      <Badge
        className={dmxStatus === "connecting" ? "animation-pulse" : ""}
        status={getDmxStatusColor(dmxStatus)}
        text={`DMX: ${dmxStatus}`}
      />
      <Badge
        className={midiStatus === "idle" ? "animation-pulse" : ""}
        status={getMidiStatusColor(midiStatus)}
        text={`MIDI: ${midiStatus} ${tempoString}`}
      />
    </div>
  );
}
