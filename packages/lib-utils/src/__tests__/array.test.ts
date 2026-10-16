import { deduplicate } from "../array";

describe("deduplicate", () => {
  it("removes duplicate primitives", () => {
    expect(deduplicate([1, 2, 2, 3])).toEqual([1, 2, 3]);
  });
  it("preserves order (first occurrence wins)", () => {
    expect(deduplicate([3, 1, 2, 1, 3])).toEqual([3, 1, 2]);
  });
  it("returns same array when no duplicates", () => {
    expect(deduplicate([1, 2, 3])).toEqual([1, 2, 3]);
  });
  it("handles empty array", () => {
    expect(deduplicate([])).toEqual([]);
  });
  it("handles single element", () => {
    expect(deduplicate([42])).toEqual([42]);
  });
  it("uses custom predicate for object equality", () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 1 }];
    const result = deduplicate(items, (a, b) => a.id === b.id);
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });
});
