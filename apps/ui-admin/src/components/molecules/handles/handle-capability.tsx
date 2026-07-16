import { Handle, Position } from "@xyflow/react";
import { Flex, Tooltip, Typography, theme } from "antd";
import * as React from "react";

import { COLOR_WHEEL_GRADIENT } from "../../../utils/color";
import { useDefaultNodeStyle } from "../nodes/node.style";

const { useToken } = theme;

/**
 * Target handle for one fixture capability. Color capabilities get a hue-wheel
 * dot so compatible wires are recognizable before dragging.
 */
export default function HandleCapability({
  id,
  label,
  kind,
  channels,
}: {
  id: string;
  label: string;
  kind: "scalar" | "color";
  channels: number[];
}) {
  const { token } = useToken();
  const defaultNodeStyle = useDefaultNodeStyle();

  const styles = React.useMemo(
    () =>
      ({
        container: {
          minHeight: token.sizeLG,
        },
        handle: {
          ...defaultNodeStyle.handle,
          position: "initial",
          transform: "none",
          marginLeft: -20,
          ...(kind === "color"
            ? {
                background: COLOR_WHEEL_GRADIENT,
                width: token.sizeXS + 2,
                height: token.sizeXS + 2,
              }
            : {}),
        },
        label: {
          flex: 1,
        },
      }) satisfies Record<string, React.CSSProperties>,
    [defaultNodeStyle.handle, kind, token.sizeLG, token.sizeXS],
  );

  const tooltipTitle = `${label} → ch ${channels.join(", ")}`;

  return (
    <Tooltip mouseEnterDelay={0.4} placement="left" title={tooltipTitle}>
      <Flex align="center" gap="middle" style={styles.container}>
        <Handle
          id={id}
          isConnectable
          position={Position.Left}
          style={styles.handle}
          type="target"
        />

        <Typography.Text style={styles.label}>{label}</Typography.Text>
      </Flex>
    </Tooltip>
  );
}
