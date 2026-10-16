import type {
  Program,
  ShowFixtures,
  ShowPatch,
  ShowPatchEntry,
} from "@ptah-app/lib-models";
import { getFixtureProfile } from "@ptah-app/lib-models";

import { getCapabilityChannels } from "./fixture.domain";
import type { PatchMapping } from "./patch.domain.types";
import type {
  ProgramOutput,
  ProgramOutputOuputs,
} from "./program.domain.types";

export type * from "./patch.domain.types";

export const emptyPatchMapping = (): PatchMapping => [];

type OutputKinds = Record<number, ShowPatchEntry["outputKind"]>;

/** outputId -> kind of the program's output nodes. */
const getProgramOutputKinds = (program: Program): OutputKinds => {
  const kinds: OutputKinds = {};

  for (const node of program.nodes) {
    if (node.type === "output-result") {
      kinds[node.outputId] = "scalar";
    } else if (node.type === "output-color") {
      kinds[node.outputId] = "color";
    }
  }

  return kinds;
};

/**
 * Resolve a show's fixtures + patch into physical DMX channel addresses for
 * one program, preserving patch order. Entries referencing unknown fixtures,
 * unknown profiles or capabilities the profile does not offer are silently
 * skipped (same tolerance the legacy channel patch had for dangling
 * programIds). When `program` is given, entries whose stored outputKind no
 * longer matches the program's output node of that id (e.g. a COLOR node
 * replaced by an OUTPUT node renumbered to the same id) are skipped too.
 */
export const compileShowPatch = (
  fixtures: ShowFixtures,
  patch: ShowPatch,
  programId: string,
  program?: Program,
): PatchMapping => {
  const mapping = emptyPatchMapping();
  const outputKinds = program ? getProgramOutputKinds(program) : undefined;

  for (const entry of patch) {
    if (entry.programId !== programId) {
      continue;
    }

    if (outputKinds && outputKinds[entry.outputId] !== entry.outputKind) {
      continue;
    }

    const fixture = fixtures.find(({ id }) => id === entry.fixtureId);

    if (!fixture || !getFixtureProfile(fixture.profileId)) {
      continue;
    }

    const channels = getCapabilityChannels(fixture, entry.capability);

    if (!channels) {
      continue;
    }

    if (entry.outputKind === "scalar") {
      mapping.push({
        kind: "scalar",
        outputId: entry.outputId,
        channel: channels[0],
      });
    } else {
      mapping.push({
        kind: "color",
        outputId: entry.outputId,
        channels: { r: channels[0], g: channels[1], b: channels[2] },
      });
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

/**
 * Write a program's output into DMX channels, one target at a time in patch
 * order (last write wins on overlapping channels).
 */
export const applyMapping = (
  programOutput: ProgramOutput,
  mapping: PatchMapping,
): ProgramOutputOuputs => {
  const channels: ProgramOutputOuputs = {};

  for (const target of mapping) {
    if (target.kind === "scalar") {
      channels[target.channel] = toChannelValue(
        programOutput.outputs[target.outputId],
      );
    } else {
      const color = programOutput.colors[target.outputId];

      channels[target.channels.r] = toChannelValue(color?.r ?? 0);
      channels[target.channels.g] = toChannelValue(color?.g ?? 0);
      channels[target.channels.b] = toChannelValue(color?.b ?? 0);
    }
  }

  return channels;
};

/** Every physical channel a mapping writes to (duplicates possible). */
export const getMappingChannels = (mapping: PatchMapping): number[] =>
  mapping.flatMap((target) =>
    target.kind === "scalar"
      ? [target.channel]
      : [target.channels.r, target.channels.g, target.channels.b],
  );
