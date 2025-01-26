import * as React from "react";
import { Position } from "reactflow";

import { Flex, theme } from "antd";

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
}): JSX.Element {
  const { token } = useToken();
  const defaultNodeStyle = useDefaultNodeStyle();
  const styles = React.useMemo(
    (): Record<string, React.CSSProperties> => ({
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
    }),
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
