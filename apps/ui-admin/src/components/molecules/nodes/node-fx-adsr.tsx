import { Flex } from "antd";
import * as React from "react";
import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";
import type * as models from "@ptah/lib-models";
import { useProgramEditDispatch } from "../../../domain/program.domain";
import { useDefaultNodeStyle } from "./node.style";
import Parameter from "./parameter";

export default function NodeFxADSR({
  data,
}: NodeProps<models.NodeFxADSR>): JSX.Element {
  const styles = useDefaultNodeStyle();
  const dispatch = useProgramEditDispatch();

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
    [data, dispatch]
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
    [data, dispatch]
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
    [data, dispatch]
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
    [data, dispatch]
  );

  return (
    <Flex gap="small" style={styles.container} vertical>
      <div style={styles.label}>ADSR</div>

      <Parameter id={0} label="Time" />
      <Parameter
        defaultValue={data.attackRate}
        id={1}
        label="Attack"
        max={1}
        min={0}
        onChange={onValueAttackChange}
        step={0.1}
      />
      <Parameter
        defaultValue={data.decayRate}
        id={2}
        label="Decay"
        max={1}
        min={0}
        onChange={onValueDecayChange}
        step={0.1}
      />
      <Parameter
        defaultValue={data.sustainLevel}
        id={3}
        label="Sustain"
        max={1}
        min={0}
        onChange={onValueSustainChange}
        step={0.1}
      />
      <Parameter
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
    </Flex>
  );
}
