import type * as models from "@ptah-app/lib-models";
import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { Flex, InputNumber } from "antd";
import * as React from "react";

import { useProgramEditDispatch } from "../../../domain/program.domain";
import { useDefaultNodeStyle } from "./node.style";

export default function NodeInputConstant({
  data,
  selected,
}: NodeProps<Node<models.NodeInputConstant>>) {
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
        style={{ width: "100%", maxWidth: "130px" }}
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
