import type * as models from "@ptah/lib-models";
import { Flex, InputNumber } from "antd";
import * as React from "react";
import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";

import { useProgramEditDispatch } from "../../../domain/program.domain";
import { useDefaultNodeStyle } from "./node.style";

export default function NodeInputConstant({
  data,
  selected,
}: NodeProps<models.NodeInputConstant>) {
  const styles = useDefaultNodeStyle("input", selected);
  const dispatch = useProgramEditDispatch();

  const onValueChange = React.useCallback<(value: number | null) => void>(
    (value) => {
      if (value !== null) {
        dispatch({
          type: "update-node",
          payload: { node: { ...data, value } },
        });
      }
    },
    [data, dispatch],
  );

  return (
    <Flex gap="small" style={styles.container} vertical>
      <div style={styles.label}>CONSTANT</div>

      <InputNumber
        className="nodrag nopan"
        defaultValue={data.value}
        onChange={onValueChange}
        size="small"
        style={{ width: "100%" }}
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
