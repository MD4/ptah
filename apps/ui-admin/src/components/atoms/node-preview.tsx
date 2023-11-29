import { Flex } from "antd";
import * as React from "react";
import type * as models from "@ptah/lib-models";
import type { NodeStyleType } from "../molecules/nodes/node.style";
import { useDefaultNodeStyle } from "../molecules/nodes/node.style";

export default function NodePreview({
  label,
  nodeType,
  type,
  parameters,
  onDrop,
}: {
  label: string;
  nodeType: models.Node["type"];
  type: NodeStyleType;
  parameters: string[];
  onDrop: () => void;
}): JSX.Element {
  const defaultStyles = useDefaultNodeStyle(type);

  const styles: Record<string, React.CSSProperties> = React.useMemo(
    () => ({
      ...defaultStyles,
      container: {
        ...defaultStyles.container,
        cursor: "grab",
      },
      parameter: {
        minHeight: 24,
      },
    }),
    [defaultStyles]
  );

  const onDragStart = React.useCallback(
    (event: DragEvent) => {
      if (!event.dataTransfer || !event.target) {
        return;
      }

      const elementRect = (event.target as HTMLElement).getBoundingClientRect();

      event.dataTransfer.setData(
        "application/reactflow",
        JSON.stringify({
          nodeType,
          offsetX: event.clientX - elementRect.x,
          offsetY: event.clientY - elementRect.y,
        })
      );
      event.dataTransfer.effectAllowed = "move";
    },
    [nodeType]
  );

  return (
    <Flex
      draggable
      gap="small"
      onDragEnd={onDrop}
      onDragStart={onDragStart}
      style={styles.container}
      vertical
    >
      <div style={styles.label}>{label}</div>
      {parameters.map((parameter) => (
        <div key={parameter} style={styles.parameter}>
          {parameter}
        </div>
      ))}
    </Flex>
  );
}
