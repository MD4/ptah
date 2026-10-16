import {
  createShowFixture,
  findFixtureOverlaps,
  getCapabilityChannels,
  getFixtureChannels,
} from "../fixture.domain";

describe("createShowFixture", () => {
  it("creates a fixture with the given properties", () => {
    const fixture = createShowFixture("Par L", "rgb", 10);
    expect(fixture).toMatchObject({
      name: "Par L",
      profileId: "rgb",
      startChannel: 10,
    });
  });

  it("assigns a UUID id", () => {
    expect(createShowFixture("a", "dimmer", 1).id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("generates different ids for each call", () => {
    expect(createShowFixture("a", "dimmer", 1).id).not.toBe(
      createShowFixture("a", "dimmer", 1).id,
    );
  });
});

describe("getFixtureChannels", () => {
  it("returns the occupied channel range", () => {
    expect(getFixtureChannels(createShowFixture("a", "rgb", 10))).toEqual([
      10, 11, 12,
    ]);
  });

  it("returns a single channel for a dimmer", () => {
    expect(getFixtureChannels(createShowFixture("a", "dimmer", 512))).toEqual([
      512,
    ]);
  });

  it("returns [] for an unknown profile", () => {
    expect(getFixtureChannels(createShowFixture("a", "nope", 1))).toEqual([]);
  });
});

describe("findFixtureOverlaps", () => {
  it("returns [] when fixtures do not overlap", () => {
    const fixtures = [
      createShowFixture("a", "rgb", 1),
      createShowFixture("b", "rgb", 4),
    ];
    expect(findFixtureOverlaps(fixtures)).toEqual([]);
  });

  it("reports partially overlapping fixtures with the shared channels", () => {
    const a = createShowFixture("a", "rgb", 1);
    const b = createShowFixture("b", "rgb", 3);
    expect(findFixtureOverlaps([a, b])).toEqual([
      { fixtureAId: a.id, fixtureBId: b.id, channels: [3] },
    ]);
  });

  it("reports fully overlapping fixtures", () => {
    const a = createShowFixture("a", "rgb", 1);
    const b = createShowFixture("b", "rgb", 1);
    expect(findFixtureOverlaps([a, b])[0].channels).toEqual([1, 2, 3]);
  });

  it("ignores fixtures with unknown profiles", () => {
    const fixtures = [
      createShowFixture("a", "nope", 1),
      createShowFixture("b", "rgb", 1),
    ];
    expect(findFixtureOverlaps(fixtures)).toEqual([]);
  });

  it("reports every overlapping pair", () => {
    const a = createShowFixture("a", "rgb", 1);
    const b = createShowFixture("b", "rgb", 2);
    const c = createShowFixture("c", "dimmer", 3);
    expect(findFixtureOverlaps([a, b, c])).toHaveLength(3);
  });
});

describe("getCapabilityChannels", () => {
  const fixture = (profileId: string, startChannel: number) => ({
    id: "f",
    name: "f",
    profileId,
    startChannel,
  });

  it("resolves a dimmer capability to its single channel", () => {
    expect(
      getCapabilityChannels(fixture("rgb-dimmer", 10), { type: "dimmer" }),
    ).toEqual([10]);
  });

  it("resolves a color capability to r, g, b channels (offset by dimmer)", () => {
    expect(
      getCapabilityChannels(fixture("rgb-dimmer", 5), { type: "color" }),
    ).toEqual([6, 7, 8]);
  });

  it("resolves a channel capability by profile index", () => {
    expect(
      getCapabilityChannels(fixture("rgbw", 20), {
        type: "channel",
        channelIndex: 3,
      }),
    ).toEqual([23]);
  });

  it("returns undefined for a capability the profile does not offer", () => {
    expect(
      getCapabilityChannels(fixture("rgb", 1), { type: "dimmer" }),
    ).toBeUndefined();
  });

  it("returns undefined for an unknown profile", () => {
    expect(
      getCapabilityChannels(fixture("nope", 1), { type: "color" }),
    ).toBeUndefined();
  });
});
