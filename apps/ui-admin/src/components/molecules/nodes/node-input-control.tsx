import type * as models from "@ptah/lib-models";
import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { Flex, Select } from "antd";
import type { DefaultOptionType } from "antd/es/select";
import * as React from "react";

import { useProgramEditDispatch } from "../../../domain/program.domain";
import { useDefaultNodeStyle } from "./node.style";

const controls: DefaultOptionType[] = [...Array(12).keys()].map((value) => ({
  value,
  label: `Control ${String(value)}`,
}));

export default function NodeInputControl({
  data,
  selected,
}: NodeProps<Node<models.NodeInputControl>>) {
  const styles = useDefaultNodeStyle("input", selected);
  const dispatch = useProgramEditDispatch();

  const onValueChange = React.useCallback<(controlId: number) => void>(
    (controlId) => {
      dispatch({
        type: "update-node",
        payload: { node: { ...data, controlId } },
      });
    },
    [data, dispatch],
  );

  return (
    <Flex gap="small" style={styles.container} vertical>
      <div style={styles.label}>CONTROL</div>

      <Select
        className="nodrag nopan"
        defaultValue={data.controlId}
        onChange={onValueChange}
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
