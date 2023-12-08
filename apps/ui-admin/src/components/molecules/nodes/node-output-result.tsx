import { Flex, Typography } from "antd";
import * as React from "react";
import type { NodeProps } from "reactflow";
import { Position } from "reactflow";
import type * as models from "@ptah/lib-models";
import HandleInputWithLimit from "../handles/handle-input-with-limit";
import { useDefaultNodeStyle } from "./node.style";

export default function NodeOutputResult({
  data: { outputId },
  selected,
}: NodeProps<models.NodeOutputResult>): JSX.Element {
  const styles = useDefaultNodeStyle("output", selected);

  return (
    <Flex
      align="center"
      gap="small"
      justify="space-between"
      style={styles.container}
    >
      <HandleInputWithLimit
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
