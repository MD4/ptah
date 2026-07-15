import { ZodError } from "zod";
import type { NodeFxMath } from "../index";
import {
  edge,
  FIXTURE_PROFILES,
  fixtureProfile,
  getFixtureProfile,
  getFixtureProfileCapabilities,
  node,
  nodeFxADSR,
  nodeFxDistortion,
  nodeFxMath,
  nodeInputConstant,
  nodeInputControl,
  nodeInputTime,
  nodeInputVelocity,
  nodeOutputColor,
  nodeOutputResult,
  program,
  programCreate,
  programName,
  resolveCapabilityChannelIndexes,
  settings,
  show,
  showCreate,
  showFixture,
  showName,
  showPatchEntry,
} from "../index";
import { uuid } from "../uuid.model";

const validUuid = "123e4567-e89b-12d3-a456-426614174000";
const pos = { x: 0, y: 0 };

// ─── uuid ────────────────────────────────────────────────────────────────────

describe("uuid schema", () => {
  it("accepts valid UUID", () => {
    expect(uuid.parse(validUuid)).toBe(validUuid);
  });
  it("rejects non-UUID string", () => {
    expect(() => uuid.parse("not-a-uuid")).toThrow(ZodError);
  });
  it("rejects empty string", () => {
    expect(() => uuid.parse("")).toThrow(ZodError);
  });
  it("rejects number", () => {
    expect(() => uuid.parse(42)).toThrow(ZodError);
  });
});

// ─── programName ─────────────────────────────────────────────────────────────

describe("programName schema", () => {
  it("accepts alphanumeric name", () => {
    expect(programName.parse("my-program")).toBe("my-program");
  });
  it("accepts underscore", () => {
    expect(programName.parse("prog_1")).toBe("prog_1");
  });
  it("rejects empty string", () => {
    expect(() => programName.parse("")).toThrow(ZodError);
  });
  it("rejects name with spaces", () => {
    expect(() => programName.parse("my program")).toThrow(ZodError);
  });
  it("rejects name longer than 255 chars", () => {
    expect(() => programName.parse("a".repeat(256))).toThrow(ZodError);
  });
  it("rejects name with special chars", () => {
    expect(() => programName.parse("prog/name")).toThrow(ZodError);
  });
});

// ─── edge ────────────────────────────────────────────────────────────────────

describe("edge schema", () => {
  const validEdge = {
    id: validUuid,
    source: "node-a",
    target: "node-b",
    sourceOutput: 0,
    targetInput: 0, // NOTE: typo in model (B8 bug)
  };

  it("accepts valid edge", () => {
    expect(edge.parse(validEdge)).toEqual(validEdge);
  });
  it("rejects missing id", () => {
    const { id, ...rest } = validEdge;
    expect(() => edge.parse(rest)).toThrow(ZodError);
  });
  it("rejects non-UUID id", () => {
    expect(() => edge.parse({ ...validEdge, id: "bad" })).toThrow(ZodError);
  });
  it("rejects non-number sourceOutput", () => {
    expect(() => edge.parse({ ...validEdge, sourceOutput: "0" })).toThrow(
      ZodError,
    );
  });
  it("rejects missing targetInput", () => {
    const { targetInput, ...rest } = validEdge;
    expect(() => edge.parse(rest)).toThrow(ZodError);
  });
});

// ─── node types ──────────────────────────────────────────────────────────────

describe("nodeInputTime schema", () => {
  const valid = { id: validUuid, position: pos, type: "input-time" as const };
  it("accepts valid input-time node", () => {
    expect(nodeInputTime.parse(valid)).toEqual(valid);
  });
  it("rejects wrong type literal", () => {
    expect(() =>
      nodeInputTime.parse({ ...valid, type: "input-constant" }),
    ).toThrow(ZodError);
  });
});

