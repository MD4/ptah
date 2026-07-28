import * as models from "@ptah-app/lib-models";
import type { Node } from "@xyflow/react";

import type { ProgramOutputDescriptor } from "../adapters/show.adapter";
import {
  getCapabilityKindFromHandleId,
  isValidPatchConnection,
} from "../utils/connection";

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

const nodes = [
  programNode("p1", [
    { outputId: 0, kind: "scalar" },
    { outputId: 1, kind: "color" },
  ]),
  fixtureNode("dim", "dimmer", 1),
  fixtureNode("par", "rgbw-dimmer", 10),
];

const connection = (
  sourceHandle: string | null,
  target: string,
  targetHandle: string | null,
  source = "program-p1",
) => ({ source, sourceHandle, target, targetHandle });

describe("getCapabilityKindFromHandleId", () => {
  it("maps color to color and everything else to scalar", () => {
    expect(getCapabilityKindFromHandleId("color")).toBe("color");
    expect(getCapabilityKindFromHandleId("dimmer")).toBe("scalar");
    expect(getCapabilityKindFromHandleId("channel-4")).toBe("scalar");
  });
});

describe("isValidPatchConnection", () => {
  it("accepts scalar output onto a dimmer capability", () => {
    expect(
      isValidPatchConnection(connection("0", "fixture-dim", "dimmer"), nodes),
    ).toBe(true);
  });

  it("accepts color output onto a color capability", () => {
    expect(
      isValidPatchConnection(connection("1", "fixture-par", "color"), nodes),
    ).toBe(true);
  });

  it("accepts scalar output onto a white channel capability", () => {
    expect(
      isValidPatchConnection(
        connection("0", "fixture-par", "channel-4"),
        nodes,
      ),
    ).toBe(true);
  });

  it("rejects color output onto a dimmer capability", () => {
    expect(
      isValidPatchConnection(connection("1", "fixture-par", "dimmer"), nodes),
    ).toBe(false);
  });

  it("rejects scalar output onto a color capability", () => {
    expect(
      isValidPatchConnection(connection("0", "fixture-par", "color"), nodes),
    ).toBe(false);
  });

  it("rejects capabilities the profile does not offer", () => {
    expect(
      isValidPatchConnection(connection("1", "fixture-dim", "color"), nodes),
    ).toBe(false);
  });

  it("rejects unknown source outputs", () => {
    expect(
      isValidPatchConnection(connection("7", "fixture-dim", "dimmer"), nodes),
    ).toBe(false);
  });

  it("rejects missing handles", () => {
    expect(
      isValidPatchConnection(connection(null, "fixture-dim", "dimmer"), nodes),
    ).toBe(false);
    expect(
      isValidPatchConnection(connection("0", "fixture-dim", null), nodes),
    ).toBe(false);
  });

  it("rejects non-program sources and non-fixture targets", () => {
    expect(
      isValidPatchConnection(
        connection("0", "fixture-dim", "dimmer", "fixture-par"),
        nodes,
      ),
    ).toBe(false);
    expect(
      isValidPatchConnection(connection("0", "program-p1", "dimmer"), nodes),
    ).toBe(false);
  });
});
