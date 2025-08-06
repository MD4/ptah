import { runner as runnerDomain } from "@ptah/lib-domains";
import type * as models from "@ptah/lib-models";
import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { Flex, Select } from "antd";
import type { DefaultOptionType } from "antd/es/select";
import * as React from "react";

import { useProgramEditDispatch } from "../../../domain/program.domain";
import { useProgramPreviewStateRegistryValues } from "../../../domain/program.preview.domain";
import Graph from "../../atoms/graph";
import HandleInputParameter from "../handles/handle-input-parameter";
import { useDefaultNodeStyle } from "./node.style";

const operations: DefaultOptionType[] = [
  "add",
  "substract",
  "divide",
  "multiply",
  "modulo",
  "sinus",
  "cosinus",
  "tangent",
  "arcsinus",
  "arccosinus",
  "arctangent",
  "exponential",
  "logarithm",
  "square-root",
  "power",
  "absolute",
  "round",
  "floor",
  "ceil",
].map((operation) => ({ label: operation, value: operation }));

export default function NodeFxMath({
  data,
  selected,
}: NodeProps<Node<models.NodeFxMath>>) {
  const styles = useDefaultNodeStyle("default", selected);
  const dispatch = useProgramEditDispatch();
  const previewValues = useProgramPreviewStateRegistryValues(data.id);

  const onOperationChange = React.useCallback<
    (operation: models.NodeFxMath["operation"]) => void
  >(
    (operation) => {
      dispatch({
        type: "update-node",
        payload: { node: { ...data, operation } },
      });
    },
    [data, dispatch],
  );

  const onValueValueAChange = React.useCallback<
    (valueA: number | null) => void
  >(
    (valueA) => {
      if (valueA !== null) {
        dispatch({
          type: "update-node",
          payload: { node: { ...data, valueA } },
        });
      }
    },
    [data, dispatch],
  );

  const onValueValueBChange = React.useCallback<
    (valueB: number | null) => void
  >(
    (valueB) => {
      if (valueB !== null) {
        dispatch({
          type: "update-node",
          payload: { node: { ...data, valueB } },
        });
      }
    },
    [data, dispatch],
  );

  return (
    <Flex gap="small" style={styles.container} vertical>
      <div style={styles.label}>MATH</div>

      <Select
        className="nodrag nopan"
        defaultValue={data.operation}
        onChange={onOperationChange}
        options={operations}
        size="small"
      />

      <HandleInputParameter
        defaultValue={data.valueA}
        id={0}
        label="Value"
        onChange={onValueValueAChange}
        step={0.5}
      />

      {runnerDomain.mathNodeOperatorHasSecondValue(data.operation) && (
        <HandleInputParameter
          defaultValue={data.valueB}
          id={1}
          label="Value"
          onChange={onValueValueBChange}
          step={0.5}
        />
      )}

      <Handle
        id={String(0)}
        isConnectable
        position={Position.Right}
        style={styles.handle}
        type="source"
      />

      <div />

      <Graph values={previewValues} width={130} height={40} />
    </Flex>
  );
}
