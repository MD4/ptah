import * as React from "react";
import type * as models from "@ptah/lib-models";
import type {
  OnEdgesChange,
  OnConnect,
  Edge,
  Node,
  FitViewOptions,
} from "reactflow";
import { ReactFlow, applyEdgeChanges, addEdge } from "reactflow";
import { theme } from "antd";
import type { NodeKeyData } from "../../molecules/nodes/node-key";
import { getKeyFromIndex, isSharpKey } from "../../../domain/key.domain";
import type { NodeProgramData } from "../../molecules/nodes/node-program";
import { deduplicate } from "../../../utils/array.utils";
import type { NodeChannelData } from "../../molecules/nodes/node-channel";
import { showNodeTypes } from "../../molecules/nodes";

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: "100%",
    height: "100%",
    animation: "animationEnterLeftToRight 200ms",
  },
};

const fitViewOptions: FitViewOptions = {
  padding: 1,
  minZoom: 1,
  maxZoom: 1,
};

const nodeTypes = showNodeTypes;

const getKeyNodes = (mapping: models.ShowMapping): Node<NodeKeyData>[] => {
  let y = 0;

  return Object.keys(mapping)
    .map(Number)
    .sort((a, b) => b - a)
    .flatMap((key) => {
      const sharp = isSharpKey(key);

      const result = {
        id: `key-${key}`,
        data: { label: `[${key}] ${getKeyFromIndex(key)}`, sharp },
        position: { x: 0, y },
        type: "node-key",
      };

      y += sharp ? 36 : 68;

      return result;
    });
};

const getProgramNodes = (
  mapping: models.ShowMapping
): Node<NodeProgramData>[] =>
  deduplicate(Object.values(mapping)).map((programId, index) => ({
    id: `program-${programId}`,
    data: { label: programId },
    position: { x: 400, y: index * 68 },
    type: "node-program",
  }));

const getChannelNodes = (patch: models.ShowPatch): Node<NodeChannelData>[] =>
  patch
    .sort((a, b) => a.channel - b.channel)
    .map(({ channel }, index) => ({
      id: `channel-${channel}`,
      data: { label: String(channel) },
      position: { x: 800, y: index * 36 },
      type: "node-channel",
    }));

const getKeyToProgramEdges = (
  mapping: models.ShowMapping,
  color: string
): Edge[] =>
  Object.entries(mapping).map(([key, programId]) => ({
    id: `${key}-${programId}`,
    source: `key-${key}`,
    target: `program-${programId}`,
    style: {
      stroke: color,
      strokeWidth: 2,
    },
  }));

const getProgramToChannelsEdges = (
  patch: models.ShowPatch,
  color: string
): Edge[] =>
  patch.map(({ programId, outputIndex, channel }) => ({
    id: `${programId}-${channel}`,
    source: `program-${programId}`,
    target: `channel-${channel}`,
    sourceHandle: String(outputIndex),
    style: {
      stroke: color,
      strokeWidth: 2,
    },
  }));

const proOptions = { hideAttribution: true };

const { useToken } = theme;

export default function ShowDashboard({
  show,
}: {
  show: models.Show;
}): JSX.Element {
  const { token } = useToken();

  const initialNodes = [
    ...getKeyNodes(show.mapping),
    ...getProgramNodes(show.mapping),
    ...getChannelNodes(show.patch),
  ];

  const initialEdges = [
    ...getKeyToProgramEdges(show.mapping, token.colorTextDescription),
    ...getProgramToChannelsEdges(show.patch, token.colorTextDescription),
  ];

  const [nodes] = React.useState(initialNodes);
  const [edges, setEdges] = React.useState(initialEdges);

  const onEdgesChange = React.useCallback<OnEdgesChange>((changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onConnect = React.useCallback<OnConnect>((params) => {
    setEdges((eds) => addEdge(params, eds));
  }, []);

  return (
    <div style={styles.container}>
      <ReactFlow
        edges={edges}
        fitView
        fitViewOptions={fitViewOptions}
        nodeTypes={nodeTypes}
        nodes={nodes}
        onConnect={onConnect}
        onEdgesChange={onEdgesChange}
        proOptions={proOptions}
      />
    </div>
  );
}
