import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { Flex } from "antd";
import * as React from "react";
import { useDefaultNodeStyle } from "./node.style";
import type { NodeKeyData } from "./node-key";

export default function NodeInputTime({
  selected,
}: NodeProps<Node<NodeKeyData>>) {
  const styles = useDefaultNodeStyle("input", selected);

  return (
    <Flex align="center" style={styles.container}>
      <div style={styles.label}>TIME</div>
      <Handle
        id={String(0)}
        isConnectable
        position={Position.Right}
        style={styles.handle}
        type="source"
      />
    </Flex>
  );
}
