import type * as models from "@ptah-app/lib-models";
import {
  capabilityToHandleId,
  handleIdToCapability,
  suggestNextStartChannel,
} from "../domain/fixture.domain";

const fixture = (
  id: string,
  profileId: string,
  startChannel: number,
): models.ShowFixture => ({ id, name: id, profileId, startChannel });

describe("capabilityToHandleId", () => {
  it("serializes color and dimmer capabilities", () => {
    expect(capabilityToHandleId({ type: "color" })).toBe("color");
    expect(capabilityToHandleId({ type: "dimmer" })).toBe("dimmer");
  });
  it("serializes channel capabilities with their index", () => {
    expect(capabilityToHandleId({ type: "channel", channelIndex: 4 })).toBe(
      "channel-4",
    );
  });
});

describe("handleIdToCapability", () => {
  it("round-trips every capability", () => {
    const capabilities: models.ShowPatchCapability[] = [
      { type: "color" },
      { type: "dimmer" },
      { type: "channel", channelIndex: 0 },
      { type: "channel", channelIndex: 12 },
    ];
    for (const capability of capabilities) {
      expect(handleIdToCapability(capabilityToHandleId(capability))).toEqual(
        capability,
      );
    }
  });
  it("returns undefined for unknown handle ids", () => {
    expect(handleIdToCapability("bogus")).toBeUndefined();
    expect(handleIdToCapability("channel-")).toBeUndefined();
    expect(handleIdToCapability("channel-x")).toBeUndefined();
    expect(handleIdToCapability("")).toBeUndefined();
  });
});

describe("suggestNextStartChannel", () => {
  it("suggests 1 for an empty rig", () => {
    expect(suggestNextStartChannel([], 3)).toBe(1);
  });
  it("suggests the channel after the last used one", () => {
    expect(suggestNextStartChannel([fixture("a", "dimmer", 1)], 3)).toBe(2);
  });
  it("fills gaps between fixtures", () => {
    const fixtures = [fixture("a", "rgb", 1), fixture("b", "rgb", 7)];
    expect(suggestNextStartChannel(fixtures, 3)).toBe(4);
  });
  it("skips gaps that are too small", () => {
    const fixtures = [fixture("a", "rgb", 1), fixture("b", "rgb", 5)];
    expect(suggestNextStartChannel(fixtures, 3)).toBe(8);
  });
  it("returns undefined when nothing fits", () => {
    expect(
      suggestNextStartChannel([fixture("a", "dimmer", 256)], 512),
    ).toBeUndefined();
  });
  it("returns undefined for a zero channel count", () => {
    expect(suggestNextStartChannel([], 0)).toBeUndefined();
  });
  it("keeps the whole fixture inside the universe", () => {
    expect(suggestNextStartChannel([], 512)).toBe(1);
    expect(suggestNextStartChannel([fixture("a", "dimmer", 1)], 512)).toBe(
      undefined,
    );
  });
});
