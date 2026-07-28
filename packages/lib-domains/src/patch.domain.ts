import type { ShowFixtures, ShowPatch } from "@ptah-app/lib-models";
import {
  getFixtureProfile,
  resolveCapabilityChannelIndexes,
} from "@ptah-app/lib-models";

import type { PatchMapping } from "./patch.domain.types";
import type {
  ProgramOutput,
  ProgramOutputOuputs,
} from "./program.domain.types";

export type * from "./patch.domain.types";

export const emptyPatchMapping = (): PatchMapping => ({
  scalar: {},
  color: {},
});

/**
 * Resolve a show's fixtures + patch into physical DMX channel addresses for
 * one program. Entries referencing unknown fixtures, unknown profiles or
 * capabilities the profile does not offer are silently skipped (same
 * tolerance the legacy channel patch had for dangling programIds).
 */
export const compileShowPatch = (
  fixtures: ShowFixtures,
  patch: ShowPatch,
  programId: string,
): PatchMapping => {
  const mapping = emptyPatchMapping();

  for (const entry of patch) {
    if (entry.programId !== programId) {
      continue;
    }

    const fixture = fixtures.find(({ id }) => id === entry.fixtureId);

    if (!fixture) {
      continue;
    }

    const profile = getFixtureProfile(fixture.profileId);

    if (!profile) {
      continue;
    }

    const indexes = resolveCapabilityChannelIndexes(profile, entry.capability);

    if (!indexes) {
      continue;
    }

    const toChannel = (index: number): number => fixture.startChannel + index;

    if (entry.outputKind === "scalar") {
      mapping.scalar[entry.outputId] = [
        ...(mapping.scalar[entry.outputId] ?? []),
        toChannel(indexes[0]),
      ];
    } else {
      mapping.color[entry.outputId] = [
        ...(mapping.color[entry.outputId] ?? []),
        {
          r: toChannel(indexes[0]),
          g: toChannel(indexes[1]),
          b: toChannel(indexes[2]),
        },
      ];
    }
  }

  return mapping;
};

export const unNaNifyValue = (value: number): number =>
  Number.isNaN(value) ? 0 : value;

export const unInfinitifyValue = (value: number): number => {
  if (value === Number.POSITIVE_INFINITY) {
    return 255;
  }
  if (value === Number.NEGATIVE_INFINITY) {
    return 0;
  }
  if (!Number.isFinite(value)) {
    return 0;
  }

  return value;
};

export const capValue = (value: number): number =>
  Math.min(Math.max(Math.round(value * 255), 0), 255);

export const toChannelValue = (value: number): number =>
  capValue(unInfinitifyValue(unNaNifyValue(value)));

export const fromChannelValue = (value: number): number =>
  Math.min(Math.max(Math.round(value / 255), 0), 1);

export const applyMapping = (
  programOutput: ProgramOutput,
  mapping: PatchMapping,
): ProgramOutputOuputs => {
  const channels: ProgramOutputOuputs = {};

  for (const [outputId, targets] of Object.entries(mapping.scalar)) {
    const value = toChannelValue(programOutput.outputs[Number(outputId)]);

    for (const channel of targets) {
      channels[channel] = value;
    }
  }

  for (const [outputId, targets] of Object.entries(mapping.color)) {
    const color = programOutput.colors[Number(outputId)];

    for (const target of targets) {
      channels[target.r] = toChannelValue(color?.r ?? 0);
      channels[target.g] = toChannelValue(color?.g ?? 0);
      channels[target.b] = toChannelValue(color?.b ?? 0);
    }
  }

  return channels;
};

export const getMappingChannels = (mapping: PatchMapping): number[] => [
  ...Object.values(mapping.scalar).flat(),
  ...Object.values(mapping.color)
    .flat()
    .flatMap(({ r, g, b }) => [r, g, b]),
];
