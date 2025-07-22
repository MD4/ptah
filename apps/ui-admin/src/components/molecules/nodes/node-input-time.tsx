import { Flex } from "antd";
import * as React from "react";
import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";
import { useDefaultNodeStyle } from "./node.style";
import type { NodeKeyData } from "./node-key";

export default function NodeInputTime({ selected }: NodeProps<NodeKeyData>) {
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
