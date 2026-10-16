import type * as models from "@ptah-app/lib-models";
import {
  getFixtureProfile,
  resolveCapabilityChannelIndexes,
} from "@ptah-app/lib-models";
import { v4 as uuidv4 } from "uuid";

export const createShowFixture = (
  name: string,
  profileId: string,
  startChannel: number,
): models.ShowFixture => ({
  id: uuidv4(),
  name,
  profileId,
  startChannel,
});

/** Physical DMX channels a fixture occupies; [] when its profile is unknown. */
export const getFixtureChannels = (fixture: models.ShowFixture): number[] => {
  const profile = getFixtureProfile(fixture.profileId);

  if (!profile) {
    return [];
  }

  return profile.channels.map((_, index) => fixture.startChannel + index);
};

/**
 * Physical DMX channels one of a fixture's capabilities drives (1 for
 * dimmer/channel, [r, g, b] for color); undefined when the profile is unknown
 * or does not offer that capability.
 */
export const getCapabilityChannels = (
  fixture: models.ShowFixture,
  capability: models.ShowPatchCapability,
): number[] | undefined => {
  const profile = getFixtureProfile(fixture.profileId);

  if (!profile) {
    return undefined;
  }

  return resolveCapabilityChannelIndexes(profile, capability)?.map(
    (index) => fixture.startChannel + index,
  );
};

export type FixtureOverlap = {
  fixtureAId: string;
  fixtureBId: string;
  channels: number[];
};

/**
 * Pairs of fixtures sharing DMX channels. Overlaps are allowed (the UI only
 * warns); overlapping channels are last-write-wins at runtime, in patch order
 * within a program and in program order across programs.
 */
export const findFixtureOverlaps = (
  fixtures: models.ShowFixtures,
): FixtureOverlap[] => {
  const overlaps: FixtureOverlap[] = [];

  for (let a = 0; a < fixtures.length; a += 1) {
    const channelsA = new Set(getFixtureChannels(fixtures[a]));

    for (let b = a + 1; b < fixtures.length; b += 1) {
      const channels = getFixtureChannels(fixtures[b]).filter((channel) =>
        channelsA.has(channel),
      );

      if (channels.length > 0) {
        overlaps.push({
          fixtureAId: fixtures[a].id,
          fixtureBId: fixtures[b].id,
          channels,
        });
      }
    }
  }

  return overlaps;
};