describe("nodeInputConstant schema", () => {
  const valid = {
    id: validUuid,
    position: pos,
    type: "input-constant" as const,
    value: 0.5,
  };
  it("accepts valid input-constant node", () => {
    expect(nodeInputConstant.parse(valid)).toEqual(valid);
  });
  it("rejects missing value", () => {
    const { value, ...rest } = valid;
    expect(() => nodeInputConstant.parse(rest)).toThrow(ZodError);
  });
  it("rejects non-number value", () => {
    expect(() => nodeInputConstant.parse({ ...valid, value: "0.5" })).toThrow(
      ZodError,
    );
  });
});

describe("nodeInputControl schema", () => {
  const valid = {
    id: validUuid,
    position: pos,
    type: "input-control" as const,
    controlId: 7,
    defaultValue: 0,
  };
  it("accepts valid input-control node", () => {
    expect(nodeInputControl.parse(valid)).toEqual(valid);
  });
  it("rejects defaultValue > 255", () => {
    expect(() =>
      nodeInputControl.parse({ ...valid, defaultValue: 256 }),
    ).toThrow(ZodError);
  });
  it("rejects defaultValue < 0", () => {
    expect(() =>
      nodeInputControl.parse({ ...valid, defaultValue: -1 }),
    ).toThrow(ZodError);
  });
});

describe("nodeInputVelocity schema", () => {
  const valid = {
    id: validUuid,
    position: pos,
    type: "input-velocity" as const,
    defaultValue: 64,
  };
  it("accepts valid velocity node", () => {
    expect(nodeInputVelocity.parse(valid)).toEqual(valid);
  });
  it("rejects defaultValue > 255", () => {
    expect(() =>
      nodeInputVelocity.parse({ ...valid, defaultValue: 256 }),
    ).toThrow(ZodError);
  });
});

describe("nodeOutputResult schema", () => {
  const valid = {
    id: validUuid,
    position: pos,
    type: "output-result" as const,
    outputId: 0,
  };
  it("accepts valid output-result node", () => {
    expect(nodeOutputResult.parse(valid)).toEqual(valid);
  });
  it("rejects outputId < 0", () => {
    expect(() => nodeOutputResult.parse({ ...valid, outputId: -1 })).toThrow(
      ZodError,
    );
  });
  it("rejects outputId > 127", () => {
    expect(() => nodeOutputResult.parse({ ...valid, outputId: 128 })).toThrow(
      ZodError,
    );
  });
});

describe("nodeOutputColor schema", () => {
  const valid = {
    id: validUuid,
    position: pos,
    type: "output-color" as const,
    outputId: 0,
    mode: "rgb" as const,
    valueA: 1,
    valueB: 1,
    valueC: 1,
  };

  it("accepts a valid rgb output-color node", () => {
    expect(nodeOutputColor.parse(valid)).toEqual(valid);
  });
  it("accepts hsv mode", () => {
    expect(() =>
      nodeOutputColor.parse({ ...valid, mode: "hsv" }),
    ).not.toThrow();
  });
  it("rejects an unknown mode", () => {
    expect(() => nodeOutputColor.parse({ ...valid, mode: "cmyk" })).toThrow(
      ZodError,
    );
  });
  it("rejects valueA above 1", () => {
    expect(() => nodeOutputColor.parse({ ...valid, valueA: 1.1 })).toThrow(
      ZodError,
    );
  });
  it("rejects outputId > 127", () => {
    expect(() => nodeOutputColor.parse({ ...valid, outputId: 128 })).toThrow(
      ZodError,
    );
  });
  it("is accepted by the node union", () => {
    expect(node.parse(valid)).toEqual(valid);
  });
});

describe("nodeFxADSR schema", () => {
  const valid = {
    id: validUuid,
    position: pos,
    type: "fx-adsr" as const,
    attackRate: 0.1,
    decayRate: 0.1,
    sustainLevel: 0.5,
    releaseRate: 0.1,
  };
  it("accepts valid ADSR node", () => {
    expect(nodeFxADSR.parse(valid)).toEqual(valid);
  });
  it("rejects attackRate > 1", () => {
    expect(() => nodeFxADSR.parse({ ...valid, attackRate: 1.1 })).toThrow(
      ZodError,
    );
  });
  it("rejects sustainLevel < 0", () => {
    expect(() => nodeFxADSR.parse({ ...valid, sustainLevel: -0.1 })).toThrow(
      ZodError,
    );
  });
});

