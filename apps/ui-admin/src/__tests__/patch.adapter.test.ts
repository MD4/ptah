import * as models from "@ptah-app/lib-models";
import type { Node } from "@xyflow/react";

import {
  adaptModelShowPatchToToReactFlowEdges,
  adaptReactFlowEdgesAndToModelPatch,
  sanitizePatchEdges,
} from "../adapters/patch.adapter";
import type { ProgramOutputDescriptor } from "../adapters/show.adapter";

const programNode = (
  programId: string,
  outputs: ProgramOutputDescriptor[],
): Node => ({
  id: `program-${programId}`,
  data: { programId, programName: programId, outputs, noInput: true },
  position: { x: 0, y: 0 },
  type: "node-program",
});

const fixtureNode = (
  id: string,
  profileId: string,
  startChannel: number,
): Node => {
  const profile = models.getFixtureProfile(profileId);

  return {
    id: `fixture-${id}`,
    data: {
      fixture: { id, name: id, profileId, startChannel },
      profile,
      capabilities: profile
        ? models.getFixtureProfileCapabilities(profile)
        : [],
    },
    position: { x: 0, y: 0 },
    type: "node-fixture",
  };
};

const scalarEntry: models.ShowPatchEntry = {
  programId: "p1",
  outputKind: "scalar",
  outputId: 0,
  fixtureId: "f1",
  capability: { type: "dimmer" },
};

const colorEntry: models.ShowPatchEntry = {
  programId: "p1",
  outputKind: "color",
  outputId: 1,
  fixtureId: "f2",
  capability: { type: "color" },
};

const channelEntry: models.ShowPatchEntry = {
  programId: "p2",
  outputKind: "scalar",
  outputId: 2,
  fixtureId: "f3",
  capability: { type: "channel", channelIndex: 4 },
};

describe("adaptModelShowPatchToToReactFlowEdges", () => {
  it("sets source, target and both handles", () => {
    const [edge] = adaptModelShowPatchToToReactFlowEdges([scalarEntry]);
    expect(edge).toMatchObject({
      source: "program-p1",
      sourceHandle: "0",
      target: "fixture-f1",
      targetHandle: "dimmer",
    });
  });

  it("serializes color and channel capabilities into target handles", () => {
    const edges = adaptModelShowPatchToToReactFlowEdges([
      colorEntry,
      channelEntry,
    ]);
    expect(edges[0].targetHandle).toBe("color");
    expect(edges[1].targetHandle).toBe("channel-4");
  });

  it("produces unique deterministic edge ids", () => {
    const edges = adaptModelShowPatchToToReactFlowEdges([
      scalarEntry,
      colorEntry,
      channelEntry,
    ]);
    expect(new Set(edges.map(({ id }) => id)).size).toBe(3);
    expect(adaptModelShowPatchToToReactFlowEdges([scalarEntry])[0].id).toBe(
      edges[0].id,
    );
  });
});

describe("adaptReactFlowEdgesAndToModelPatch", () => {
  it("round-trips scalar, color and channel entries", () => {
    const entries = [scalarEntry, colorEntry, channelEntry];
    expect(
      adaptReactFlowEdgesAndToModelPatch(
        adaptModelShowPatchToToReactFlowEdges(entries),
      ),
    ).toEqual(entries);
  });

  it("keeps fan-in and fan-out entries", () => {
    const entries: models.ShowPatch = [
      scalarEntry,
      { ...scalarEntry, programId: "p2" },
      { ...scalarEntry, fixtureId: "f9" },
    ];
    expect(
      adaptReactFlowEdgesAndToModelPatch(
        adaptModelShowPatchToToReactFlowEdges(entries),
      ),
    ).toHaveLength(3);
  });

  it("skips edges without handles", () => {
    expect(
      adaptReactFlowEdgesAndToModelPatch([
        { id: "e", source: "program-p1", target: "fixture-f1" },
      ]),
    ).toEqual([]);
  });

  it("skips edges with unknown target handles", () => {
    expect(
      adaptReactFlowEdgesAndToModelPatch([
        {
          id: "e",
          source: "program-p1",
          sourceHandle: "0",
          target: "fixture-f1",
          targetHandle: "bogus",
        },
      ]),
    ).toEqual([]);
  });
});

describe("sanitizePatchEdges", () => {
  const nodes = [
    programNode("p1", [
      { outputId: 0, kind: "scalar" },
      { outputId: 1, kind: "color" },
    ]),
    fixtureNode("f1", "dimmer", 1),
    fixtureNode("f2", "rgb", 2),
  ];

  it("keeps kind-matched edges", () => {
    const edges = adaptModelShowPatchToToReactFlowEdges([
      scalarEntry,
      colorEntry,
    ]);
    expect(sanitizePatchEdges(edges, nodes)).toHaveLength(2);
  });

  it("drops edges to a missing fixture", () => {
    const edges = adaptModelShowPatchToToReactFlowEdges([
      { ...scalarEntry, fixtureId: "ghost" },
    ]);
    expect(sanitizePatchEdges(edges, nodes)).toEqual([]);
  });

  it("drops edges from a missing program output", () => {
    const edges = adaptModelShowPatchToToReactFlowEdges([
      { ...scalarEntry, outputId: 9 },
    ]);
    expect(sanitizePatchEdges(edges, nodes)).toEqual([]);
  });

  it("drops kind-mismatched edges (scalar output onto color capability)", () => {
    const edges = [
      {
        id: "e",
        source: "program-p1",
        sourceHandle: "0",
        target: "fixture-f2",
        targetHandle: "color",
      },
    ];
    expect(sanitizePatchEdges(edges, nodes)).toEqual([]);
  });

  it("drops edges to capabilities the profile does not offer", () => {
    const edges = [
      {
        id: "e",
        source: "program-p1",
        sourceHandle: "0",
        target: "fixture-f2",
        targetHandle: "dimmer",
      },
    ];
    expect(sanitizePatchEdges(edges, nodes)).toEqual([]);
  });
});
