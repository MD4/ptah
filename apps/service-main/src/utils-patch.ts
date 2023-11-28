import type { PatchMapping } from "./patch.types";
import type { ProgramOutput } from "./program.types";

export const toChannelValue = (value: number): number =>
  Math.min(Math.max(Math.round(value * 255), 0), 255);

export const fromChannelValue = (value: number): number =>
  Math.min(Math.max(Math.round(value / 255), 0), 1);

export const applyMapping = (
  programOutput: ProgramOutput,
  mapping: PatchMapping
): ProgramOutput => {
  return mapping.reduce<ProgramOutput>(
    (mappedOutput, targetIndex, outputIndex) => {
      mappedOutput[targetIndex] = toChannelValue(programOutput[outputIndex]);

      return mappedOutput;
    },
    {}
  );
};
