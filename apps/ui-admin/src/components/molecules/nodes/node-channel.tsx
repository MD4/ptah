import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { Flex, Typography } from "antd";
import * as React from "react";

import { useDefaultNodeStyle } from "./node.style";

export type NodeChannelData = {
  label: string;
};

export default function NodeChannel({
  data: { label },
  selected,
}: NodeProps<Node<NodeChannelData>>) {
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
      {/** biome-ignore lint/correctness/useUniqueElementIds: need to be "output" */}
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
