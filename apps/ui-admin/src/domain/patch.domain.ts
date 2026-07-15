import { fixture as fixtureDomain } from "@ptah-app/lib-domains";
import * as models from "@ptah-app/lib-models";
import type { Node } from "@xyflow/react";

import type { NodeAddFixtureData } from "../components/molecules/nodes/node-add-fixture";
import type { NodeFixtureData } from "../components/molecules/nodes/node-fixture";

// Measured: 24px padding + 26px header + 22px profile line + 24px per
// capability row + 8px flex gaps between every row.
export const getFixtureNodeHeight = (capabilitiesCount: number): number =>
  capabilitiesCount <= 1 ? 44 : 84 + capabilitiesCount * 32;

export type FixtureNodesOptions = {
  x?: number;
  interactive?: boolean;
  onEditFixture?: (fixture: models.ShowFixture) => void;
  addButton?: boolean;
  onAddFixture?: () => void;
};

/** The fixture rack: one node per fixture, sorted by start address. */
export const getFixtureNodes = (
  fixtures: models.ShowFixtures,
  {
    x = 800,
    interactive = false,
    onEditFixture,
    addButton = false,
    onAddFixture,
  }: FixtureNodesOptions = {},
): Node<NodeFixtureData | NodeAddFixtureData>[] => {
  const overlappingIds = new Set(
    fixtureDomain
      .findFixtureOverlaps(fixtures)
      .flatMap(({ fixtureAId, fixtureBId }) => [fixtureAId, fixtureBId]),
  );

  const sorted = [...fixtures].sort(
    (a, b) => a.startChannel - b.startChannel || a.name.localeCompare(b.name),
  );

  let y = 0;

  const nodes: Node<NodeFixtureData | NodeAddFixtureData>[] = sorted.map(
    (fixture) => {
      const profile = models.getFixtureProfile(fixture.profileId);
      const capabilities = profile
        ? models.getFixtureProfileCapabilities(profile)
        : [];

      const node: Node<NodeFixtureData> = {
        id: `fixture-${fixture.id}`,
        data: {
          fixture,
          profile,
          capabilities,
          overlapping: overlappingIds.has(fixture.id),
          interactive,
          onEdit: onEditFixture,
        },
        position: { x, y },
        type: "node-fixture",
      };

      y += getFixtureNodeHeight(capabilities.length) + 8;

      return node;
    },
  );

  if (addButton) {
    nodes.push({
      id: "add-fixture",
      data: {
        onAddFixture: onAddFixture ?? (() => undefined),
        firstFixture: fixtures.length === 0,
      },
      position: { x, y },
      type: "node-add-fixture",
    });
  }

  return nodes;
};

/** Replace the fixture-rack nodes with a freshly generated rack. */
export const rebuildFixtureNodes = (
  nodes: Node[],
  fixtures: models.ShowFixtures,
  options: FixtureNodesOptions,
): Node[] => [
  ...nodes.filter(
    (node) => node.type !== "node-fixture" && node.type !== "node-add-fixture",
  ),
  ...getFixtureNodes(fixtures, options),
];
