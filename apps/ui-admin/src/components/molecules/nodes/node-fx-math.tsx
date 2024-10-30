import { Flex, Select } from "antd";
import * as React from "react";
import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";
import type * as models from "@ptah/lib-models";
import type { DefaultOptionType } from "antd/es/select";
import { useProgramEditDispatch } from "../../../domain/program.domain";
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
}: NodeProps<models.NodeFxMath>): JSX.Element {
  const styles = useDefaultNodeStyle("default", selected);
  const dispatch = useProgramEditDispatch();

  const onOperationChange = React.useCallback<
    (operation: models.NodeFxMath["operation"]) => void
  >(
    (operation) => {
      dispatch({
        type: "update-node",
        payload: { node: { ...data, operation } },
      });
    },
    [data, dispatch]
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
    [data, dispatch]
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
    [data, dispatch]
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
        label="Value A"
        onChange={onValueValueAChange}
        step={0.5}
      />
      <HandleInputParameter
        defaultValue={data.valueB}
        id={1}
        label="Value B"
        onChange={onValueValueBChange}
        step={0.5}
      />

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
