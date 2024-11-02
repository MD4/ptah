import { Flex, Typography } from "antd";
import * as React from "react";
import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";
import { useDefaultNodeStyle } from "./node.style";

export type NodeChannelData = {
  label: string;
}

export default function NodeChannel({
  data: { label },
  selected,
}: NodeProps<NodeChannelData>): JSX.Element {
  const defaultStyles = useDefaultNodeStyle("output", selected);

  const styles: Record<string, React.CSSProperties> = React.useMemo(
    () => ({
      ...defaultStyles,
      container: {
        ...defaultStyles.container,
        height: 36,
        width: 200,
      },
    }),
    [defaultStyles]
  );

  return (
    <Flex align="center" style={styles.container}>
      <Typography.Text code>{label}</Typography.Text>
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
