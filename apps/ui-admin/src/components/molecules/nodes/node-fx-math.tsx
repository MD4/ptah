import { Flex, Select } from "antd";
import * as React from "react";
import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";
import type * as models from "@ptah/lib-models";
import type { DefaultOptionType } from "antd/es/select";
import { useDefaultNodeStyle } from "./node.style";
import Parameter from "./parameter";

const operations: DefaultOptionType[] = [
  "add",
  "substract",
  "divide",
  "multiply",
].map((operation) => ({ label: operation }));

export default function NodeFxMath({
  data: { operation, valueA, valueB },
}: NodeProps<models.NodeFxMath>): JSX.Element {
  const styles = useDefaultNodeStyle();

  return (
    <Flex gap="small" style={styles.container} vertical>
      <div style={styles.label}>MATH</div>

      <Select
        className="nodrag nopan"
        defaultValue={operation}
        options={operations}
        size="small"
      />

      <Parameter defaultValue={valueA} id={0} label="value A" step={0.5} />
      <Parameter defaultValue={valueB} id={1} label="value B" step={0.5} />

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
