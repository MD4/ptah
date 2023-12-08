import { theme } from "antd";
import * as React from "react";
import type {
  Edge,
  HandleProps,
  NodeInternals,
  ReactFlowState,
} from "reactflow";
import { getConnectedEdges, Handle, useNodeId, useStore } from "reactflow";

const { useToken } = theme;

const selector = (
  s: ReactFlowState
): {
  nodeInternals: NodeInternals;
  edges: Edge[];
} => ({
  nodeInternals: s.nodeInternals,
  edges: s.edges,
});

type HandleInputWithLimitProps = Omit<HandleProps, "isConnectable"> & {
  isConnectable: number;
  style: React.CSSProperties;
  onConnect?: () => void;
  onDisconnect?: () => void;
};

export default function HandleInputWithLimit(
  props: HandleInputWithLimitProps
): JSX.Element {
  const { token } = useToken();
  const { nodeInternals, edges } = useStore(selector);
  const nodeId = useNodeId();

  const connectedStyle = React.useMemo(
    (): React.CSSProperties => ({
      ...props.style,
      border: "none",
      background: token.colorTextDescription,
    }),
    [props.style, token.colorTextDescription]
  );

  const isHandleConnectable = React.useMemo(() => {
    if (typeof props.isConnectable === "number" && nodeId) {
      const node = nodeInternals.get(nodeId);

      if (!node) return false;

      const connectedEdges = getConnectedEdges([node], edges).filter(
        (edge) => edge.targetHandle === props.id && edge.target === nodeId
      );

      return connectedEdges.length < props.isConnectable;
    }

    return props.isConnectable;
  }, [edges, nodeId, nodeInternals, props.id, props.isConnectable]);

  React.useEffect(() => {
    if (isHandleConnectable && props.onConnect) {
      props.onConnect();
    } else if (!isHandleConnectable && props.onDisconnect) {
      props.onDisconnect();
    }
  }, [isHandleConnectable, props]);

  return (
    <Handle
      {...props}
      isConnectable={isHandleConnectable}
      style={isHandleConnectable ? props.style : connectedStyle}
    />
  );
}
