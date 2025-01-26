import type * as models from "@ptah/lib-models";
import type { Node } from "reactflow";

import type { NodeProgramData } from "../components/molecules/nodes/node-program";
import { getProgramHeight, getProgramOutputCount } from "./show.adapter";

export const adaptModelNodesToReactFlowNodes = (
  nodes: models.Node[],
): Node<models.Node>[] => nodes.map(adaptModelNodeToReactFlowNode);

export const adaptModelNodeToReactFlowNode = (
  node: models.Node,
): Node<models.Node> => ({
  id: node.id,
  data: node,
  position: node.position,
  type: node.type,
});

export const adaptReactFlowNodesToModelNodes = (nodes: Node[]): models.Node[] =>
  nodes.map(adaptReactFlowNodeToModelNode);

export const adaptReactFlowNodeToModelNode = ({
  data,
  position,
}: Node<models.Node>): models.Node => ({ ...data, position });

export const repositionProgramNodes = (
  nodes: Node[],
  programsDefinitions: models.Program[] = [],
): Node[] => {
  let y = 0;

  return nodes
    .map((_node) => {
      if (_node.type !== "node-program") {
        return _node;
      }

      const outputsCount = getProgramOutputCount(
        programsDefinitions.find(
          (program) =>
            program.name === (_node.data as NodeProgramData).programName,
        ),
      );

      const newNode = {
        ..._node,
        position: { ..._node.position, y },
      };

      y += getProgramHeight(outputsCount - 1) + 8;

      return newNode;
    })
    .map((_node) =>
      _node.type === "node-add-program"
        ? { ..._node, position: { ..._node.position, y } }
        : _node,
    );
};
