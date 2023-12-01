import type { Node } from "reactflow";
import type * as models from "@ptah/lib-models";
import type { NodeProgramData } from "../components/molecules/nodes/node-program";

export const adaptModelShowProgramsToReactFlowNodes = (
  programs: models.ShowPrograms,
  x = 700
): Node<NodeProgramData>[] =>
  Object.entries(programs).map(([programId, programName], index) => ({
    id: `program-${programId}`,
    data: { programId, programName },
    position: { x, y: index * (96 + 8) },
    type: "node-program",
  }));

export const adaptReactFlowNodesToModelShowPrograms = (
  nodes: Node<NodeProgramData>[]
): models.ShowPrograms =>
  nodes.reduce<models.ShowPrograms>(
    (memo, node) =>
      node.type === "node-program"
        ? { ...memo, [node.id.replace("program-", "")]: node.data.programName }
        : memo,
    {}
  );
