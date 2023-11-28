import type { RunnerControlsState } from "./runner.types";

export type Program = (
  time: number,
  inputs: RunnerControlsState
) => ProgramOutput;

export type ProgramDefinition = {
  compute: Program;
  resetAtEnd: boolean;
};

export type ProgramState = {
  time: number;
  output: ProgramOutput;
};

export type ProgramOutput = Record<number, number>;
