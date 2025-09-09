import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { Flex, Typography, theme } from "antd";
import * as React from "react";

import { useSystemState } from "../../../domain/system.domain";
import { useDefaultNodeStyle } from "./node.style";

const { useToken } = theme;

export type NodeKeyData = {
  key: number;
  label: string;
  sharp: boolean;
};

const NodeKeyInternal = React.memo(function NodeKeyInternal({
  data: { key, label, sharp },
  selected,
  pressed,
}: NodeProps<Node<NodeKeyData>> & { pressed: boolean }) {
  const { token } = useToken();
  const defaultStyles = useDefaultNodeStyle("default", selected);

  const styles = React.useMemo(() => {
    const background = pressed ? token.colorPrimary : token.colorFillQuaternary;
    const sharpBackground = pressed
      ? token.colorPrimaryActive
      : token.colorBgContainer;

    return {
      ...defaultStyles,
      container: {
        ...defaultStyles.container,
        borderTopRightRadius: token.borderRadiusLG * 2,
        borderBottomRightRadius: token.borderRadiusLG * 2,
        borderTopLeftRadius: token.borderRadiusSM,
        borderBottomLeftRadius: token.borderRadiusSM,
        background: sharp ? sharpBackground : background,
        minHeight: 0,
        height: sharp ? "32px" : "64px",
        width: sharp ? "160px" : "240px",
      },
      label: {
        ...defaultStyles.label,
        width: "auto",
      },
    } satisfies Record<string, React.CSSProperties>;
  }, [
    defaultStyles,
    pressed,
    sharp,
    token.borderRadiusLG,
    token.borderRadiusSM,
    token.colorBgContainer,
    token.colorFillQuaternary,
    token.colorPrimary,
    token.colorPrimaryActive,
  ]);

  return (
    <Flex
      align="center"
      gap="small"
      justify="flex-end"
      style={styles.container}
    >
      <div style={styles.label}>{label}</div>
      <Typography.Text code>{key}</Typography.Text>
      {/** biome-ignore lint/correctness/useUniqueElementIds: need to be "output" */}
      <Handle
        id="output"
        isConnectable
        position={Position.Right}
        style={styles.handle}
        type="source"
      />
    </Flex>
  );
});

export default function NodeKey(props: NodeProps<Node<NodeKeyData>>) {
  const { keysPressed } = useSystemState();

  const pressed = React.useMemo(
    () => keysPressed.includes(props.data.key),
    [keysPressed, props.data.key],
  );

  return <NodeKeyInternal {...props} pressed={pressed} />;
}
