import { easeOutQuint, easeOutQuintInvert } from "../easing";

describe("easeOutQuint", () => {
  it("returns 0 at x=0", () => {
    expect(easeOutQuint(0)).toBeCloseTo(0);
  });
  it("returns 1 at x=1", () => {
    expect(easeOutQuint(1)).toBeCloseTo(1);
  });
  it("returns value between 0 and 1 for midpoint", () => {
    const v = easeOutQuint(0.5);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(1);
  });
  it("is monotonically increasing", () => {
    expect(easeOutQuint(0.3)).toBeLessThan(easeOutQuint(0.7));
  });
  it("is faster than linear (easing out = starts fast)", () => {
    expect(easeOutQuint(0.5)).toBeGreaterThan(0.5);
  });
});

describe("easeOutQuintInvert", () => {
  it("returns 1 at x=0", () => {
    expect(easeOutQuintInvert(0)).toBeCloseTo(1);
  });
  it("returns 0 at x=1", () => {
    expect(easeOutQuintInvert(1)).toBeCloseTo(0);
  });
  it("is the complement of easeOutQuint", () => {
    expect(easeOutQuintInvert(0.5)).toBeCloseTo(1 - easeOutQuint(0.5));
  });
  it("is monotonically decreasing", () => {
    expect(easeOutQuintInvert(0.3)).toBeGreaterThan(easeOutQuintInvert(0.7));
  });
});
