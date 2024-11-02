import type * as models from "@ptah/lib-models";
import type { Edge } from "reactflow";

export const adaptModelEdgesToReactFlowEdges = (edges: models.Edge[]): Edge[] =>
  edges.map(adaptModelEdgeToReactFlowEdge);

export const adaptModelEdgeToReactFlowEdge = ({
  id,
  source,
  target,
  sourceOutput,
  targetIntput,
}: models.Edge): Edge => ({
  id,
  source,
  target,
  sourceHandle: String(sourceOutput),
  targetHandle: String(targetIntput),
});

export const adaptReactFlowEdgesToModelEdges = (edges: Edge[]): models.Edge[] =>
  edges.map(adaptReactFlowEdgeToModelEdge);

export const adaptReactFlowEdgeToModelEdge = ({
  id,
  source,
  target,
  sourceHandle,
  targetHandle,
}: Edge): models.Edge => ({
  id,
  source,
  target,
  sourceOutput: Number(sourceHandle),
  targetIntput: Number(targetHandle),
});
