import type * as models from "@ptah/lib-models";
import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { Flex } from "antd";
import * as React from "react";
import { useProgramEditDispatch } from "../../../domain/program.domain";
import { useProgramPreviewStateRegistryValues } from "../../../domain/program.preview.domain";
import Graph from "../../atoms/graph";
import HandleInputParameter from "../handles/handle-input-parameter";
import { useDefaultNodeStyle } from "./node.style";

export default function NodeFxADSR({
  data,
  selected,
}: NodeProps<Node<models.NodeFxADSR>>) {
  const styles = useDefaultNodeStyle("default", selected);
  const dispatch = useProgramEditDispatch();
  const previewValues = useProgramPreviewStateRegistryValues(data.id);

  const containerStyle = React.useMemo(
    () => ({
      ...styles.container,
      width: "auto",
    }),
    [styles.container],
  );

  const onValueAttackChange = React.useCallback<
    (attackRate: number | null) => void
  >(
    (attackRate) => {
      if (attackRate !== null) {
        dispatch({
          type: "update-node",
          payload: { node: { ...data, attackRate } },
        });
      }
    },
    [data, dispatch],
  );

  const onValueDecayChange = React.useCallback<
    (decayRate: number | null) => void
  >(
    (decayRate) => {
      if (decayRate !== null) {
        dispatch({
          type: "update-node",
          payload: { node: { ...data, decayRate } },
        });
      }
    },
    [data, dispatch],
  );

  const onValueSustainChange = React.useCallback<
    (sustainLevel: number | null) => void
  >(
    (sustainLevel) => {
      if (sustainLevel !== null) {
        dispatch({
          type: "update-node",
          payload: { node: { ...data, sustainLevel } },
        });
      }
    },
    [data, dispatch],
  );

  const onValueReleaseChange = React.useCallback<
    (releaseRate: number | null) => void
  >(
    (releaseRate) => {
      if (releaseRate !== null) {
        dispatch({
          type: "update-node",
          payload: { node: { ...data, releaseRate } },
        });
      }
    },
    [data, dispatch],
  );

  return (
    <Flex gap="small" style={containerStyle} vertical>
      <div style={styles.label}>ADSR</div>

      <HandleInputParameter id={0} label="Time" />
      <HandleInputParameter
        defaultValue={data.attackRate}
        id={1}
        label="Attack"
        max={1}
        min={0}
        onChange={onValueAttackChange}
        step={0.1}
      />
      <HandleInputParameter
        defaultValue={data.decayRate}
        id={2}
        label="Decay"
        max={1}
        min={0}
        onChange={onValueDecayChange}
        step={0.1}
      />
      <HandleInputParameter
        defaultValue={data.sustainLevel}
        id={3}
        label="Sustain"
        max={1}
        min={0}
        onChange={onValueSustainChange}
        step={0.1}
      />
      <HandleInputParameter
        defaultValue={data.releaseRate}
        id={4}
        label="Release"
        max={1}
        min={0}
        onChange={onValueReleaseChange}
        step={0.1}
      />

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
