import { Flex, Select } from "antd";
import * as React from "react";
import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";
import type * as models from "@ptah/lib-models";
import type { DefaultOptionType } from "antd/es/select";
import { useDefaultNodeStyle } from "./node.style";

const controls: DefaultOptionType[] = [...Array(12).keys()].map((value) => ({
  value,
  label: `Control ${value}`,
}));

export default function NodeInputControl({
  data: { controlId },
}: NodeProps<models.NodeInputControl>): JSX.Element {
  const styles = useDefaultNodeStyle("input");

  return (
    <Flex gap="small" style={styles.container} vertical>
      <div style={styles.label}>CONTROL</div>

      <Select
        className="nodrag nopan"
        defaultValue={controlId}
        options={controls}
        size="small"
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
