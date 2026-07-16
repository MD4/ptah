import type * as models from "@ptah-app/lib-models";
import type { Edge, Node } from "@xyflow/react";

import {
  capabilityToHandleId,
  handleIdToCapability,
} from "../domain/fixture.domain";
import { isValidPatchConnection } from "../utils/connection";

export const adaptModelShowPatchToToReactFlowEdges = (
  patch: models.ShowPatch,
): Edge[] =>
  patch.map((entry) => {
    const targetHandle = capabilityToHandleId(entry.capability);

    return {
      id: `${entry.programId}:${entry.outputId}:${entry.outputKind}->${entry.fixtureId}:${targetHandle}`,
      source: `program-${entry.programId}`,
      target: `fixture-${entry.fixtureId}`,
      sourceHandle: String(entry.outputId),
      targetHandle,
    };
  });

export const adaptReactFlowEdgesAndToModelPatch = (
  edges: Edge[],
): models.ShowPatch =>
  edges.reduce<models.ShowPatch>((patch, edge) => {
    if (!edge.sourceHandle || !edge.targetHandle) {
      return patch;
    }

    const capability = handleIdToCapability(edge.targetHandle);

    if (!capability) {
      return patch;
    }

    const programId = edge.source.replace("program-", "");
    const fixtureId = edge.target.replace("fixture-", "");
    const outputId = Number(edge.sourceHandle);

    // The output kind mirrors the capability kind: kind-mismatched wires are
    // rejected at connect time and sanitized away on load.
    const entry: models.ShowPatchEntry =
      capability.type === "color"
        ? { programId, outputKind: "color", outputId, fixtureId, capability }
        : { programId, outputKind: "scalar", outputId, fixtureId, capability };

    return [...patch, entry];
  }, []);

/** Drop edges whose program output or fixture capability no longer matches. */
export const sanitizePatchEdges = (edges: Edge[], nodes: Node[]): Edge[] =>
  edges.filter((edge) => isValidPatchConnection(edge, nodes));
