import type * as models from "@ptah/lib-models";
import { Flex } from "antd";
import * as React from "react";
import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";

import { useProgramEditDispatch } from "../../../domain/program.domain";
import HandleInputParameter from "../handles/handle-input-parameter";
import { useDefaultNodeStyle } from "./node.style";

export default function NodeFxDistortion({
  data,
  selected,
}: NodeProps<models.NodeFxDistortion>) {
  const styles = useDefaultNodeStyle("default", selected);
  const dispatch = useProgramEditDispatch();

  const onValueTimeChange = React.useCallback<(value: number | null) => void>(
    (value) => {
      if (value !== null) {
        dispatch({
          type: "update-node",
          payload: { node: { ...data, time: value } },
        });
      }
    },
    [data, dispatch],
  );

  const onValueValueChange = React.useCallback<(value: number | null) => void>(
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

  const onValueDriveChange = React.useCallback<(value: number | null) => void>(
    (value) => {
      if (value !== null) {
        dispatch({
          type: "update-node",
          payload: { node: { ...data, drive: value } },
        });
      }
    },
    [data, dispatch],
  );

  const onValueToneChange = React.useCallback<(value: number | null) => void>(
    (value) => {
      if (value !== null) {
        dispatch({
          type: "update-node",
          payload: { node: { ...data, tone: value } },
        });
      }
    },
    [data, dispatch],
  );

  const onValueLevelChange = React.useCallback<(value: number | null) => void>(
    (value) => {
      if (value !== null) {
        dispatch({
          type: "update-node",
          payload: { node: { ...data, level: value } },
        });
      }
    },
    [data, dispatch],
  );

  return (
    <Flex gap="small" style={styles.container} vertical>
      <div style={styles.label}>DISTORTION</div>

      <HandleInputParameter
        defaultValue={data.time}
        id={0}
        label="Time"
        onChange={onValueTimeChange}
        step={0.1}
      />
      <HandleInputParameter
        defaultValue={data.value}
        id={1}
        label="Value"
        onChange={onValueValueChange}
        step={0.1}
      />
      <HandleInputParameter
        defaultValue={data.drive}
        id={2}
        label="Drive"
        onChange={onValueDriveChange}
        step={0.1}
      />
      <HandleInputParameter
        defaultValue={data.tone}
        id={3}
        label="Tone"
        onChange={onValueToneChange}
        step={0.1}
      />
      <HandleInputParameter
        defaultValue={data.level}
        id={4}
        label="Level"
        onChange={onValueLevelChange}
        step={0.1}
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
