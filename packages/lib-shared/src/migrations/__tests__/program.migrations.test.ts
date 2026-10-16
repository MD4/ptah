import { programMigrations } from "../program.migrations";

const up = programMigrations[0].up;

describe("program migration: targetIntput -> targetInput (#218)", () => {
  it("is keyed to version 0.3.0", () => {
    expect(programMigrations[0].version).toBe("0.3.0");
  });

  it("renames targetIntput to targetInput, preserving the value", () => {
    const result = up({
      id: "p1",
      edges: [
        {
          id: "e1",
          source: "a",
          target: "b",
          sourceOutput: 0,
          targetIntput: 3,
        },
      ],
    }) as { edges: Array<Record<string, unknown>> };
    expect(result.edges[0].targetInput).toBe(3);
    expect("targetIntput" in result.edges[0]).toBe(false);
  });

  it("leaves already-correct edges untouched (idempotent)", () => {
    const input = {
      edges: [
        { id: "e1", source: "a", target: "b", sourceOutput: 0, targetInput: 5 },
      ],
    };
    expect(up(input)).toEqual(input);
  });

  it("handles a program with no edges", () => {
    expect(up({ id: "p1" })).toEqual({ id: "p1" });
  });
});
