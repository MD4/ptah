import type * as models from "@ptah/lib-models";
import type { Edge, Node } from "reactflow";

import type { NodeChannelData } from "../components/molecules/nodes/node-channel";

export const adaptModelShowPatchToReactFlowNodes = (
  patch: models.ShowPatch,
  x = 800,
): Node<NodeChannelData>[] =>
  Object.keys(patch)
    .map(Number)
    .sort((a, b) => a - b)
    .map((channel, index) => ({
      id: `channel-${String(channel)}`,
      data: { label: String(channel) },
      position: { x, y: index * (36 + 4) },
      type: "node-channel",
      selectable: false,
    }));

export const adaptModelShowPatchToToReactFlowEdges = (
  patch: models.ShowPatch,
): Edge[] =>
  Object.entries(patch).flatMap(([channel, programs]) =>
    programs.map(({ programId, programOutput }) => ({
      id: `${programId}-${channel}`,
      source: `program-${programId}`,
      target: `channel-${channel}`,
      sourceHandle: String(programOutput),
    })),
  );

export const adaptReactFlowEdgesAndToModelPatch = (
  edges: Edge[],
): models.ShowPatch =>
  edges.reduce<models.ShowPatch>((patch, edge) => {
    const channel = edge.target.replace("channel-", "");
    const programId = edge.source.replace("program-", "");

    return {
      ...patch,
      [channel]: [
        ...(patch[channel] ?? []),
        { programId, programOutput: Number(edge.sourceHandle) },
      ],
    };
  }, {});
