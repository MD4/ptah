import type * as models from "@ptah/lib-models";
import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { Flex, Slider, Typography } from "antd";
import * as React from "react";
import { useDebounceCallback } from "usehooks-ts";
import { useProgramEditDispatch } from "../../../domain/program.domain";
import { useDefaultNodeStyle } from "./node.style";

export default function NodeInputVelocity({
  data,
  selected,
}: NodeProps<Node<models.NodeInputVelocity>>) {
  const styles = useDefaultNodeStyle("input", selected);
  const dispatch = useProgramEditDispatch();

  const onValueChange = React.useCallback<(value: number) => void>(
    (defaultValue) => {
      dispatch({
        type: "update-node",
        payload: { node: { ...data, defaultValue } },
      });
    },
    [data, dispatch],
  );

  const onValueChangeDebounced = useDebounceCallback(onValueChange, 5);

  return (
    <Flex gap="small" style={styles.container} vertical>
      <div style={styles.label}>VELOCITY</div>

      <Typography.Text>Default value</Typography.Text>
      <Slider
        style={styles.slider}
        className="nodrag nopan"
        defaultValue={data.defaultValue}
        onChange={onValueChangeDebounced}
        min={0}
        max={127}
        step={1}
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
