import type * as models from "@ptah-app/lib-models";
import { Flex, theme } from "antd";
import * as React from "react";

import type { NodeStyleType } from "../molecules/nodes/node.style";
import { useDefaultNodeStyle } from "../molecules/nodes/node.style";

const { useToken } = theme;

export default function NodePreview({
  label,
  nodeType,
  type,
  parameters,
  onDrop,
  onDragStart,
}: {
  label: string;
  nodeType: models.Node["type"];
  type: NodeStyleType;
  parameters: string[];
  onDrop: () => void;
  onDragStart: () => void;
}) {
  const { token } = useToken();
  const defaultStyles = useDefaultNodeStyle(type);

  const styles = React.useMemo(
    () =>
      ({
        ...defaultStyles,
        container: {
          ...defaultStyles.container,
          cursor: "grab",
        },
        parameter: {
          minHeight: token.sizeLG,
        },
      }) satisfies Record<string, React.CSSProperties>,
    [defaultStyles, token.sizeLG],
  );

  const _onDragStart = React.useCallback(
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
        }),
      );
      event.dataTransfer.effectAllowed = "move";

      onDragStart();
    },
    [nodeType, onDragStart],
  );

  return (
    <Flex
      draggable
      gap="small"
      onDragEnd={onDrop}
      onDragStart={_onDragStart}
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
