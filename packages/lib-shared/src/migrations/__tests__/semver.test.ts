import { compareVersions, parseVersion } from "../semver";

describe("parseVersion", () => {
  it("parses major.minor.patch", () => {
    expect(parseVersion("1.2.3")).toEqual([1, 2, 3]);
  });
  it("ignores prerelease and build metadata", () => {
    expect(parseVersion("0.3.0-rc1+build5")).toEqual([0, 3, 0]);
  });
});

describe("compareVersions", () => {
  it("returns -1 when a < b", () => {
    expect(compareVersions("0.2.3", "0.3.0")).toBe(-1);
  });
  it("returns 1 when a > b", () => {
    expect(compareVersions("0.3.0", "0.2.3")).toBe(1);
  });
  it("returns 0 when equal", () => {
    expect(compareVersions("0.3.0", "0.3.0")).toBe(0);
  });
  it("compares patch level", () => {
    expect(compareVersions("0.0.1", "0.0.2")).toBe(-1);
  });
});
