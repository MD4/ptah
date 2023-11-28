import { Flex, Typography } from "antd";
import * as React from "react";
import type { NodeProps } from "reactflow";
import { Position } from "reactflow";
import type * as models from "@ptah/lib-models";
import { useDefaultNodeStyle } from "./node.style";
import HandleWithLimit from "./handle-with-limit";

export default function NodeOutputResult({
  data: { outputId },
}: NodeProps<models.NodeOutputResult>): JSX.Element {
  const styles = useDefaultNodeStyle("output");

  return (
    <Flex
      align="center"
      gap="small"
      justify="space-between"
      style={styles.container}
    >
      <HandleWithLimit
        id={String(0)}
        isConnectable={1}
        position={Position.Left}
        style={styles.handle}
        type="target"
      />

      <div style={styles.label}>OUTPUT</div>

      <Typography.Text code>{outputId}</Typography.Text>
    </Flex>
  );
}
