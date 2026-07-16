import type * as models from "@ptah-app/lib-models";
import { pruneShowPatch } from "../domain/show.domain";

const programs: models.ShowPrograms = { p1: "prog-one" };

const fixtures: models.ShowFixtures = [
  { id: "f-dim", name: "Dim", profileId: "dimmer", startChannel: 1 },
  { id: "f-rgb", name: "Par", profileId: "rgb", startChannel: 2 },
  { id: "f-bad", name: "Bad", profileId: "unknown-profile", startChannel: 9 },
];

const entry = (
  overrides: Partial<models.ShowPatchEntryScalar>,
): models.ShowPatchEntry => ({
  programId: "p1",
  outputKind: "scalar",
  outputId: 0,
  fixtureId: "f-dim",
  capability: { type: "dimmer" },
  ...overrides,
});

describe("pruneShowPatch", () => {
  it("keeps entries whose program, fixture and capability all exist", () => {
    const patch = [entry({})];
    expect(pruneShowPatch(patch, programs, fixtures)).toEqual(patch);
  });

  it("drops entries for removed programs", () => {
    expect(
      pruneShowPatch([entry({ programId: "ghost" })], programs, fixtures),
    ).toEqual([]);
  });

  it("drops entries for removed fixtures", () => {
    expect(
      pruneShowPatch([entry({ fixtureId: "ghost" })], programs, fixtures),
    ).toEqual([]);
  });

  it("drops entries for fixtures with an unknown profile", () => {
    expect(
      pruneShowPatch([entry({ fixtureId: "f-bad" })], programs, fixtures),
    ).toEqual([]);
  });

  it("drops entries whose capability the profile no longer offers", () => {
    // dimmer capability on an rgb fixture, e.g. after a profile swap
    expect(
      pruneShowPatch([entry({ fixtureId: "f-rgb" })], programs, fixtures),
    ).toEqual([]);
  });

  it("keeps color entries on color-capable fixtures", () => {
    const patch: models.ShowPatch = [
      {
        programId: "p1",
        outputKind: "color",
        outputId: 0,
        fixtureId: "f-rgb",
        capability: { type: "color" },
      },
    ];
    expect(pruneShowPatch(patch, programs, fixtures)).toEqual(patch);
  });
});
