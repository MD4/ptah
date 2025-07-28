import type * as models from "@ptah/lib-models";
import { Col, Row, theme } from "antd";
import * as React from "react";

import NodePreview from "../../atoms/node-preview";
import { programNodeTypes } from "../../molecules/nodes";
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
  "fx-distortion": {
    type: "default",
    label: "DISTORTION",
    parameters: ["Time", "Value", "Drive", "Tone", "Level"],
  },
};

const { useToken } = theme;

export default function ProgramNodeLibrary({
  onNodeDropped,
  onDragStart,
}: {
  onNodeDropped: () => void;
  onDragStart: () => void;
}) {
  const { token } = useToken();

  const styles = React.useMemo(
    () =>
      ({
        container: {
          height: "100%",
          padding: token.paddingLG,
          width: 400,
          maxWidth: "100vw",
        },
        col: {
          transform: "translate(0, 0)",
        },
      }) satisfies Record<string, React.CSSProperties>,
    [token.paddingLG],
  );

  return (
    <div style={styles.container}>
      <Row gutter={[16, 16]}>
        {(Object.keys(programNodeTypes) as models.Node["type"][]).map(
          (nodeType) => (
            <Col key={nodeType} style={styles.col}>
              <NodePreview
                onDrop={onNodeDropped}
                onDragStart={onDragStart}
                nodeType={nodeType}
                {...nodesDefinitions[nodeType]}
              />
            </Col>
          ),
        )}
      </Row>
    </div>
  );
}
