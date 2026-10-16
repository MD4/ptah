import { DeleteFilled, EditFilled } from "@ant-design/icons";
import type { Node } from "@xyflow/react";
import { type NodeProps, useReactFlow } from "@xyflow/react";
import { Button, Flex, theme } from "antd";
import * as React from "react";
import { Link } from "react-router-dom";
import type { ProgramOutputDescriptor } from "../../../adapters/show.adapter";
import HandleInputWithLabel from "../handles/handle-input-with-label";
import HandleOutputWithLabel from "../handles/handle-output-with-label";
import { useDefaultNodeStyle } from "./node.style";

export type NodeProgramData = {
  programId: string;
  programName: string;
  outputs: ProgramOutputDescriptor[];
  noInput?: boolean;
};

const { useToken } = theme;

export default function NodeProgram({
  data: { programId, programName, outputs, noInput },
  selected,
}: NodeProps<Node<NodeProgramData>>) {
  const reactFlow = useReactFlow();
  const defaultStyles = useDefaultNodeStyle("default", selected);
  const { token } = useToken();

  const styles = React.useMemo(
    () =>
      ({
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
        actions: {
          position: "absolute",
          right: token.sizeMS,
          top: token.sizeMS,
          display: "flex",
          flexDirection: "row",
          gap: token.sizeXXS,
        },
      }) satisfies Record<string, React.CSSProperties>,
    [defaultStyles, token.sizeMS, token.sizeXXS],
  );

  const onDeleteClick = React.useCallback(() => {
    reactFlow.deleteElements({
      nodes: [{ id: `program-${programId}` }],
    });
  }, [programId, reactFlow]);

  return (
    <>
      {selected ? (
        <div style={styles.actions}>
          <Link to={`/program/${programName}`}>
            <Button icon={<EditFilled />} size="small" type="text" />
          </Link>
          <Button
            icon={<DeleteFilled />}
            size="small"
            type="text"
            onClick={onDeleteClick}
          />
        </div>
      ) : null}

      <Flex gap="small" style={styles.container} vertical>
        <div style={styles.label}>{programName}</div>

        <Flex gap="small">
          <div style={{ flex: 1 }}>
            {!noInput ? <HandleInputWithLabel id={0} label="run" /> : null}
          </div>
          <div style={{ flex: 1 }}>
            {outputs.map((output) => (
              <HandleOutputWithLabel
                id={output.outputId}
                isConnectable
                key={output.outputId}
                kind={output.kind}
                label={output.kind === "color" ? "color" : "output"}
              />
            ))}
          </div>
        </Flex>
      </Flex>
    </>
  );
}
