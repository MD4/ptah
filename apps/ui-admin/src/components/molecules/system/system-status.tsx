import { Badge, notification, theme } from "antd";
import * as React from "react";
import { useSystem } from "../../../domain/system.domain";
import { SystemState } from "../../../domain/system.domain.types";
import { PubsubMessage } from "@ptah/lib-models";
import { useDebounceCallback } from "usehooks-ts";

const { useToken } = theme;

const getDmxStatusColor = (
  status: SystemState["dmxStatus"]
): "processing" | "warning" | "error" | "success" | "default" => {
  switch (status) {
    case "connected":
      return "processing";
    case "disconnected":
      return "error";
    case "connecting":
      return "warning";
  }
};

export default function SystemStatus(): JSX.Element {
  const [{ error, success }, contextHolder] = notification.useNotification({
    placement: "bottomRight",
  });

  const onMessage = React.useCallback((message: PubsubMessage) => {
    switch (message.type) {
      case "show:load:success":
        success({
          message: message.showName,
          description: "Show successfully loaded",
        });
        break;
      case "show:load:error":
        error({
          message: message.showName,
          description: "Something went wrong",
        });
        break;
    }
  }, []);

  const onMessageDebounced = useDebounceCallback(onMessage, 100);

  const { token } = useToken();
  const system = useSystem(onMessageDebounced);

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
    [token.sizeMD]
  );

  return (
    <div style={styles.systemStatus}>
      {contextHolder}
      <Badge
        status={system.state.connected ? "processing" : "warning"}
        text={`UI: ${system.state.connected ? "linked" : "linking.."}`}
      />
      <Badge
        status={getDmxStatusColor(system.state.dmxStatus)}
        text={`DMX: ${system.state.dmxStatus}`}
      />
    </div>
  );
}
