import type * as models from "@ptah/lib-models";
import { Flex, Typography } from "antd";
import * as React from "react";
import type { NodeProps } from "reactflow";
import { Position } from "reactflow";
import { useProgramPreviewStateOutputValues } from "../../../domain/program.preview.domain";
import Graph from "../../atoms/graph";
import HandleInputWithLimit from "../handles/handle-input-with-limit";
import { useDefaultNodeStyle } from "./node.style";

export default function NodeOutputResult({
  data: { outputId },
  selected,
}: NodeProps<models.NodeOutputResult>) {
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

      <Graph values={previewValues} width={60} height={28} />

      <Typography.Text code>{outputId}</Typography.Text>
    </Flex>
  );
}
