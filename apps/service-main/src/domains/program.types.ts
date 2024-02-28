import type { RunnerControlsState } from "../services/runner.service.types";

export type ProgramCompute = (
  time: number,
  inputs: RunnerControlsState
) => ProgramOutput;

export type ProgramDefinition = {
  compute: ProgramCompute;
  resetAtEnd: boolean;
};

export type ProgramState = {
  time: number;
  output: ProgramOutput;
};

export type ProgramOutput = Record<number, number>;
