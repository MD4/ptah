import { Flex, Typography, theme } from "antd";
import * as React from "react";
import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";
import { useDefaultNodeStyle } from "./node.style";

const { useToken } = theme;

export interface NodeKeyData {
  key: number;
  label: string;
  sharp: boolean;
}

export default function NodeKey({
  data: { key, label, sharp },
}: NodeProps<NodeKeyData>): JSX.Element {
  const { token } = useToken();
  const defaultStyles = useDefaultNodeStyle();

  const styles: Record<string, React.CSSProperties> = React.useMemo(
    () => ({
      ...defaultStyles,
      container: {
        ...defaultStyles.container,
        borderTopRightRadius: token.borderRadiusLG * 2,
        borderBottomRightRadius: token.borderRadiusLG * 2,
        borderTopLeftRadius: token.borderRadiusSM,
        borderBottomLeftRadius: token.borderRadiusSM,
        background: sharp ? token.colorBgContainer : token.colorFillQuaternary,
        height: sharp ? "32px" : "64px",
        width: sharp ? "160px" : "240px",
      },
      label: {
        ...defaultStyles.label,
        width: "auto",
      },
    }),
    [
      defaultStyles,
      sharp,
      token.borderRadiusLG,
      token.borderRadiusSM,
      token.colorBgContainer,
      token.colorFillQuaternary,
    ]
  );

  return (
    <Flex
      align="center"
      gap="small"
      justify="flex-end"
      style={styles.container}
    >
      <div style={styles.label}>{label}</div>
      <Typography.Text code>{key}</Typography.Text>
      <Handle
        id="output"
        isConnectable
        position={Position.Right}
        style={styles.handle}
        type="source"
      />
    </Flex>
  );
}
