import type { Program, ShowFixtures, ShowPatch } from "@ptah-app/lib-models";
import {
  applyMapping,
  capValue,
  compileShowPatch,
  emptyPatchMapping,
  fromChannelValue,
  getMappingChannels,
  toChannelValue,
  unInfinitifyValue,
  unNaNifyValue,
} from "../patch.domain";

describe("unNaNifyValue", () => {
  it("returns 0 for NaN", () => expect(unNaNifyValue(Number.NaN)).toBe(0));
  it("passes through finite numbers", () =>
    expect(unNaNifyValue(0.5)).toBe(0.5));
  it("passes through 0", () => expect(unNaNifyValue(0)).toBe(0));
  it("passes through negative numbers", () =>
    expect(unNaNifyValue(-1)).toBe(-1));
});

describe("unInfinitifyValue", () => {
  it("maps +Infinity to 255", () =>
    expect(unInfinitifyValue(Number.POSITIVE_INFINITY)).toBe(255));
  it("maps -Infinity to 0", () =>
    expect(unInfinitifyValue(Number.NEGATIVE_INFINITY)).toBe(0));
  it("maps NaN (non-finite) to 0", () =>
    expect(unInfinitifyValue(Number.NaN)).toBe(0));
  it("passes through finite values", () =>
    expect(unInfinitifyValue(0.7)).toBe(0.7));
  it("passes through 0", () => expect(unInfinitifyValue(0)).toBe(0));
});

describe("capValue", () => {
  it("converts 0.0 to 0", () => expect(capValue(0)).toBe(0));
  it("converts 1.0 to 255", () => expect(capValue(1)).toBe(255));
  it("converts 0.5 to 128 (rounds)", () => expect(capValue(0.5)).toBe(128));
  it("clamps below 0 to 0", () => expect(capValue(-1)).toBe(0));
  it("clamps above 1 to 255", () => expect(capValue(2)).toBe(255));
  it("rounds 0.501 to 128", () => expect(capValue(0.501)).toBe(128));
});

describe("toChannelValue", () => {
  it("converts NaN to 0", () => expect(toChannelValue(Number.NaN)).toBe(0));
  it("converts Infinity to 255", () =>
    expect(toChannelValue(Number.POSITIVE_INFINITY)).toBe(255));
  it("converts -Infinity to 0", () =>
    expect(toChannelValue(Number.NEGATIVE_INFINITY)).toBe(0));
  it("converts 0.5 to 128", () => expect(toChannelValue(0.5)).toBe(128));
  it("converts 1.0 to 255", () => expect(toChannelValue(1)).toBe(255));
  it("converts 0.0 to 0", () => expect(toChannelValue(0)).toBe(0));
});

describe("fromChannelValue", () => {
  it("converts 255 to 1", () => expect(fromChannelValue(255)).toBe(1));
  it("converts 0 to 0", () => expect(fromChannelValue(0)).toBe(0));
  it("clamps above 255 to 1", () => expect(fromChannelValue(300)).toBe(1));
  it("clamps below 0 to 0", () => expect(fromChannelValue(-50)).toBe(0));
});

