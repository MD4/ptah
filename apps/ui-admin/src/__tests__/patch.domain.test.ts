import type * as models from "@ptah-app/lib-models";
import { compareFixtures, sortFixtures } from "../domain/patch.domain";

const fixture = (name: string, startChannel: number): models.ShowFixture => ({
  id: name,
  name,
  profileId: "dimmer",
  startChannel,
});

describe("sortFixtures", () => {
  it("orders by start channel, then by name", () => {
    const sorted = sortFixtures([
      fixture("b", 10),
      fixture("z", 1),
      fixture("a", 10),
    ]);
    expect(sorted.map(({ name }) => name)).toEqual(["z", "a", "b"]);
  });

  it("does not mutate its input", () => {
    const input = [fixture("b", 2), fixture("a", 1)];
    sortFixtures(input);
    expect(input.map(({ name }) => name)).toEqual(["b", "a"]);
  });

  it("compareFixtures returns 0 for identical address and name", () => {
    expect(compareFixtures(fixture("a", 1), fixture("a", 1))).toBe(0);
  });
});
