import type { ShowPatch } from "@ptah/lib-models";

import type { PatchMapping } from "./patch.domain.types";
import type {
  ProgramOutput,
  ProgramOutputOuputs,
} from "./program.domain.types";

export type * from "./patch.domain.types";

export const extractProgramMappingFromShowPatch = (
  showPatch: ShowPatch,
  programId: string,
): PatchMapping =>
  Object.entries(showPatch)
    .flatMap(([channel, outputs]) =>
      outputs.map((output) => ({ ...output, channel })),
    )
    .filter((output) => output.programId === programId)
    .sort((a, b) => a.programOutput - b.programOutput)
    .reduce<PatchMapping>(
      (patchMapping, { channel, programOutput }) => ({
        ...patchMapping,
        [Number(programOutput)]: [
          ...(patchMapping[Number(programOutput)] ?? []),
          Number(channel),
        ],
      }),
      {},
    );

export const unNaNifyValue = (value: number): number =>
  Number.isNaN(value) ? 0 : value;

export const unInfinitifyValue = (value: number): number => {
  if (value === Number.POSITIVE_INFINITY) {
    return 255;
  }
  if (value === Number.NEGATIVE_INFINITY) {
    return 0;
  }
  if (!Number.isFinite(value)) {
    return 0;
  }

  return value;
};

export const capValue = (value: number): number =>
  Math.min(Math.max(Math.round(value * 255), 0), 255);

export const toChannelValue = (value: number): number =>
  capValue(unInfinitifyValue(unNaNifyValue(value)));

export const fromChannelValue = (value: number): number =>
  Math.min(Math.max(Math.round(value / 255), 0), 1);

export const applyMapping = (
  programOutput: ProgramOutput,
  mapping: PatchMapping,
): ProgramOutputOuputs =>
  Object.entries(mapping).reduce<ProgramOutputOuputs>(
    (mappedOutput, [outputIndex, targetIndexes]) =>
      targetIndexes.reduce(
        (mappedOutputInner, targetIndex) => ({
          ...mappedOutputInner,
          [targetIndex]: toChannelValue(
            programOutput.outputs[Number(outputIndex)],
          ),
        }),
        mappedOutput,
      ),
    {},
  );
