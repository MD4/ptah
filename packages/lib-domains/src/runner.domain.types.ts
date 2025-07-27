import type { PatchMapping } from "./patch.domain.types";
import type { ProgramDefinition, ProgramState } from "./program.domain.types";

export type RunnerProgramsState = Map<
  number,
  {
    program: ProgramDefinition;
    programState: ProgramState;
    mapping: PatchMapping;
  }
>;

export type RunnerControlsState = Map<number, number>;
