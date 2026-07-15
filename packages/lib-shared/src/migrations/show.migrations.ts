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

  const channels = Object.keys(oldPatch)
    .filter((key) => /^\d+$/.test(key))
    .map(Number)
    .filter((channel) => channel >= 1 && channel <= 512)
    .sort((a, b) => a - b);

  const fixtureIdByChannel = new Map(
    channels.map((channel) => [channel, randomUUID()]),
  );

  const fixtures = channels.map((channel) => ({
    id: fixtureIdByChannel.get(channel),
    name: `Channel ${channel}`,
    profileId: "dimmer",
    startChannel: channel,
  }));

  const patch = channels.flatMap((channel) => {
    const entries = oldPatch[String(channel)];

    if (!Array.isArray(entries)) {
      return [];
    }

    return entries.map((entry) => {
      const { programId, programOutput } = entry as Record<string, unknown>;

      return {
        programId,
        outputKind: "scalar",
        outputId: programOutput,
        fixtureId: fixtureIdByChannel.get(channel),
        capability: { type: "dimmer" },
      };
    });
  });

  return { ...(raw as object), fixtures, patch };
};

export const showMigrations: MigrationChain = [
  { version: "0.4.0", up: channelsToFixtures },
];
