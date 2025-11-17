import type {
  patch as patchDomain,
  program as programDomain,
} from "@ptah-app/lib-domains";

export type PatchStateItem = {
  program: programDomain.ProgramDefinition;
  mapping: patchDomain.PatchMapping;
};

export type PatchState = Map<number, PatchStateItem>;
