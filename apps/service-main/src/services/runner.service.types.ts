import type {
  patch as patchDomain,
  program as programDomain,
} from "@ptah/lib-domains";

export type RunnerProgramsState = Map<
  number,
  {
    program: programDomain.ProgramDefinition;
    programState: programDomain.ProgramState;
    mapping: patchDomain.PatchMapping;
  }
>;

export type RunnerControlsState = Map<number, number>;
