import type {
  patch as patchDomain,
  program as programDomain,
} from "@ptah-app/lib-domains";

export type RunnerProgramsState = Map<
  number,
  {
    program: programDomain.ProgramDefinition;
    programState: programDomain.ProgramState;
    mapping: patchDomain.PatchMapping;
    parameter: number;
  }
>;

export type RunnerControlsState = Map<number, number>;
