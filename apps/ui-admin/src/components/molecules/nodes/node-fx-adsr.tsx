import { Flex } from "antd";
import * as React from "react";
import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";
import type * as models from "@ptah/lib-models";
import { useDefaultNodeStyle } from "./node.style";
import Parameter from "./parameter";

export default function NodeFxADSR({
  data: { attackRate, decayRate, sustainLevel, releaseRate },
}: NodeProps<models.NodeFxADSR>): JSX.Element {
  const styles = useDefaultNodeStyle();

  return (
    <Flex gap="small" style={styles.container} vertical>
      <div style={styles.label}>ADSR</div>

      <Parameter id={0} label="Time" />
      <Parameter
        defaultValue={attackRate}
        id={1}
        label="Attack"
        max={1}
        min={0}
        step={0.1}
      />
      <Parameter
        defaultValue={decayRate}
        id={2}
        label="Decay"
        max={1}
        min={0}
        step={0.1}
      />
      <Parameter
        defaultValue={sustainLevel}
        id={3}
        label="Sustain"
        max={1}
        min={0}
        step={0.1}
      />
      <Parameter
        defaultValue={releaseRate}
        id={4}
        label="Release"
        max={1}
        min={0}
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
