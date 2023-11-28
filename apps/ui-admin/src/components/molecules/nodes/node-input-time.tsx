import { Flex } from "antd";
import * as React from "react";
import { Handle, Position } from "reactflow";
import { useDefaultNodeStyle } from "./node.style";

export default function NodeInputTime(): JSX.Element {
  const styles = useDefaultNodeStyle("input");

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
