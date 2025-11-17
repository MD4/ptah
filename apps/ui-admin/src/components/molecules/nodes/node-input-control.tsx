import type * as models from "@ptah-app/lib-models";
import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { Flex, Select, Slider, Typography } from "antd";
import type { DefaultOptionType } from "antd/es/select";
import * as React from "react";
import { useDebounceCallback } from "usehooks-ts";
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

  const onControlChange = React.useCallback<(controlId: number) => void>(
    (controlId) => {
      dispatch({
        type: "update-node",
        payload: { node: { ...data, controlId } },
      });
    },
    [data, dispatch],
  );

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
      <div style={styles.label}>CONTROL</div>

      <Typography.Text>Control ID</Typography.Text>
      <Select
        className="nodrag nopan"
        defaultValue={data.controlId}
        onChange={onControlChange}
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

      <Typography.Text>Default value</Typography.Text>
      <Slider
        style={styles.slider}
        className="nodrag nopan"
        defaultValue={data.defaultValue}
        onChange={onValueChangeDebounced}
        min={1}
        max={127}
        step={1}
      />
    </Flex>
  );
}
