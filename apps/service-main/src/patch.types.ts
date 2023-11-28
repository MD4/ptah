import type { ProgramDefinition } from "./program.types";

export type PatchMapping = number[];

export type PatchItem = {
  program: ProgramDefinition;
  mapping: PatchMapping;
};

export type Patch = Map<number, PatchItem>;
