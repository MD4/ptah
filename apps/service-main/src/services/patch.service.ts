import type { Program, Show } from "@ptah/lib-models";

import type { Patch, PatchItem } from "./patch.service.types";
import { extractProgramMappingFromShowPatch } from "../domains/patch.domain";
import { compile } from "../domains/program.domain";

const patch: Patch = new Map();

export const reset = (): void => {
  patch.clear();
};

export const getFromId = (id: number): PatchItem | undefined => {
  return patch.get(id);
};

export const loadMapping = (show: Show, programs: Program[]): void => {
  reset();

  Object.entries(show.mapping).forEach(([key, programId]) => {
    const programName = Object.entries(show.programs).find(
      ([id]) => id === programId,
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
