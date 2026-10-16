import {
  adsr,
  distortion,
  mathNodeOperatorHasSecondValue,
} from "../runner.domain";

describe("adsr", () => {
  const fn = adsr(0.1, 0.1, 0.5, 0.1);

  it("returns 0 at t=0 (start of attack)", () => {
    expect(fn(0)).toBeCloseTo(0);
  });

  it("reaches near 1 at end of attack phase (t = attackRate)", () => {
    expect(fn(0.1)).toBeCloseTo(1, 1);
  });

  it("decays toward sustainLevel during decay phase", () => {
    const v = fn(0.15);
    expect(v).toBeGreaterThan(0.5);
    expect(v).toBeLessThan(1);
  });

  it("holds sustainLevel during sustain phase", () => {
    expect(fn(0.5)).toBeCloseTo(0.5, 1);
  });

  it("releases from sustainLevel toward 0 at end", () => {
    const v = fn(0.95);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(0.5);
  });

  it("clamps output to [0, 1]", () => {
    expect(fn(0.05)).toBeGreaterThanOrEqual(0);
    expect(fn(0.05)).toBeLessThanOrEqual(1);
  });

  it("handles zero attack rate (immediate onset)", () => {
    const instant = adsr(0, 0.1, 0.5, 0.1);
    expect(instant(0)).toBeCloseTo(1, 1);
  });

  it("handles full sustain (no decay, no release)", () => {
    const sustained = adsr(0.1, 0, 0.8, 0);
    expect(sustained(0.5)).toBeCloseTo(0.8, 1);
  });
});

describe("distortion", () => {
  it("returns a number", () => {
    const fn = distortion(0.5, 0.5, 0.5, 0.5);
    expect(typeof fn(0)).toBe("number");
  });

  it("with zero drive produces simple level-mixed output", () => {
    // drive=0 eliminates harmonic terms; result = value * level + (1-level)/2
    const fn = distortion(0.5, 0, 0.5, 0.5);
    expect(fn(0)).toBeCloseTo(0.5 * 0.5 + 0.5 / 2);
  });

  it("outputs differ for different time values when drive > 0", () => {
    const fn = distortion(0.5, 0.8, 0.5, 0.5);
    expect(fn(0)).not.toBeCloseTo(fn(0.5));
  });

  it("level=1 passes value through (no mixing)", () => {
    const fn = distortion(0.7, 0, 0, 1);
    expect(fn(0)).toBeCloseTo(0.7);
  });

  it("level=0 produces flat mid (0.5) with no drive", () => {
    const fn = distortion(0.7, 0, 0, 0);
    expect(fn(0)).toBeCloseTo(0.5);
  });
});

describe("mathNodeOperatorHasSecondValue", () => {
  it.each([
    "add",
    "substract",
    "divide",
    "multiply",
    "modulo",
    "power",
  ])("returns true for binary operator %s", (op) => {
    expect(mathNodeOperatorHasSecondValue(op)).toBe(true);
  });

  it.each([
    "sinus",
    "cosinus",
    "tangent",
    "arcsinus",
    "arccosinus",
    "arctangent",
    "exponential",
    "logarithm",
    "square-root",
    "absolute",
    "round",
    "floor",
    "ceil",
  ])("returns false for unary operator %s", (op) => {
    expect(mathNodeOperatorHasSecondValue(op)).toBe(false);
  });

  it("returns false for unknown operator", () => {
    expect(mathNodeOperatorHasSecondValue("unknown")).toBe(false);
  });
});