describe("nodeFxMath schema", () => {
  const valid = {
    id: validUuid,
    position: pos,
    type: "fx-math" as const,
    operation: "add" as const,
    valueA: 0,
    valueB: 0,
  };
  it("accepts valid fx-math node", () => {
    expect(nodeFxMath.parse(valid)).toEqual(valid);
  });
  it("rejects unknown operation", () => {
    expect(() =>
      nodeFxMath.parse({ ...valid, operation: "hyperbolic-sine" }),
    ).toThrow(ZodError);
  });
  it("accepts all valid operations", () => {
    const ops: NodeFxMath["operation"][] = [
      "add",
      "substract",
      "divide",
      "multiply",
      "modulo",
      "sinus",
      "cosinus",
      "tangent",
      "arcsinus",
      "arccosinus",
      "arctangent",
      "exponential",
      "logarithm",
      "square-root",
      "power",
      "absolute",
      "round",
      "floor",
      "ceil",
    ];
    for (const op of ops) {
      expect(() => nodeFxMath.parse({ ...valid, operation: op })).not.toThrow();
    }
  });
});

describe("nodeFxDistortion schema", () => {
  const valid = {
    id: validUuid,
    position: pos,
    type: "fx-distortion" as const,
    time: 0.5,
    value: 0.5,
    drive: 0.5,
    tone: 0.5,
    level: 0.5,
  };
  it("accepts valid distortion node", () => {
    expect(nodeFxDistortion.parse(valid)).toEqual(valid);
  });
  it("rejects drive > 1", () => {
    expect(() => nodeFxDistortion.parse({ ...valid, drive: 1.1 })).toThrow(
      ZodError,
    );
  });
  it("rejects level < 0", () => {
    expect(() => nodeFxDistortion.parse({ ...valid, level: -0.1 })).toThrow(
      ZodError,
    );
  });
});

describe("node discriminated union", () => {
  it("accepts input-time via union", () => {
    const n = { id: validUuid, position: pos, type: "input-time" };
    expect(node.parse(n)).toEqual(n);
  });
  it("accepts fx-math via union", () => {
    const n = {
      id: validUuid,
      position: pos,
      type: "fx-math",
      operation: "add",
      valueA: 0,
      valueB: 0,
    };
    expect(node.parse(n)).toEqual(n);
  });
  it("rejects unknown type via union", () => {
    expect(() =>
      node.parse({ id: validUuid, position: pos, type: "unknown" }),
    ).toThrow(ZodError);
  });
});

// ─── program ─────────────────────────────────────────────────────────────────

describe("program schema", () => {
  const validProgram = {
    id: validUuid,
    name: "test-prog",
    nodes: [],
    edges: [],
  };

  it("accepts valid program", () => {
    expect(program.parse(validProgram)).toEqual(validProgram);
  });
  it("rejects missing id", () => {
    const { id, ...rest } = validProgram;
    expect(() => program.parse(rest)).toThrow(ZodError);
  });
  it("rejects invalid name (space)", () => {
    expect(() => program.parse({ ...validProgram, name: "bad name" })).toThrow(
      ZodError,
    );
  });
  it("rejects non-array nodes", () => {
    expect(() => program.parse({ ...validProgram, nodes: null })).toThrow(
      ZodError,
    );
  });
  it("programCreate only requires name", () => {
    expect(programCreate.parse({ name: "test" })).toEqual({ name: "test" });
  });
  it("programCreate rejects empty name", () => {
    expect(() => programCreate.parse({ name: "" })).toThrow(ZodError);
  });
  it("accepts an optional version stamp", () => {
    const parsed = program.parse({ ...validProgram, version: "0.3.0" });
    expect(parsed.version).toBe("0.3.0");
  });
  it("accepts a program with no version", () => {
    expect(program.parse(validProgram).version).toBeUndefined();
  });
  it("rejects an invalid version string", () => {
    expect(() => program.parse({ ...validProgram, version: "nope" })).toThrow(
      ZodError,
    );
  });
});

