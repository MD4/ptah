import type { PatchMapping } from "../domains/patch.domain.types";
import type { ProgramDefinition, ProgramState } from "../domains/program.types";

export type RunnerProgramsState = Map<
  number,
  {
    program: ProgramDefinition;
    programState: ProgramState;
    mapping: PatchMapping;
  }
>;

export type RunnerControlsState = Map<number, number>;