describe("compileShowPatch", () => {
  const programId = "abc-123";

  const scalarEntry = (
    outputId: number,
    fixtureId: string,
    capability:
      | { type: "dimmer" }
      | { type: "channel"; channelIndex: number } = { type: "dimmer" },
    entryProgramId = programId,
  ): ShowPatch[number] => ({
    programId: entryProgramId,
    outputKind: "scalar",
    outputId,
    fixtureId,
    capability,
  });

  const colorEntry = (
    outputId: number,
    fixtureId: string,
    entryProgramId = programId,
  ): ShowPatch[number] => ({
    programId: entryProgramId,
    outputKind: "color",
    outputId,
    fixtureId,
    capability: { type: "color" },
  });

  const fixture = (
    id: string,
    profileId: string,
    startChannel: number,
  ): ShowFixtures[number] => ({
    id,
    name: id,
    profileId,
    startChannel,
  });

  const scalar = (outputId: number, channel: number) => ({
    kind: "scalar" as const,
    outputId,
    channel,
  });

  const color = (outputId: number, r: number, g: number, b: number) => ({
    kind: "color" as const,
    outputId,
    channels: { r, g, b },
  });

  const program = (
    nodes: Array<{ type: "output-result" | "output-color"; outputId: number }>,
  ): Program =>
    ({
      id: programId,
      name: "p",
      edges: [],
      version: "0.4.0",
      nodes: nodes.map((node, index) => ({
        id: `n${index}`,
        position: { x: 0, y: 0 },
        ...(node.type === "output-color"
          ? { mode: "rgb", valueA: 0, valueB: 0, valueC: 0 }
          : {}),
        ...node,
      })),
    }) as Program;

  it("preserves patch order across kinds", () => {
    const mapping = compileShowPatch(
      [fixture("f1", "rgb", 1), fixture("f2", "dimmer", 1)],
      [colorEntry(1, "f1"), scalarEntry(0, "f2")],
      programId,
    );
    expect(mapping).toEqual([color(1, 1, 2, 3), scalar(0, 1)]);
  });

  it("skips entries whose kind no longer matches the program's output node", () => {
    // A COLOR node was deleted and an OUTPUT node got renumbered to id 0:
    // the stale color entry must not drive the fixture anymore.
    const mapping = compileShowPatch(
      [fixture("f1", "rgb", 1), fixture("f2", "dimmer", 10)],
      [colorEntry(0, "f1"), scalarEntry(0, "f2")],
      programId,
      program([{ type: "output-result", outputId: 0 }]),
    );
    expect(mapping).toEqual([scalar(0, 10)]);
  });

  it("skips entries whose outputId no longer exists in the program", () => {
    const mapping = compileShowPatch(
      [fixture("f1", "dimmer", 1)],
      [scalarEntry(3, "f1")],
      programId,
      program([{ type: "output-result", outputId: 0 }]),
    );
    expect(mapping).toEqual(emptyPatchMapping());
  });

  it("keeps entries matching the program's output kinds", () => {
    const mapping = compileShowPatch(
      [fixture("f1", "rgb", 1), fixture("f2", "dimmer", 10)],
      [colorEntry(0, "f1"), scalarEntry(1, "f2")],
      programId,
      program([
        { type: "output-color", outputId: 0 },
        { type: "output-result", outputId: 1 },
      ]),
    );
    expect(mapping).toEqual([color(0, 1, 2, 3), scalar(1, 10)]);
  });

  it("returns an empty mapping for an empty patch", () => {
    expect(compileShowPatch([], [], programId)).toEqual(emptyPatchMapping());
  });

  it("resolves a dimmer capability on a rgb-dimmer fixture", () => {
    const mapping = compileShowPatch(
      [fixture("f1", "rgb-dimmer", 10)],
      [scalarEntry(0, "f1")],
      programId,
    );
    expect(mapping).toEqual([scalar(0, 10)]);
  });

  it("resolves a white channel capability on a rgbw fixture", () => {
    const mapping = compileShowPatch(
      [fixture("f1", "rgbw", 20)],
      [scalarEntry(0, "f1", { type: "channel", channelIndex: 3 })],
      programId,
    );
    expect(mapping).toEqual([scalar(0, 23)]);
  });

  it("resolves a color capability on a rgb fixture", () => {
    const mapping = compileShowPatch(
      [fixture("f1", "rgb", 5)],
      [colorEntry(0, "f1")],
      programId,
    );
    expect(mapping).toEqual([color(0, 5, 6, 7)]);
  });

  it("resolves a color capability on a rgb-dimmer fixture (offset by dimmer)", () => {
    const mapping = compileShowPatch(
      [fixture("f1", "rgb-dimmer", 5)],
      [colorEntry(0, "f1")],
      programId,
    );
    expect(mapping).toEqual([color(0, 6, 7, 8)]);
  });

  it("fans one color output out to several fixtures", () => {
    const mapping = compileShowPatch(
      [fixture("f1", "rgb", 1), fixture("f2", "rgb", 4)],
      [colorEntry(0, "f1"), colorEntry(0, "f2")],
      programId,
    );
    expect(mapping).toEqual([color(0, 1, 2, 3), color(0, 4, 5, 6)]);
  });

  it("fans one scalar output out to several fixtures", () => {
    const mapping = compileShowPatch(
      [fixture("f1", "dimmer", 1), fixture("f2", "dimmer", 2)],
      [scalarEntry(0, "f1"), scalarEntry(0, "f2")],
      programId,
    );
    expect(mapping).toEqual([scalar(0, 1), scalar(0, 2)]);
  });

  it("ignores entries for other programIds", () => {
    const mapping = compileShowPatch(
      [fixture("f1", "dimmer", 1), fixture("f2", "dimmer", 2)],
      [scalarEntry(0, "f1", { type: "dimmer" }, "other"), scalarEntry(0, "f2")],
      programId,
    );
    expect(mapping).toEqual([scalar(0, 2)]);
  });

  it("skips entries referencing an unknown fixture", () => {
    const mapping = compileShowPatch(
      [fixture("f1", "dimmer", 1)],
      [scalarEntry(0, "ghost")],
      programId,
    );
    expect(mapping).toEqual(emptyPatchMapping());
  });

  it("skips fixtures with an unknown profile", () => {
    const mapping = compileShowPatch(
      [fixture("f1", "unknown-profile", 1)],
      [scalarEntry(0, "f1")],
      programId,
    );
    expect(mapping).toEqual(emptyPatchMapping());
  });

  it("skips capabilities the profile does not offer", () => {
    const mapping = compileShowPatch(
      [fixture("f1", "rgb", 1)],
      [scalarEntry(0, "f1", { type: "dimmer" })],
      programId,
    );
    expect(mapping).toEqual(emptyPatchMapping());
  });

  it("skips out-of-bounds channel capabilities", () => {
    const mapping = compileShowPatch(
      [fixture("f1", "rgb", 1)],
      [scalarEntry(0, "f1", { type: "channel", channelIndex: 3 })],
      programId,
    );
    expect(mapping).toEqual(emptyPatchMapping());
  });

  it("compiles a migrated legacy channel to that exact channel", () => {
    // The 0.4.0 migration turns legacy `{"7": [{programId, programOutput: 2}]}`
    // into a "Channel 7" dimmer fixture — output must stay byte-identical.
    const mapping = compileShowPatch(
      [fixture("channel-7", "dimmer", 7)],
      [scalarEntry(2, "channel-7")],
      programId,
    );
    expect(mapping).toEqual([scalar(2, 7)]);
  });
});

