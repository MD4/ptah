import { Flex, Space, Typography, theme } from "antd";
import * as React from "react";
import { Handle, Position } from "reactflow";

import { useDefaultNodeStyle } from "../nodes/node.style";

const { useToken } = theme;

export default function HandleOutputWithLabel({
  id,
  label,
  isConnectable = true,
}: {
  id: number;
  label: string;
  isConnectable?: boolean;
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
          marginRight: -20,
        },
        label: {
          flex: 1,
          textAlign: "right",
        },
      }) satisfies Record<string, React.CSSProperties>,
    [defaultNodeStyle.handle, token.sizeLG],
  );

  return (
    <Flex align="center" gap="middle" style={styles.container}>
      <div style={styles.label}>
        <Space>
          <span>{label}</span>
          <Typography.Text code>{id}</Typography.Text>
        </Space>
      </div>

      <Handle
        id={String(id)}
        isConnectable={isConnectable}
        position={Position.Right}
        style={styles.handle}
        type="source"
      />
    </Flex>
  );
}
