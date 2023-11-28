import { Flex, theme } from "antd";
import * as React from "react";
import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";

const { useToken } = theme;

export interface NodeKeyData {
  label: string;
  sharp: boolean;
}

export default function NodeKey({
  data: { label, sharp },
}: NodeProps<NodeKeyData>): JSX.Element {
  const { token } = useToken();

  const styles: Record<string, React.CSSProperties> = React.useMemo(
    () => ({
      container: {
        padding: 16,
        borderRadius: token.borderRadiusLG * 2,
        borderTopLeftRadius: token.borderRadiusLG,
        borderBottomLeftRadius: token.borderRadiusLG,
        background: sharp ? token.colorBorder : token.colorBgElevated,
        height: sharp ? "32px" : "64px",
        width: sharp ? "160px" : "240px",
      },
      handle: {
        borderRadius: 12,
        width: 12,
        height: 12,
        background: "transparent",
        borderStyle: "solid",
        borderWidth: 2,
        borderColor: token.colorTextDescription,
      },
      label: {
        fontSize: token.fontSizeLG,
      },
    }),
    [
      sharp,
      token.borderRadiusLG,
      token.colorBgElevated,
      token.colorBorder,
      token.colorTextDescription,
      token.fontSizeLG,
    ]
  );

  return (
    <Flex align="center" style={styles.container}>
      <div style={styles.label}>{label}</div>
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
