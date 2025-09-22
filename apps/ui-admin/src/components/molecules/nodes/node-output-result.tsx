import type * as models from "@ptah/lib-models";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { Flex, Typography } from "antd";
import * as React from "react";
import { useProgramPreviewStateOutputValues } from "../../../domain/program.preview.domain";
import Graph from "../../atoms/graph";
import HandleInputWithLimit from "../handles/handle-input-with-limit";
import { useDefaultNodeStyle } from "./node.style";

export default function NodeOutputResult({
  data: { outputId },
  selected,
}: NodeProps<Node<models.NodeOutputResult>>) {
  const styles = useDefaultNodeStyle("output", selected);
  const previewValues = useProgramPreviewStateOutputValues(outputId);

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

      <Graph
        values={previewValues}
        width={60}
        height={28}
        forceMax={1}
        forceMin={0}
      />

      <Typography.Text code>{outputId}</Typography.Text>
    </Flex>
  );
}
