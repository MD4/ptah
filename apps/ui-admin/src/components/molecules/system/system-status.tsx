import { Badge, theme } from "antd";
import * as React from "react";
import { useSystem } from "../../../domain/system.domain";

const { useToken } = theme;

export default function SystemStatus(): JSX.Element {
  const { token } = useToken();
  const system = useSystem();

  const styles: Record<string, React.CSSProperties> = React.useMemo(
    () => ({
      systemStatus: {
        position: "fixed",
        left: token.sizeMD,
        bottom: token.sizeMD,
      },
    }),
    [token.sizeMD]
  );

  return (
    <div style={styles.systemStatus}>
      <Badge
        status={system.state.connected ? "processing" : "warning"}
        text={system.state.connected ? "Linked" : "Linking.."}
      />
    </div>
  );
}
