import { Handle, Position } from "@xyflow/react";
import { Flex, Space, Typography, theme } from "antd";
import * as React from "react";

import { COLOR_WHEEL_GRADIENT } from "../../../utils/color";
import { useDefaultNodeStyle } from "../nodes/node.style";

const { useToken } = theme;

export default function HandleOutputWithLabel({
  id,
  label,
  isConnectable = true,
  kind = "scalar",
}: {
  id: number;
  label: string;
  isConnectable?: boolean;
  kind?: "scalar" | "color";
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
          ...(kind === "color"
            ? {
                background: COLOR_WHEEL_GRADIENT,
                width: token.sizeXS + 2,
                height: token.sizeXS + 2,
              }
            : {}),
        },
        label: {
          flex: 1,
          textAlign: "right",
        },
      }) satisfies Record<string, React.CSSProperties>,
    [defaultNodeStyle.handle, kind, token.sizeLG, token.sizeXS],
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
