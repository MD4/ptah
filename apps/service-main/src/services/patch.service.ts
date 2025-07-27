import {
  patch as patchDomain,
  program as programDomain,
} from "@ptah/lib-domains";
import type { Program, Show } from "@ptah/lib-models";
import type { PatchState, PatchStateItem } from "./patch.service.types";

const patch: PatchState = new Map();

export const reset = (): void => {
  patch.clear();
};

export const getFromId = (id: number): PatchStateItem | undefined => {
  return patch.get(id);
};

export const loadMapping = (show: Show, programs: Program[]): void => {
  reset();

  for (const [key, programId] of Object.entries(show.mapping)) {
    const programName = Object.entries(show.programs).find(
      ([id]) => id === programId,
    )?.[1];

    const program = programs.find(({ name }) => name === programName);

    if (program) {
      patch.set(Number(key), {
        mapping: patchDomain.extractProgramMappingFromShowPatch(
          show.patch,
          programId,
        ),
        program: {
          resetAtEnd: true,
          compute: programDomain.compile(program),
        },
      });
    }
  }
};