// ─── settings ────────────────────────────────────────────────────────────────

describe("settings schema", () => {
  const validSettings = {
    version: "0.2.0",
    midiVirtualPortName: "ptah",
    midiChannel: 1,
    appAdminPort: 3000,
  };

  it("accepts valid settings", () => {
    expect(settings.parse(validSettings)).toMatchObject(validSettings);
  });
  it("accepts optional currentShow", () => {
    const s = { ...validSettings, currentShow: "my-show" };
    expect(settings.parse(s).currentShow).toBe("my-show");
  });
  it("rejects midiChannel < 1", () => {
    expect(() => settings.parse({ ...validSettings, midiChannel: 0 })).toThrow(
      ZodError,
    );
  });
  it("rejects midiChannel > 16", () => {
    expect(() => settings.parse({ ...validSettings, midiChannel: 17 })).toThrow(
      ZodError,
    );
  });
  it("rejects appAdminPort < 1024", () => {
    expect(() =>
      settings.parse({ ...validSettings, appAdminPort: 80 }),
    ).toThrow(ZodError);
  });
  it("rejects appAdminPort > 49151", () => {
    expect(() =>
      settings.parse({ ...validSettings, appAdminPort: 60000 }),
    ).toThrow(ZodError);
  });
  it("rejects empty midiVirtualPortName", () => {
    expect(() =>
      settings.parse({ ...validSettings, midiVirtualPortName: "" }),
    ).toThrow(ZodError);
  });
});

// ─── show ────────────────────────────────────────────────────────────────────

describe("showName schema", () => {
  it("accepts valid show name", () => {
    expect(showName.parse("my-show")).toBe("my-show");
  });
  it("rejects name with spaces", () => {
    expect(() => showName.parse("my show")).toThrow(ZodError);
  });
  it("rejects empty name", () => {
    expect(() => showName.parse("")).toThrow(ZodError);
  });
});

describe("show schema", () => {
  const validShow = {
    id: validUuid,
    name: "test-show",
    mapping: {},
    fixtures: [],
    patch: [],
    programs: {},
  };

  it("accepts valid show", () => {
    expect(show.parse(validShow)).toMatchObject({
      id: validUuid,
      name: "test-show",
    });
  });
  it("rejects non-UUID id", () => {
    expect(() => show.parse({ ...validShow, id: "bad-id" })).toThrow(ZodError);
  });
  it("rejects invalid name", () => {
    expect(() => show.parse({ ...validShow, name: "bad name!" })).toThrow(
      ZodError,
    );
  });
  it("showCreate only requires name", () => {
    expect(showCreate.parse({ name: "my-show" })).toEqual({ name: "my-show" });
  });
  it("accepts an optional version stamp", () => {
    const parsed = show.parse({ ...validShow, version: "0.3.0" });
    expect(parsed.version).toBe("0.3.0");
  });
  it("accepts a show with no version", () => {
    expect(show.parse(validShow).version).toBeUndefined();
  });

  const validFixture = {
    id: validUuid,
    name: "Par L",
    profileId: "rgb",
    startChannel: 1,
  };

  it("accepts a show with a fixture and a patch entry", () => {
    const parsed = show.parse({
      ...validShow,
      fixtures: [validFixture],
      patch: [
        {
          programId: validUuid,
          outputKind: "color",
          outputId: 0,
          fixtureId: validUuid,
          capability: { type: "color" },
        },
      ],
    });
    expect(parsed.fixtures).toHaveLength(1);
    expect(parsed.patch).toHaveLength(1);
  });
  it("rejects a fixture with an unknown profile", () => {
    expect(() =>
      show.parse({
        ...validShow,
        fixtures: [{ ...validFixture, profileId: "moving-head" }],
      }),
    ).toThrow(ZodError);
  });
  it("rejects a fixture overflowing the universe", () => {
    expect(() =>
      show.parse({
        ...validShow,
        fixtures: [
          { ...validFixture, profileId: "rgbw-dimmer", startChannel: 512 },
        ],
      }),
    ).toThrow(ZodError);
  });
  it("accepts a single-channel fixture on channel 512", () => {
    expect(() =>
      show.parse({
        ...validShow,
        fixtures: [
          { ...validFixture, profileId: "dimmer", startChannel: 512 },
        ],
      }),
    ).not.toThrow();
  });
  it("rejects duplicate fixture ids", () => {
    expect(() =>
      show.parse({
        ...validShow,
        fixtures: [
          validFixture,
          { ...validFixture, name: "Par R", startChannel: 10 },
        ],
      }),
    ).toThrow(ZodError);
  });
  it("accepts overlapping fixture addresses", () => {
    expect(() =>
      show.parse({
        ...validShow,
        fixtures: [
          validFixture,
          {
            ...validFixture,
            id: "223e4567-e89b-12d3-a456-426614174000",
            startChannel: 2,
          },
        ],
      }),
    ).not.toThrow();
  });
});

