import type { Edge, Node } from "reactflow";
import type * as models from "@ptah/lib-models";
import type { NodeKeyData } from "../components/molecules/nodes/node-key";
import { isSharpKey, getKeyFromIndex } from "../domain/key.domain";

export const adaptModelMappingToReactFlowEdges = (
  mapping: models.ShowMapping
): Edge[] =>
  Object.entries(mapping).map(
    ([key, programId]) =>
      ({
        id: `${key}-${programId}`,
        source: `key-${key}`,
        target: `program-${programId}`,
      }) satisfies Edge
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

export const adaptModelMappingToReactFlowEdgesNodes = (
  mapping: models.ShowMapping,
  x = 0
): Node<NodeKeyData>[] => {
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

      const result: Node<NodeKeyData> = {
        id: `key-${String(key)}`,
        data: { key, label: getKeyFromIndex(key), sharp },
        position: { x, y },
        type: "node-key",
        zIndex: sharp ? 2 : 1,
        selectable: false,
      };

      y += sharp ? 36 / 2 : 68;

      lastWasSharp = sharp;

      return result;
    });
};
