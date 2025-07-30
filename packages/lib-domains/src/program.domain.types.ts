import type { PatchMapping } from "./patch.domain.types";
import type { RunnerControlsState } from "./runner.domain.types";

export type ProgramCompute = (
  time: number,
  inputs: RunnerControlsState,
) => ProgramOutput;

export type ProgramDefinition = {
  compute: ProgramCompute;
  resetAtEnd: boolean;
};

export type ProgramState = {
  time: number;
  output: ProgramOutput;
};

export type PatchItem = {
  program: ProgramDefinition;
  mapping: PatchMapping;
};

export type Patch = Map<number, PatchItem>;

export type ProgramOutputOuputs = Record<number, number>;
export type ProgramOutputRegistry = Map<string, number[]>;

export type ProgramOutput = {
  outputs: ProgramOutputOuputs;
  registry: ProgramOutputRegistry;
};
