import * as React from "react";
import { Link } from "react-router-dom";
import type { NodeProps } from "reactflow";

import { EditFilled } from "@ant-design/icons";
import { Button, Flex, theme } from "antd";

import { useDefaultNodeStyle } from "./node.style";
import HandleInputWithLabel from "../handles/handle-input-with-label";
import HandleOutputWithLabel from "../handles/handle-output-with-label";

export type NodeProgramData = {
  programId: string;
  programName: string;
  outputsCount: number;
  noInput?: boolean;
};

const { useToken } = theme;

export default function NodeProgram({
  data: { programName, outputsCount, noInput },
  selected,
}: NodeProps<NodeProgramData>): JSX.Element {
  const defaultStyles = useDefaultNodeStyle("default", selected);
  const { token } = useToken();

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
      editButton: {
        position: "absolute",
        right: token.sizeMS,
        top: token.sizeMS,
      },
    }),
    [defaultStyles, token.sizeMS],
  );

  const outputHandles = React.useMemo(
    () =>
      Array(outputsCount)
        .fill(0)
        .map((_, index) => index),
    [outputsCount],
  );

  return (
    <>
      {selected ? (
        <Link to={`/program/${programName}`}>
          <Button
            icon={<EditFilled />}
            size="small"
            style={styles.editButton}
            type="text"
          />
        </Link>
      ) : null}

      <Flex gap="small" style={styles.container} vertical>
        <div style={styles.label}>{programName}</div>

        <Flex gap="small">
          <div style={{ flex: 1 }}>
            {!noInput ? <HandleInputWithLabel id={0} label="run" /> : null}
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
    </>
  );
}
