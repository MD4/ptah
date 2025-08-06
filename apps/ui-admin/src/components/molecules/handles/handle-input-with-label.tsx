import { Position } from "@xyflow/react";
import { Flex, theme } from "antd";
import * as React from "react";

import { useDefaultNodeStyle } from "../nodes/node.style";
import HandleInputWithLimit from "./handle-input-with-limit";

const { useToken } = theme;

export default function HandleInputWithLabel({
  id,
  label,
  isConnectable = Number.POSITIVE_INFINITY,
}: {
  id: number;
  label: string;
  isConnectable?: number;
}) {
  const { token } = useToken();
  const defaultNodeStyle = useDefaultNodeStyle();
  const styles = React.useMemo(
    () =>
      ({
        container: {
          minHeight: token.sizeLG,
        },
        handle: {
          ...defaultNodeStyle.handle,
          position: "initial",
          transform: "none",
          marginLeft: -20,
        },
        label: {
          flex: 1,
        },
      }) satisfies Record<string, React.CSSProperties>,
    [defaultNodeStyle.handle, token.sizeLG],
  );

  return (
    <Flex align="center" gap="middle" style={styles.container}>
      <HandleInputWithLimit
        id={String(id)}
        isConnectable={isConnectable}
        position={Position.Left}
        style={styles.handle}
        type="target"
      />

      <div style={styles.label}>{label}</div>
    </Flex>
  );
}
