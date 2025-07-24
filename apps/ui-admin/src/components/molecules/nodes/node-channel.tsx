import { Flex, Typography } from "antd";
import * as React from "react";
import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";

import { useDefaultNodeStyle } from "./node.style";

export type NodeChannelData = {
  label: string;
};

export default function NodeChannel({
  data: { label },
  selected,
}: NodeProps<NodeChannelData>) {
  const defaultStyles = useDefaultNodeStyle("output", selected);

  const styles = React.useMemo(
    () =>
      ({
        ...defaultStyles,
        container: {
          ...defaultStyles.container,
          height: 36,
          width: 200,
        },
      }) satisfies Record<string, React.CSSProperties>,
    [defaultStyles],
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
