import { Flex, InputNumber } from "antd";
import * as React from "react";
import { Position } from "reactflow";
import { useDefaultNodeStyle } from "./node.style";
import HandleWithLimit from "./handle-with-limit";

export default function Parameter({
  id,
  label,
  defaultValue = 0,
  min,
  max,
  step,
}: {
  id: number;
  label: string;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
}): JSX.Element {
  const defaultNodeStyle = useDefaultNodeStyle();
  const [isConnected, setIsConnected] = React.useState(false);
  const styles = React.useMemo(
    (): Record<string, React.CSSProperties> => ({
      container: {
        minHeight: 24,
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
        minWidth: 64,
        width: "min-content",
      },
    }),
    [defaultNodeStyle]
  );

  const onHandleConnect = React.useCallback(() => {
    setIsConnected(true);
  }, []);

  const onHandleDisconnect = React.useCallback(() => {
    setIsConnected(false);
  }, []);

  return (
    <Flex align="center" gap="small" style={styles.container}>
      <HandleWithLimit
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
          defaultValue={defaultValue}
          max={max}
          min={min}
          size="small"
          step={step}
          style={styles.input}
        />
      ) : null}
    </Flex>
  );
}
