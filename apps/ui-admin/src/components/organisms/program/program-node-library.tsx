import { Col, Row, theme } from "antd";
import * as React from "react";
import type * as models from "@ptah/lib-models";
import { programNodeTypes } from "../../molecules/nodes";
import NodePreview from "../../atoms/node-preview";
import type { NodeStyleType } from "../../molecules/nodes/node.style";

export const nodesDefinitions: Record<
  models.Node["type"],
  {
    label: string;
    parameters: string[];
    type: NodeStyleType;
  }
> = {
  "input-time": { type: "input", label: "TIME", parameters: [] },
  "input-constant": { type: "input", label: "CONSTANT", parameters: [] },
  "input-control": { type: "input", label: "CONTROL", parameters: [] },

  "output-result": { type: "output", label: "OUTPUT", parameters: [] },

  "fx-adsr": {
    type: "default",
    label: "ADSR",
    parameters: ["Time", "Attack", "Decay", "Sustain", "Release"],
  },
  "fx-math": {
    type: "default",
    label: "MATH",
    parameters: ["Value A", "Value B"],
  },
};

const { useToken } = theme;

export default function ProgramNodeLibrary({
  onNodeDropped,
}: {
  onNodeDropped: () => void;
}): JSX.Element {
  const { token } = useToken();

  const styles: Record<string, React.CSSProperties> = React.useMemo(
    () => ({
      container: {
        height: "100%",
        padding: token.paddingLG,
        width: 400,
      },
      col: {
        transform: "translate(0, 0)",
      },
    }),
    [token.paddingLG]
  );

  return (
    <div style={styles.container}>
      <Row gutter={[16, 16]}>
        {(Object.keys(programNodeTypes) as models.Node["type"][]).map(
          (nodeType) => (
            <Col key={nodeType} style={styles.col}>
              <NodePreview
                onDrop={onNodeDropped}
                {...nodesDefinitions[nodeType]}
                nodeType={nodeType}
              />
            </Col>
          )
        )}
      </Row>
    </div>
  );
}
