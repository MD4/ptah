import { clamp, clampGraph } from "../clamp";

describe("clamp", () => {
  it("clamps value below min to min", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });
  it("clamps value above max to max", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
  it("returns value when within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it("returns min when value equals min", () => {
    expect(clamp(0, 0, 10)).toBe(0);
  });
  it("returns max when value equals max", () => {
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe("clampGraph", () => {
  it("normalizes a spread array to [0, 1] range", () => {
    expect(clampGraph([0, 5, 10])).toEqual([0, 0.5, 1]);
  });
  it("handles negative values", () => {
    expect(clampGraph([-10, 0, 10])).toEqual([0, 0.5, 1]);
  });
  it("returns zeros when all values are the same (not NaN)", () => {
    expect(clampGraph([5, 5, 5])).toEqual([0, 0, 0]);
  });
  it("returns [0] for a single-element array", () => {
    expect(clampGraph([42])).toEqual([0]);
  });
  it("handles array with two identical values", () => {
    expect(clampGraph([3, 3])).toEqual([0, 0]);
  });
});
