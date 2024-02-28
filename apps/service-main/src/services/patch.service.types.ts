import type { PatchMapping } from "../domains/patch.domain.types";
import type { ProgramDefinition } from "../domains/program.types";

export type PatchItem = {
  program: ProgramDefinition;
  mapping: PatchMapping;
};

export type Patch = Map<number, PatchItem>;
