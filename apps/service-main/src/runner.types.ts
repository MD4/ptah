import type { PatchMapping } from "./patch.types";
import type { ProgramDefinition, ProgramState } from "./program.types";

export type RunnerProgramsState = Map<
  number,
  {
    program: ProgramDefinition;
    programState: ProgramState;
    mapping: PatchMapping;
  }
>;

export type RunnerControlsState = Map<number, number>;
