import { noop } from "antd/es/_util/warning";
import * as React from "react";
import { Position } from "reactflow";

import { Flex, InputNumber, theme } from "antd";

import HandleInputWithLimit from "./handle-input-with-limit";
import { useDefaultNodeStyle } from "../nodes/node.style";

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
}): JSX.Element {
  const { token } = useToken();
  const defaultNodeStyle = useDefaultNodeStyle();
  const [isConnected, setIsConnected] = React.useState(false);
  const styles = React.useMemo(
    (): Record<string, React.CSSProperties> => ({
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
      },
      input: {
        minWidth: 58,
        width: "min-content",
      },
    }),
    [defaultNodeStyle.handle, token.sizeLG],
  );

  const onHandleConnect = React.useCallback(() => {
    setIsConnected(true);
  }, []);

  const onHandleDisconnect = React.useCallback(() => {
    setIsConnected(false);
  }, []);

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
        onConnect={onHandleConnect}
        onDisconnect={onHandleDisconnect}
        position={Position.Left}
        style={styles.handle}
        type="target"
      />

      <div style={styles.label}>{label}</div>

      {isConnected ? (
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
