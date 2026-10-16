import * as z from "zod";

import type { ShowPatchCapability } from "./show-patch.model";

export const fixtureChannelRole = z.union([
  z.literal("dimmer"),
  z.literal("red"),
  z.literal("green"),
  z.literal("blue"),
  z.literal("white"),
  z.literal("generic"),
]);
export type FixtureChannelRole = z.infer<typeof fixtureChannelRole>;

export const fixtureProfileChannel = z.object({
  role: fixtureChannelRole,
  label: z.string().min(1).max(255),
});
export type FixtureProfileChannel = z.infer<typeof fixtureProfileChannel>;

// Slug, not uuid: built-ins get stable readable ids ("rgbw-dimmer"); a future
// Open Fixture Library importer can mint "ofl-<fixture>-<mode>" slugs without
// a shape change.
export const fixtureProfileId = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[\w-]+$/);
export type FixtureProfileId = z.infer<typeof fixtureProfileId>;

export const fixtureProfile = z.object({
  id: fixtureProfileId,
  name: z.string().min(1).max(255),
  channels: z.array(fixtureProfileChannel).min(1).max(512),
});
export type FixtureProfile = z.infer<typeof fixtureProfile>;

const dimmer: FixtureProfileChannel = { role: "dimmer", label: "Dimmer" };
const red: FixtureProfileChannel = { role: "red", label: "Red" };
const green: FixtureProfileChannel = { role: "green", label: "Green" };
const blue: FixtureProfileChannel = { role: "blue", label: "Blue" };
const white: FixtureProfileChannel = { role: "white", label: "White" };

export const FIXTURE_PROFILES: readonly FixtureProfile[] = [
  { id: "dimmer", name: "Dimmer", channels: [dimmer] },
  { id: "rgb", name: "RGB", channels: [red, green, blue] },
  { id: "rgbw", name: "RGBW", channels: [red, green, blue, white] },
  {
    id: "rgb-dimmer",
    name: "RGB + Dimmer",
    channels: [dimmer, red, green, blue],
  },
  {
    id: "rgbw-dimmer",
    name: "RGBW + Dimmer",
    channels: [dimmer, red, green, blue, white],
  },
];

export const getFixtureProfile = (id: string): FixtureProfile | undefined =>
  FIXTURE_PROFILES.find((profile) => profile.id === id);

/**
 * Resolve a capability to channel indexes within the profile (0-based).
 * color needs red, green and blue channels; dimmer needs a dimmer channel;
 * channel needs its index to exist. Returns undefined when the profile does
 * not offer the capability.
 */
export const resolveCapabilityChannelIndexes = (
  profile: FixtureProfile,
  capability: ShowPatchCapability,
): number[] | undefined => {
  switch (capability.type) {
    case "dimmer": {
      const index = profile.channels.findIndex(({ role }) => role === "dimmer");

      return index === -1 ? undefined : [index];
    }
    case "channel": {
      return capability.channelIndex < profile.channels.length
        ? [capability.channelIndex]
        : undefined;
    }
    case "color": {
      const redIndex = profile.channels.findIndex(({ role }) => role === "red");
      const greenIndex = profile.channels.findIndex(
        ({ role }) => role === "green",
      );
      const blueIndex = profile.channels.findIndex(
        ({ role }) => role === "blue",
      );

      return redIndex === -1 || greenIndex === -1 || blueIndex === -1
        ? undefined
        : [redIndex, greenIndex, blueIndex];
    }
  }
};

export type FixtureProfileCapability = {
  capability: ShowPatchCapability;
  label: string;
};

/**
 * Capabilities a profile offers, in display order: color (when red, green and
 * blue channels exist), dimmer (when a dimmer channel exists), then one
 * channel capability per white/generic channel.
 */
export const getFixtureProfileCapabilities = (
  profile: FixtureProfile,
): FixtureProfileCapability[] => {
  const capabilities: FixtureProfileCapability[] = [];

  if (resolveCapabilityChannelIndexes(profile, { type: "color" })) {
    capabilities.push({ capability: { type: "color" }, label: "Color" });
  }
  if (resolveCapabilityChannelIndexes(profile, { type: "dimmer" })) {
    capabilities.push({ capability: { type: "dimmer" }, label: "Dimmer" });
  }
  profile.channels.forEach((channel, channelIndex) => {
    if (channel.role === "white" || channel.role === "generic") {
      capabilities.push({
        capability: { type: "channel", channelIndex },
        label: channel.label,
      });
    }
  });

  return capabilities;
};
