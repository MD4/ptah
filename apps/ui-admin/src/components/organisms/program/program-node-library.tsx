import type * as models from "@ptah-app/lib-models";
import { theme } from "antd";
import { Masonry, type RenderComponentProps } from "masonic";
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
  "input-velocity": { type: "input", label: "VELOCITY", parameters: [] },

  "output-result": { type: "output", label: "OUTPUT", parameters: [] },

  "fx-adsr": {
    type: "default",
    label: "ADSR",
    parameters: ["Time", "Attack", "Decay", "Sustain", "Release"],
  },
  "fx-math": {
    type: "default",
    label: "MATH",
    parameters: ["Value", "Value"],
  },
  "fx-distortion": {
    type: "default",
    label: "DISTORTION",
    parameters: ["Time", "Value", "Drive", "Tone", "Level"],
  },
};

const { useToken } = theme;

const MasonryNode = React.memo(
  ({
    data: { nodeType, onNodeDropped, onDragStart },
  }: RenderComponentProps<{
    nodeType: models.Node["type"];
    onNodeDropped: () => void;
    onDragStart: () => void;
  }>) => (
    <NodePreview
      key={nodeType}
      onDrop={onNodeDropped}
      onDragStart={onDragStart}
      nodeType={nodeType}
      {...nodesDefinitions[nodeType]}
    />
  ),
);

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
          padding: token.padding,
          width: 384,
          maxWidth: "100vw",
        },
        col: {
          transform: "translate(0, 0)",
        },
        grid: {
          display: "grid",
          gap: "10px",
          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
          gridTemplateRows: "masonry",
        },
      }) satisfies Record<string, React.CSSProperties>,
    [token.padding],
  );

  const items = React.useMemo(
    () =>
      Object.keys(programNodeTypes).map((nodeType) => ({
        nodeType: nodeType as models.Node["type"],
        onNodeDropped,
        onDragStart,
      })),
    [onNodeDropped, onDragStart],
  );

  return (
    <div style={styles.container}>
      <Masonry
        items={items}
        render={MasonryNode}
        columnCount={2}
        rowGutter={16}
        columnGutter={16}
      />
    </div>
  );
}
