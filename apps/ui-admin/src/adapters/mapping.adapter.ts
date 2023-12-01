import type { Edge } from "reactflow";
import type * as models from "@ptah/lib-models";

export const adaptModelMappingToReactFlowEdges = (
  mapping: models.ShowMapping
): Edge[] =>
  Object.entries(mapping).map(
    ([key, programId]) =>
      ({
        id: `${key}-${programId}`,
        source: `key-${key}`,
        target: `program-${programId}`,
      } satisfies Edge)
  );

export const adaptReactFlowEdgesAndToModelMapping = (
  edges: Edge[]
): models.ShowMapping =>
  edges.reduce<models.ShowMapping>(
    (mapping, edge) => ({
      ...mapping,
      [edge.source.replace("key-", "")]: edge.target.replace("program-", ""),
    }),
    {}
  );
