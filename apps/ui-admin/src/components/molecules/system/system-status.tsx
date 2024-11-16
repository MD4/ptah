import { type DmxStatus, type MidiStatus } from "@ptah/lib-models";
import * as React from "react";

import { Badge, theme } from "antd";

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

export default function SystemStatus(): JSX.Element {
  const { token } = useToken();
  const { connected, dmxStatus, midiStatus } = useSystemState();

  const styles: Record<string, React.CSSProperties> = React.useMemo(
    () => ({
      systemStatus: {
        position: "fixed",
        left: token.sizeMD,
        bottom: token.sizeMD,
        display: "flex",
        flexDirection: "column",
        gap: token.sizeXS,
      },
    }),
    [token.sizeMD, token.sizeXS],
  );

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
        text={`MIDI: ${midiStatus}`}
      />
    </div>
  );
}
