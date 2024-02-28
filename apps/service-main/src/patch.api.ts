import type { Program, Show, ShowPatch } from "@ptah/lib-models";
import type { Patch, PatchItem } from "./patch.types";
import { compile } from "./program.api";

const patch: Patch = new Map();

export const reset = (): void => {
  patch.clear();
};

export const getFromId = (id: number): PatchItem | undefined => {
  return patch.get(id);
};

const extractProgramMappingFromShowPatch = (
  showPatch: ShowPatch,
  programId: string
): number[] =>
  Object.entries(showPatch)
    .flatMap(([channel, outputs]) =>
      outputs.map((output) => ({ ...output, channel }))
    )
    .filter((output) => output.programId === programId)
    .sort((a, b) => a.programOutput - b.programOutput)
    .map(({ channel }) => Number(channel));

export const loadMapping = (show: Show, programs: Program[]): void => {
  reset();

  Object.entries(show.mapping).forEach(([key, programId]) => {
    const programName = Object.entries(show.programs).find(
      ([id]) => id === programId
    )?.[1];

    const program = programs.find(({ name }) => name === programName);

    if (program) {
      patch.set(Number(key), {
        mapping: extractProgramMappingFromShowPatch(show.patch, programId),
        program: {
          resetAtEnd: true,
          compute: compile(program),
        },
      });
    }
  });
};
