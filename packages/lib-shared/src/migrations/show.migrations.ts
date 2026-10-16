import { randomUUID } from "node:crypto";
import type { MigrationChain } from "./migration.types";

/**
 * 0.4.0 introduces fixtures & capability-based patching. Legacy shows patched
 * program outputs straight onto raw DMX channels. Convert each used channel
 * into a 1-channel "dimmer" fixture ("Channel N", startChannel N) and rewire
 * every legacy entry onto that fixture's dimmer capability — DMX output stays
 * byte-identical. Channel keys outside 1..512 never reached the wire (the
 * drivers' 513-byte buffers dropped them) and are discarded.
 * Idempotent: shows already carrying `fixtures` or an array `patch` pass
 * through unchanged.
 */
const channelsToFixtures = (raw: unknown): unknown => {
  const show = raw as { patch?: unknown; fixtures?: unknown };

  if (show.fixtures !== undefined || Array.isArray(show.patch)) {
    return raw;
  }

  const oldPatch =
    show.patch && typeof show.patch === "object"
      ? (show.patch as Record<string, unknown>)
      : {};

  // Group legacy entries by numeric channel: keys are normalized through
  // Number() so "01" and "1" land on the same fixture instead of silently
  // losing entries or producing duplicate fixtures.
  const entriesByChannel = new Map<number, unknown[]>();

  for (const [key, entries] of Object.entries(oldPatch)) {
    if (!/^\d+$/.test(key)) {
      continue;
    }

    const channel = Number(key);

    if (channel < 1 || channel > 512) {
      continue;
    }

    entriesByChannel.set(channel, [
      ...(entriesByChannel.get(channel) ?? []),
      ...(Array.isArray(entries) ? entries : []),
    ]);
  }

  const channels = [...entriesByChannel.keys()].sort((a, b) => a - b);

  const fixtureIdByChannel = new Map(
    channels.map((channel) => [channel, randomUUID()]),
  );

  const fixtures = channels.map((channel) => ({
    id: fixtureIdByChannel.get(channel),
    name: `Channel ${channel}`,
    profileId: "dimmer",
    startChannel: channel,
  }));

  const patch = channels.flatMap((channel) =>
    (entriesByChannel.get(channel) ?? []).map((entry) => {
      const { programId, programOutput } = entry as Record<string, unknown>;

      return {
        programId,
        outputKind: "scalar",
        outputId: programOutput,
        fixtureId: fixtureIdByChannel.get(channel),
        capability: { type: "dimmer" },
      };
    }),
  );

  return { ...(raw as object), fixtures, patch };
};

export const showMigrations: MigrationChain = [
  { version: "0.4.0", up: channelsToFixtures },
];
