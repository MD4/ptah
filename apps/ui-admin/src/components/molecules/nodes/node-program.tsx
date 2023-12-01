import { Flex } from "antd";
import * as React from "react";
import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";
import { useDefaultNodeStyle } from "./node.style";

export interface NodeProgramData {
  programId: string;
  programName: string;
}

export default function NodeProgram({
  data: { programName },
}: NodeProps<NodeProgramData>): JSX.Element {
  const defaultStyles = useDefaultNodeStyle();

  const styles: Record<string, React.CSSProperties> = React.useMemo(
    () => ({
      ...defaultStyles,
      container: {
        ...defaultStyles.container,
        height: 96,
        width: 240,
      },
    }),
    [defaultStyles]
  );

  return (
    <Flex align="center" style={styles.container}>
      <div style={styles.label}>{programName}</div>
      <Handle
        id="input"
        isConnectable
        position={Position.Left}
        style={styles.handle}
        type="target"
      />
      <Handle
        id="0"
        isConnectable
        position={Position.Right}
        style={styles.handle}
        type="source"
      />
    </Flex>
  );
}
