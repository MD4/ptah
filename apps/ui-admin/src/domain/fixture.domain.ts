import { fixture as fixtureDomain } from "@ptah-app/lib-domains";
import * as models from "@ptah-app/lib-models";
import type { Node } from "@xyflow/react";

import type { NodeFixtureData } from "../components/molecules/nodes/node-fixture";

/** ReactFlow target-handle id for a fixture capability. */
export const capabilityToHandleId = (
  capability: models.ShowPatchCapability,
): string =>
  capability.type === "channel"
    ? `channel-${capability.channelIndex}`
    : capability.type;

export const handleIdToCapability = (
  handleId: string,
): models.ShowPatchCapability | undefined => {
  if (handleId === "color") {
    return { type: "color" };
  }
  if (handleId === "dimmer") {
    return { type: "dimmer" };
  }

  const match = /^channel-(\d+)$/.exec(handleId);

  return match
    ? { type: "channel", channelIndex: Number(match[1]) }
    : undefined;
};

/**
 * Smallest start channel keeping the whole fixture inside 1..512 without
 * touching any existing fixture; undefined when the universe is full.
 */
export const suggestNextStartChannel = (
  fixtures: models.ShowFixtures,
  channelCount: number,
): number | undefined => {
  if (channelCount < 1) {
    return undefined;
  }

  const used = new Set(
    fixtures.flatMap((fixture) => fixtureDomain.getFixtureChannels(fixture)),
  );

  for (let start = 1; start + channelCount - 1 <= 512; start += 1) {
    let free = true;

    for (let offset = 0; offset < channelCount; offset += 1) {
      if (used.has(start + offset)) {
        free = false;
        break;
      }
    }

    if (free) {
      return start;
    }
  }

  return undefined;
};

export const adaptReactFlowNodesToModelShowFixtures = (
  nodes: Node[],
): models.ShowFixtures =>
  nodes
    .filter((node) => node.type === "node-fixture")
    .map((node) => (node.data as NodeFixtureData).fixture);