describe("applyMapping", () => {
  const output = (
    outputs: Record<number, number> = {},
    colors: Record<number, { r: number; g: number; b: number }> = {},
  ) => ({ outputs, colors, registry: new Map() });

  const scalar = (outputId: number, channel: number) => ({
    kind: "scalar" as const,
    outputId,
    channel,
  });

  const color = (outputId: number, r: number, g: number, b: number) => ({
    kind: "color" as const,
    outputId,
    channels: { r, g, b },
  });

  it("applies a single scalar output to a single channel", () => {
    expect(applyMapping(output({ 0: 0.5 }), [scalar(0, 10)])).toEqual({
      10: 128,
    });
  });

  it("fans out one scalar output to multiple channels", () => {
    expect(
      applyMapping(output({ 0: 1.0 }), [
        scalar(0, 1),
        scalar(0, 2),
        scalar(0, 3),
      ]),
    ).toEqual({ 1: 255, 2: 255, 3: 255 });
  });

  it("returns empty for an empty mapping", () => {
    expect(applyMapping(output({ 0: 0.5 }), emptyPatchMapping())).toEqual({});
  });

  it("maps NaN scalar output to channel value 0", () => {
    expect(applyMapping(output({ 0: Number.NaN }), [scalar(0, 5)])).toEqual({
      5: 0,
    });
  });

  it("maps Infinity scalar output to channel value 255", () => {
    expect(
      applyMapping(output({ 0: Number.POSITIVE_INFINITY }), [scalar(0, 5)]),
    ).toEqual({ 5: 255 });
  });

  it("writes a color output to its component channels", () => {
    expect(
      applyMapping(output({}, { 0: { r: 1, g: 0.5, b: 0 } }), [
        color(0, 1, 2, 3),
      ]),
    ).toEqual({ 1: 255, 2: 128, 3: 0 });
  });

  it("fans out one color output to several fixtures", () => {
    expect(
      applyMapping(output({}, { 0: { r: 1, g: 1, b: 1 } }), [
        color(0, 1, 2, 3),
        color(0, 4, 5, 6),
      ]),
    ).toEqual({ 1: 255, 2: 255, 3: 255, 4: 255, 5: 255, 6: 255 });
  });

  it("writes 0 to component channels when the color output is missing", () => {
    expect(applyMapping(output(), [color(0, 1, 2, 3)])).toEqual({
      1: 0,
      2: 0,
      3: 0,
    });
  });

  it("scrubs NaN color components to 0", () => {
    expect(
      applyMapping(output({}, { 0: { r: Number.NaN, g: 1, b: 1 } }), [
        color(0, 1, 2, 3),
      ]),
    ).toEqual({ 1: 0, 2: 255, 3: 255 });
  });

  it("applies scalar and color outputs together", () => {
    expect(
      applyMapping(output({ 0: 1 }, { 0: { r: 0, g: 0.5, b: 1 } }), [
        scalar(0, 10),
        color(0, 1, 2, 3),
      ]),
    ).toEqual({ 10: 255, 1: 0, 2: 128, 3: 255 });
  });

  it("lets the last patch entry win on overlapping channels (color then scalar)", () => {
    expect(
      applyMapping(output({ 0: 1 }, { 1: { r: 0, g: 0, b: 0 } }), [
        color(1, 1, 2, 3),
        scalar(0, 1),
      ]),
    ).toEqual({ 1: 255, 2: 0, 3: 0 });
  });

  it("lets the last patch entry win on overlapping channels (scalar then color)", () => {
    expect(
      applyMapping(output({ 0: 1 }, { 1: { r: 0, g: 0, b: 0 } }), [
        scalar(0, 1),
        color(1, 1, 2, 3),
      ]),
    ).toEqual({ 1: 0, 2: 0, 3: 0 });
  });
});

describe("getMappingChannels", () => {
  it("returns [] for an empty mapping", () => {
    expect(getMappingChannels(emptyPatchMapping())).toEqual([]);
  });

  it("collects scalar and color component channels", () => {
    const mapping = [
      { kind: "scalar" as const, outputId: 0, channel: 10 },
      { kind: "scalar" as const, outputId: 0, channel: 11 },
      { kind: "scalar" as const, outputId: 1, channel: 20 },
      { kind: "color" as const, outputId: 0, channels: { r: 1, g: 2, b: 3 } },
    ];
    expect(getMappingChannels(mapping).sort((a, b) => a - b)).toEqual([
      1, 2, 3, 10, 11, 20,
    ]);
  });
});
