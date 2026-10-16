import { range } from "../range";

describe("range", () => {
  it("returns array [0..n-1] for positive n", () => {
    expect(range(5)).toEqual([0, 1, 2, 3, 4]);
  });
  it("returns empty array for n=0", () => {
    expect(range(0)).toEqual([]);
  });
  it("returns [0] for n=1", () => {
    expect(range(1)).toEqual([0]);
  });
  it("produces correct length", () => {
    expect(range(10)).toHaveLength(10);
  });
});
