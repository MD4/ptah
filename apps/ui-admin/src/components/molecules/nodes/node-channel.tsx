import { Flex, theme } from "antd";
import * as React from "react";
import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";

const { useToken } = theme;

export interface NodeChannelData {
  label: string;
}

export default function NodeChannel({
  data: { label },
}: NodeProps<NodeChannelData>): JSX.Element {
  const { token } = useToken();

  const styles: Record<string, React.CSSProperties> = React.useMemo(
    () => ({
      container: {
        padding: 16,
        borderRadius: token.borderRadiusLG,
        background: token.colorBgElevated,
        height: "32px",
        width: "200px",
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
      token.borderRadiusLG,
      token.colorBgElevated,
      token.colorTextDescription,
      token.fontSizeLG,
    ]
  );

  return (
    <Flex align="center" style={styles.container}>
      <div style={styles.label}>{label}</div>
      <Handle
        id="input"
        isConnectable
        position={Position.Left}
        style={styles.handle}
        type="target"
      />
    </Flex>
  );
}
