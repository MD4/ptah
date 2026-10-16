import type { Connection, Edge, Node } from "@xyflow/react";
import { getOutgoers } from "@xyflow/react";

import type { ProgramOutputKind } from "../adapters/show.adapter";
import type { NodeFixtureData } from "../components/molecules/nodes/node-fixture";
import type { NodeProgramData } from "../components/molecules/nodes/node-program";
import { capabilityToHandleId } from "../domain/fixture.domain";

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

export const getCapabilityKindFromHandleId = (
  handleId: string,
): ProgramOutputKind => (handleId === "color" ? "color" : "scalar");

/**
 * A patch wire is valid when it runs from an existing program output to an
 * existing fixture capability of the same kind (color↔color, scalar↔scalar).
 */
export const isValidPatchConnection = (
  connection: Edge | Connection,
  nodes: Node[],
): boolean => {
  const source = nodes.find((node) => node.id === connection.source);
  const target = nodes.find((node) => node.id === connection.target);

  if (source?.type !== "node-program" || target?.type !== "node-fixture") {
    return false;
  }
  if (!connection.sourceHandle || !connection.targetHandle) {
    return false;
  }

  const output = (source.data as NodeProgramData).outputs.find(
    ({ outputId }) => String(outputId) === connection.sourceHandle,
  );

  if (!output) {
    return false;
  }

  const { capabilities } = target.data as NodeFixtureData;
  const targetHandle = connection.targetHandle;

  if (
    !capabilities.some(
      ({ capability }) => capabilityToHandleId(capability) === targetHandle,
    )
  ) {
    return false;
  }

  return output.kind === getCapabilityKindFromHandleId(targetHandle);
};
