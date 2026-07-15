import { hsvToRgb } from "../color";

describe("hsvToRgb", () => {
  it("converts hue 0 to red", () => {
    expect(hsvToRgb(0, 1, 1)).toEqual({ r: 1, g: 0, b: 0 });
  });
  it("converts hue 1/3 to green", () => {
    expect(hsvToRgb(1 / 3, 1, 1)).toEqual({ r: 0, g: 1, b: 0 });
  });
  it("converts hue 2/3 to blue", () => {
    expect(hsvToRgb(2 / 3, 1, 1)).toEqual({ r: 0, g: 0, b: 1 });
  });
  it("converts hue 1/6 to yellow", () => {
    const { r, g, b } = hsvToRgb(1 / 6, 1, 1);
    expect(r).toBeCloseTo(1);
    expect(g).toBeCloseTo(1);
    expect(b).toBeCloseTo(0);
  });
  it("converts hue 1/2 to cyan", () => {
    const { r, g, b } = hsvToRgb(1 / 2, 1, 1);
    expect(r).toBeCloseTo(0);
    expect(g).toBeCloseTo(1);
    expect(b).toBeCloseTo(1);
  });
  it("converts hue 5/6 to magenta", () => {
    const { r, g, b } = hsvToRgb(5 / 6, 1, 1);
    expect(r).toBeCloseTo(1);
    expect(g).toBeCloseTo(0);
    expect(b).toBeCloseTo(1);
  });
  it("wraps hue above 1", () => {
    const wrapped = hsvToRgb(1.2, 1, 1);
    const reference = hsvToRgb(0.2, 1, 1);
    expect(wrapped.r).toBeCloseTo(reference.r);
    expect(wrapped.g).toBeCloseTo(reference.g);
    expect(wrapped.b).toBeCloseTo(reference.b);
  });
  it("wraps negative hue", () => {
    const wrapped = hsvToRgb(-0.8, 1, 1);
    const reference = hsvToRgb(0.2, 1, 1);
    expect(wrapped.r).toBeCloseTo(reference.r);
    expect(wrapped.g).toBeCloseTo(reference.g);
    expect(wrapped.b).toBeCloseTo(reference.b);
  });
  it("converts hue 1 like hue 0", () => {
    expect(hsvToRgb(1, 1, 1)).toEqual({ r: 1, g: 0, b: 0 });
  });
  it("returns gray scaled by value when saturation is 0", () => {
    expect(hsvToRgb(0.4, 0, 0.5)).toEqual({ r: 0.5, g: 0.5, b: 0.5 });
  });
  it("returns black when value is 0", () => {
    expect(hsvToRgb(0.7, 1, 0)).toEqual({ r: 0, g: 0, b: 0 });
  });
  it("clamps saturation above 1", () => {
    expect(hsvToRgb(0, 5, 1)).toEqual(hsvToRgb(0, 1, 1));
  });
  it("clamps value below 0", () => {
    expect(hsvToRgb(0, 1, -3)).toEqual(hsvToRgb(0, 1, 0));
  });
  it("propagates NaN components", () => {
    const { r, g, b } = hsvToRgb(Number.NaN, 1, 1);
    expect([r, g, b].some(Number.isNaN)).toBe(true);
  });
});
