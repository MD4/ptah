import * as models from "@ptah-app/lib-models";
import { runMigrations } from "../migrate";
import { showMigrations } from "../show.migrations";

const up = showMigrations[0].up;

const programId = "123e4567-e89b-12d3-a456-426614174000";
const otherProgramId = "223e4567-e89b-12d3-a456-426614174000";

type MigratedShow = {
  fixtures: Array<Record<string, unknown>>;
  patch: Array<Record<string, unknown>>;
};

describe("show migration: raw channels -> dimmer fixtures (0.4.0)", () => {
  it("is keyed to version 0.4.0", () => {
    expect(showMigrations[0].version).toBe("0.4.0");
  });

  it("converts a used channel into a 1-channel dimmer fixture", () => {
    const result = up({
      patch: { "7": [{ programId, programOutput: 2 }] },
    }) as MigratedShow;

    expect(result.fixtures).toHaveLength(1);
    expect(result.fixtures[0]).toMatchObject({
      name: "Channel 7",
      profileId: "dimmer",
      startChannel: 7,
    });
    expect(result.patch).toEqual([
      {
        programId,
        outputKind: "scalar",
        outputId: 2,
        fixtureId: result.fixtures[0].id,
        capability: { type: "dimmer" },
      },
    ]);
  });

  it("preserves fan-in: two programs on one channel share one fixture", () => {
    const result = up({
      patch: {
        "3": [
          { programId, programOutput: 0 },
          { programId: otherProgramId, programOutput: 1 },
        ],
      },
    }) as MigratedShow;

    expect(result.fixtures).toHaveLength(1);
    expect(result.patch).toHaveLength(2);
    expect(result.patch[0].fixtureId).toBe(result.patch[1].fixtureId);
  });

  it("preserves fan-out: one output on two channels gets two fixtures", () => {
    const result = up({
      patch: {
        "2": [{ programId, programOutput: 0 }],
        "5": [{ programId, programOutput: 0 }],
      },
    }) as MigratedShow;

    expect(result.fixtures).toHaveLength(2);
    expect(result.fixtures.map((f) => f.startChannel)).toEqual([2, 5]);
    expect(result.patch).toHaveLength(2);
    expect(result.patch[0].fixtureId).not.toBe(result.patch[1].fixtureId);
  });

  it("converts an empty patch to empty fixtures and patch", () => {
    expect(up({ patch: {} })).toMatchObject({ fixtures: [], patch: [] });
  });

  it("handles a show with no patch key", () => {
    expect(up({ id: "s1" })).toMatchObject({
      id: "s1",
      fixtures: [],
      patch: [],
    });
  });

  it("drops channel keys outside 1..512 and non-numeric keys", () => {
    const result = up({
      patch: {
        "0": [{ programId, programOutput: 0 }],
        "600": [{ programId, programOutput: 0 }],
        abc: [{ programId, programOutput: 0 }],
        "1.5": [{ programId, programOutput: 0 }],
        "512": [{ programId, programOutput: 0 }],
      },
    }) as MigratedShow;

    expect(result.fixtures).toHaveLength(1);
    expect(result.fixtures[0].startChannel).toBe(512);
    expect(result.patch).toHaveLength(1);
  });

  it("passes an already-migrated show through unchanged (idempotent)", () => {
    const migrated = up({
      patch: { "1": [{ programId, programOutput: 0 }] },
    });
    expect(up(migrated)).toBe(migrated);
  });

  it("passes a show with an array patch through unchanged", () => {
    const input = { patch: [], fixtures: [] };
    expect(up(input)).toBe(input);
  });

  it("produces a show that satisfies the current model end-to-end", () => {
    const legacyShow = {
      id: programId,
      name: "legacy-show",
      mapping: { "60": programId },
      patch: {
        "1": [{ programId, programOutput: 0 }],
        "2": [
          { programId, programOutput: 1 },
          { programId: otherProgramId, programOutput: 0 },
        ],
      },
      programs: { [programId]: "prog-a", [otherProgramId]: "prog-b" },
      version: "0.2.3",
    };

    const migrated = runMigrations(legacyShow, showMigrations, {
      from: "0.2.3",
      to: "0.4.0",
    });

    const parsed = models.show.parse(migrated);
    expect(parsed.fixtures).toHaveLength(2);
    expect(parsed.patch).toHaveLength(3);
    expect(parsed.version).toBe("0.4.0");
  });
});
