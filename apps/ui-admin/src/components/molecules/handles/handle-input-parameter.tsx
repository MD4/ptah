import { Position, useNodeConnections, useNodeId } from "@xyflow/react";
import { Flex, InputNumber, Typography, theme } from "antd";
import { noop } from "antd/es/_util/warning";
import * as React from "react";

import { useDefaultNodeStyle } from "../nodes/node.style";
import HandleInputWithLimit from "./handle-input-with-limit";

const { useToken } = theme;

export default function HandleParameter({
  id,
  label,
  onChange = noop,
  defaultValue = 0,
  min,
  max,
  step,
}: {
  id: number;
  label: string;
  onChange?: (value: number) => void;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
}) {
  const { token } = useToken();
  const defaultNodeStyle = useDefaultNodeStyle();
  const nodeId = useNodeId();
  const isConnected = useNodeConnections({
    id: nodeId ?? undefined,
  }).some(
    (connection) =>
      connection.targetHandle === String(id) && connection.target === nodeId,
  );

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
        },
        label: {
          flex: 1,
          minHeight: 26,
        },
        input: {
          minWidth: 58,
          width: "min-content",
        },
      }) satisfies Record<string, React.CSSProperties>,
    [defaultNodeStyle.handle, token.sizeLG],
  );

  const onValueChange = React.useCallback<(value: number | null) => void>(
    (value) => {
      if (value !== null) {
        onChange(value);
      }
    },
    [onChange],
  );

  return (
    <Flex align="center" gap="middle" style={styles.container}>
      <HandleInputWithLimit
        id={String(id)}
        isConnectable={1}
        position={Position.Left}
        style={styles.handle}
        type="target"
      />

      <Typography.Text style={styles.label}>{label}</Typography.Text>

      {!isConnected ? (
        <InputNumber
          className="nodrag nopan"
          defaultValue={defaultValue}
          max={max}
          min={min}
          onChange={onValueChange}
          size="small"
          step={step}
          style={styles.input}
        />
      ) : null}
    </Flex>
  );
}
