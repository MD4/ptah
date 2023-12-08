import { Flex } from "antd";
import * as React from "react";
import type { NodeProps } from "reactflow";
import HandleInputWithLabel from "../handles/handle-input-with-label";
import HandleOutputWithLabel from "../handles/handle-output-with-label";
import { useDefaultNodeStyle } from "./node.style";

export interface NodeProgramData {
  programId: string;
  programName: string;
  outputsCount: number;
}

export default function NodeProgram({
  data: { programName, outputsCount },
  selected,
}: NodeProps<NodeProgramData>): JSX.Element {
  const defaultStyles = useDefaultNodeStyle("default", selected);

  const styles: Record<string, React.CSSProperties> = React.useMemo(
    () => ({
      ...defaultStyles,
      container: {
        ...defaultStyles.container,
        width: 240,
      },
      handle: {
        ...defaultStyles.handle,
        position: "initial",
        transform: "none",
        marginLeft: -20,
      },
    }),
    [defaultStyles]
  );

  const outputHandles = React.useMemo(
    () =>
      Array(outputsCount)
        .fill(0)
        .map((_, index) => index),
    [outputsCount]
  );

  return (
    <Flex gap="small" style={styles.container} vertical>
      <div style={styles.label}>{programName}</div>

      <Flex gap="small">
        <div style={{ flex: 1 }}>
          {" "}
          <HandleInputWithLabel id={0} label="run" />
        </div>
        <div style={{ flex: 1 }}>
          {outputHandles.map((outputId) => (
            <HandleOutputWithLabel
              id={outputId}
              isConnectable
              key={outputId}
              label="output"
            />
          ))}
        </div>
      </Flex>
    </Flex>
  );
}