// ─── fixture profiles ────────────────────────────────────────────────────────

describe("fixtureProfile schema", () => {
  it("accepts every built-in profile", () => {
    for (const profile of FIXTURE_PROFILES) {
      expect(() => fixtureProfile.parse(profile)).not.toThrow();
    }
  });
  it("rejects a profile without channels", () => {
    expect(() =>
      fixtureProfile.parse({ id: "empty", name: "Empty", channels: [] }),
    ).toThrow(ZodError);
  });
  it("rejects an unknown channel role", () => {
    expect(() =>
      fixtureProfile.parse({
        id: "strobe",
        name: "Strobe",
        channels: [{ role: "strobe", label: "Strobe" }],
      }),
    ).toThrow(ZodError);
  });
  it("getFixtureProfile finds built-ins", () => {
    expect(getFixtureProfile("rgb")?.channels).toHaveLength(3);
  });
  it("getFixtureProfile returns undefined for unknown ids", () => {
    expect(getFixtureProfile("nope")).toBeUndefined();
  });
});

describe("resolveCapabilityChannelIndexes", () => {
  const rgb = getFixtureProfile("rgb");
  const rgbwDimmer = getFixtureProfile("rgbw-dimmer");
  if (!rgb || !rgbwDimmer) {
    throw new Error("Built-in profiles missing");
  }

  it("resolves color to red, green, blue indexes", () => {
    expect(resolveCapabilityChannelIndexes(rgb, { type: "color" })).toEqual([
      0, 1, 2,
    ]);
    expect(
      resolveCapabilityChannelIndexes(rgbwDimmer, { type: "color" }),
    ).toEqual([1, 2, 3]);
  });
  it("resolves dimmer to the dimmer index", () => {
    expect(
      resolveCapabilityChannelIndexes(rgbwDimmer, { type: "dimmer" }),
    ).toEqual([0]);
  });
  it("returns undefined for dimmer on a profile without one", () => {
    expect(
      resolveCapabilityChannelIndexes(rgb, { type: "dimmer" }),
    ).toBeUndefined();
  });
  it("resolves a channel capability within bounds", () => {
    expect(
      resolveCapabilityChannelIndexes(rgbwDimmer, {
        type: "channel",
        channelIndex: 4,
      }),
    ).toEqual([4]);
  });
  it("returns undefined for an out-of-bounds channel capability", () => {
    expect(
      resolveCapabilityChannelIndexes(rgb, { type: "channel", channelIndex: 3 }),
    ).toBeUndefined();
  });
});

