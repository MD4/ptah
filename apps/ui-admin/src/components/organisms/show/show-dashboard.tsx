import * as React from "react";
import type * as models from "@ptah/lib-models";
import type { OnEdgesChange, OnConnect, Node, FitViewOptions } from "reactflow";
import { ReactFlow, applyEdgeChanges, addEdge } from "reactflow";
import type { NodeKeyData } from "../../molecules/nodes/node-key";
import { getKeyFromIndex, isSharpKey } from "../../../domain/key.domain";
import { showNodeTypes } from "../../molecules/nodes";
import { adaptModelMappingToReactFlowEdges } from "../../../adapters/mapping.adapter";
import { adaptModelShowProgramsToReactFlowNodes } from "../../../adapters/show.adapter";

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

const getKeyNodes = (mapping: models.ShowMapping): Node<NodeKeyData>[] => {
  let y = 0;
  let lastWasSharp = false;

  return Object.keys(mapping)
    .map(Number)
    .sort((a, b) => a - b)
    .flatMap((key, index) => {
      const sharp = isSharpKey(key);

      if (lastWasSharp && sharp) {
        y += 36;
      }

      y += sharp && index ? -36 / 2 : 0;

      const result = {
        id: `key-${key}`,
        data: { key, label: getKeyFromIndex(key), sharp },
        position: { x: 0, y },
        type: "node-key",
        zIndex: sharp ? 1 : 0,
      };

      y += sharp ? 36 / 2 : 68;

      lastWasSharp = sharp;

      return result;
    });
}; /*
const getChannelNodes = (patch: models.ShowPatch): Node<NodeChannelData>[] =>
  patch
    .sort((a, b) => a.channel - b.channel)
    .map(({ channel }, index) => ({
      id: `channel-${channel}`,
      data: { label: String(channel) },
      position: { x: 800, y: index * 36 },
      type: "node-channel",
    }));

const getProgramToChannelsEdges = (
  patch: models.ShowPatch,
  color: string
): Edge[] =>
  patch.map(({ programId, programOutput, channel }) => ({
    id: `${programId}-${channel}`,
    source: `program-${programId}`,
    target: `channel-${channel}`,
    sourceHandle: String(programOutput),
    style: {
      stroke: color,
      strokeWidth: 2,
    },
  }));
*/

const proOptions = { hideAttribution: true };

export default function ShowDashboard({
  show,
}: {
  show: models.Show;
}): JSX.Element {
  const initialNodes = [
    ...getKeyNodes(show.mapping),
    ...adaptModelShowProgramsToReactFlowNodes(show.programs, 400),
    //...getChannelNodes(show.patch),
  ];

  const initialEdges = [
    ...adaptModelMappingToReactFlowEdges(show.mapping),
    // ...getProgramToChannelsEdges(show.patch, token.colorTextDescription),
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
        nodeTypes={showNodeTypes}
        nodes={nodes}
        onConnect={onConnect}
        onEdgesChange={onEdgesChange}
        proOptions={proOptions}
      />
    </div>
  );
}
