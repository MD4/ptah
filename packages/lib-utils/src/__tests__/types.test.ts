import { isDefined } from "../types";

describe("isDefined", () => {
  it("returns true for 0", () => expect(isDefined(0)).toBe(true));
  it("returns true for empty string", () => expect(isDefined("")).toBe(true));
  it("returns true for false", () => expect(isDefined(false)).toBe(true));
  it("returns true for null", () => expect(isDefined(null)).toBe(true));
  it("returns true for objects", () => expect(isDefined({})).toBe(true));
  it("returns false for undefined", () =>
    expect(isDefined(undefined)).toBe(false));
});
