import type { Connection, Edge, Node } from "@xyflow/react";
import { getOutgoers } from "@xyflow/react";

export const hasNoCircularDependencies = (
  connection: Edge | Connection,
  nodes: Node[],
  edges: Edge[],
): boolean => {
  const target = nodes.find((node) => node.id === connection.target);

  if (!target) {
    return false;
  }

  const hasCycle = (node: Node, visited = new Set()): boolean => {
    if (visited.has(node.id)) return false;

    visited.add(node.id);

    for (const outgoer of getOutgoers(node, nodes, edges)) {
      if (outgoer.id === connection.source) return true;
      if (hasCycle(outgoer, visited)) return true;
    }

    return false;
  };

  if (target.id === connection.source) return false;
  return !hasCycle(target);
};