describe("getFixtureProfileCapabilities", () => {
  it("derives color for rgb", () => {
    const rgb = getFixtureProfile("rgb");
    if (!rgb) throw new Error("rgb profile missing");
    expect(getFixtureProfileCapabilities(rgb)).toEqual([
      { capability: { type: "color" }, label: "Color" },
    ]);
  });
  it("derives dimmer only for dimmer", () => {
    const dimmer = getFixtureProfile("dimmer");
    if (!dimmer) throw new Error("dimmer profile missing");
    expect(getFixtureProfileCapabilities(dimmer)).toEqual([
      { capability: { type: "dimmer" }, label: "Dimmer" },
    ]);
  });
  it("derives color, dimmer and white channel for rgbw-dimmer", () => {
    const rgbwDimmer = getFixtureProfile("rgbw-dimmer");
    if (!rgbwDimmer) throw new Error("rgbw-dimmer profile missing");
    expect(getFixtureProfileCapabilities(rgbwDimmer)).toEqual([
      { capability: { type: "color" }, label: "Color" },
      { capability: { type: "dimmer" }, label: "Dimmer" },
      { capability: { type: "channel", channelIndex: 4 }, label: "White" },
    ]);
  });
});

// ─── show fixture ────────────────────────────────────────────────────────────

describe("showFixture schema", () => {
  const valid = {
    id: validUuid,
    name: "Par L",
    profileId: "rgb",
    startChannel: 1,
  };

  it("accepts a valid fixture", () => {
    expect(showFixture.parse(valid)).toEqual(valid);
  });
  it("rejects startChannel 0", () => {
    expect(() => showFixture.parse({ ...valid, startChannel: 0 })).toThrow(
      ZodError,
    );
  });
  it("rejects startChannel 513", () => {
    expect(() => showFixture.parse({ ...valid, startChannel: 513 })).toThrow(
      ZodError,
    );
  });
  it("rejects a non-integer startChannel", () => {
    expect(() => showFixture.parse({ ...valid, startChannel: 1.5 })).toThrow(
      ZodError,
    );
  });
  it("rejects an empty name", () => {
    expect(() => showFixture.parse({ ...valid, name: "" })).toThrow(ZodError);
  });
});

// ─── show patch entries ──────────────────────────────────────────────────────

describe("showPatchEntry schema", () => {
  const scalarEntry = {
    programId: validUuid,
    outputKind: "scalar" as const,
    outputId: 0,
    fixtureId: validUuid,
    capability: { type: "dimmer" as const },
  };
  const colorEntry = {
    programId: validUuid,
    outputKind: "color" as const,
    outputId: 0,
    fixtureId: validUuid,
    capability: { type: "color" as const },
  };

  it("accepts a scalar entry on a dimmer capability", () => {
    expect(showPatchEntry.parse(scalarEntry)).toEqual(scalarEntry);
  });
  it("accepts a scalar entry on a channel capability", () => {
    const entry = {
      ...scalarEntry,
      capability: { type: "channel" as const, channelIndex: 3 },
    };
    expect(showPatchEntry.parse(entry)).toEqual(entry);
  });
  it("accepts a color entry on a color capability", () => {
    expect(showPatchEntry.parse(colorEntry)).toEqual(colorEntry);
  });
  it("rejects a color output on a dimmer capability", () => {
    expect(() =>
      showPatchEntry.parse({
        ...colorEntry,
        capability: { type: "dimmer" },
      }),
    ).toThrow(ZodError);
  });
  it("rejects a scalar output on a color capability", () => {
    expect(() =>
      showPatchEntry.parse({
        ...scalarEntry,
        capability: { type: "color" },
      }),
    ).toThrow(ZodError);
  });
  it("rejects outputId above 127", () => {
    expect(() =>
      showPatchEntry.parse({ ...scalarEntry, outputId: 128 }),
    ).toThrow(ZodError);
  });
});
