import type * as models from "@ptah-app/lib-models";
import { noop } from "@ptah-app/lib-utils";
import type { Node } from "@xyflow/react";

import type { NodeAddProgramData } from "../components/molecules/nodes/node-add-program";
import type { NodeProgramData } from "../components/molecules/nodes/node-program";
import { isOutputNode } from "../domain/node.domain";

export type ProgramOutputKind = "scalar" | "color";

export type ProgramOutputDescriptor = {
  outputId: number;
  kind: ProgramOutputKind;
};

export const getProgramOutputs = (
  program?: models.Program,
): ProgramOutputDescriptor[] =>
  (program?.nodes ?? [])
    .filter(isOutputNode)
    .map((node) => ({
      outputId: node.outputId,
      kind: node.type === "output-color" ? ("color" as const) : ("scalar" as const),
    }))
    .sort((a, b) => a.outputId - b.outputId);

export const getProgramOutputCount = (program?: models.Program): number =>
  getProgramOutputs(program).length;

export const getProgramHeight = (outputCount: number): number =>
  90 + Math.max(outputCount, 0) * 24;

export const adaptModelShowProgramsToReactFlowNodes = (
  programs: models.ShowPrograms,
  programsDefinitions: models.Program[] = [],
  x = 700,
  addButton = false,
  openProgramModal = noop,
  noInput = false,
): Node<NodeProgramData | NodeAddProgramData>[] => {
  let y = 0;

  const nodes = Object.entries(programs).map(([programId, programName]) => {
    const outputs = getProgramOutputs(
      programsDefinitions.find((program) => program.name === programName),
    );

    const newNode: Node<NodeProgramData> = {
      id: `program-${programId}`,
      data: {
        programId,
        programName,
        outputs,
        noInput,
      },
      position: { x, y },
      type: "node-program",
    };

    y += getProgramHeight(outputs.length - 1) + 8;

    return newNode;
  });

  if (addButton) {
    const addNode: Node<NodeAddProgramData> = {
      id: "add-program",
      data: { onAddProgram: openProgramModal },
      position: { x, y },
      type: "node-add-program",
    };

    return [...nodes, addNode];
  }

  return nodes;
};

export const adaptReactFlowNodesToModelShowPrograms = (
  nodes: Node[],
): models.ShowPrograms =>
  nodes.reduce<models.ShowPrograms>(
    (memo, node) =>
      node.type === "node-program"
        ? {
            ...memo,
            [node.id.replace("program-", "")]: (node.data as NodeProgramData)
              .programName,
          }
        : memo,
    {},
  );
