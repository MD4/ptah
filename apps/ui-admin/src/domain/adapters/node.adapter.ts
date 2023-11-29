import type { Node } from "reactflow";
import type * as models from "@ptah/lib-models";

export const adaptModelNodesToReactFlowNodes = (
  nodes: models.Node[]
): Node<models.Node>[] => nodes.map(adaptModelNodeToReactFlowNode);

export const adaptModelNodeToReactFlowNode = (
  node: models.Node
): Node<models.Node> => ({
  id: node.id,
  data: node,
  position: node.position,
  type: node.type,
});

export const adaptReactFlowNodesToModelNodes = (Nodes: Node[]): models.Node[] =>
  Nodes.map(adaptReactFlowNodeToModelNode);

export const adaptReactFlowNodeToModelNode = ({
  data,
  position,
}: Node<models.Node>): models.Node => ({ ...data, position });
