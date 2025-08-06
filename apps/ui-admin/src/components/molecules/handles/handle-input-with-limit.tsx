import type { HandleProps } from "@xyflow/react";
import { Handle, useNodeConnections } from "@xyflow/react";
import { theme } from "antd";
import * as React from "react";

const { useToken } = theme;

type HandleInputWithLimitProps = Omit<HandleProps, "isConnectable"> & {
  isConnectable: number;
  style: React.CSSProperties;
  onConnect?: () => void;
  onDisconnect?: () => void;
};

export default function HandleInputWithLimit({
  onDisconnect,
  ...props
}: HandleInputWithLimitProps) {
  const { token } = useToken();
  const connections = useNodeConnections({
    handleType: props.type,
  });

  const connectedStyle = React.useMemo(
    (): React.CSSProperties => ({
      ...props.style,
      border: "none",
      background: token.colorTextDescription,
    }),
    [props.style, token.colorTextDescription],
  );

  const isHandleConnectable = React.useMemo(
    () => connections.length < props.isConnectable,
    [connections.length, props.isConnectable],
  );

  return (
    <Handle
      {...props}
      isConnectable={isHandleConnectable}
      style={isHandleConnectable ? props.style : connectedStyle}
    />
  );
}
