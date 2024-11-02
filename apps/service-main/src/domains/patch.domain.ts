import type { ShowPatch } from "@ptah/lib-models";

import type { PatchMapping } from "./patch.domain.types";
import type { ProgramOutput } from "./program.types";

export const extractProgramMappingFromShowPatch = (
  showPatch: ShowPatch,
  programId: string,
): number[] =>
  Object.entries(showPatch)
    .flatMap(([channel, outputs]) =>
      outputs.map((output) => ({ ...output, channel })),
    )
    .filter((output) => output.programId === programId)
    .sort((a, b) => a.programOutput - b.programOutput)
    .map(({ channel }) => Number(channel));

export const unNaNifyValue = (value: number): number =>
  isNaN(value) ? 0 : value;

export const unInfinitifyValue = (value: number): number => {
  if (value === Infinity) {
    return 255;
  } else if (value === -Infinity) {
    return 0;
  } else if (!isFinite(value)) {
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
): ProgramOutput => {
  return mapping.reduce<ProgramOutput>(
    (mappedOutput, targetIndex, outputIndex) => {
      mappedOutput[targetIndex] = toChannelValue(programOutput[outputIndex]);

      return mappedOutput;
    },
    {},
  );
};
