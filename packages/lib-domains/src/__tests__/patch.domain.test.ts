import {
  applyMapping,
  capValue,
  extractProgramMappingFromShowPatch,
  fromChannelValue,
  toChannelValue,
  unInfinitifyValue,
  unNaNifyValue,
} from "../patch.domain";

describe("unNaNifyValue", () => {
  it("returns 0 for NaN", () => expect(unNaNifyValue(NaN)).toBe(0));
  it("passes through finite numbers", () => expect(unNaNifyValue(0.5)).toBe(0.5));
  it("passes through 0", () => expect(unNaNifyValue(0)).toBe(0));
  it("passes through negative numbers", () => expect(unNaNifyValue(-1)).toBe(-1));
});

describe("unInfinitifyValue", () => {
  it("maps +Infinity to 255", () => expect(unInfinitifyValue(Infinity)).toBe(255));
  it("maps -Infinity to 0", () => expect(unInfinitifyValue(-Infinity)).toBe(0));
  it("maps NaN (non-finite) to 0", () => expect(unInfinitifyValue(NaN)).toBe(0));
  it("passes through finite values", () => expect(unInfinitifyValue(0.7)).toBe(0.7));
  it("passes through 0", () => expect(unInfinitifyValue(0)).toBe(0));
});

describe("capValue", () => {
  it("converts 0.0 to 0", () => expect(capValue(0)).toBe(0));
  it("converts 1.0 to 255", () => expect(capValue(1)).toBe(255));
  it("converts 0.5 to 128 (rounds)", () => expect(capValue(0.5)).toBe(128));
  it("clamps below 0 to 0", () => expect(capValue(-1)).toBe(0));
  it("clamps above 1 to 255", () => expect(capValue(2)).toBe(255));
  it("rounds 0.501 to 128", () => expect(capValue(0.501)).toBe(128));
});

describe("toChannelValue", () => {
  it("converts NaN to 0", () => expect(toChannelValue(NaN)).toBe(0));
  it("converts Infinity to 255", () => expect(toChannelValue(Infinity)).toBe(255));
  it("converts -Infinity to 0", () => expect(toChannelValue(-Infinity)).toBe(0));
  it("converts 0.5 to 128", () => expect(toChannelValue(0.5)).toBe(128));
  it("converts 1.0 to 255", () => expect(toChannelValue(1)).toBe(255));
  it("converts 0.0 to 0", () => expect(toChannelValue(0)).toBe(0));
});

describe("fromChannelValue", () => {
  it("converts 255 to 1", () => expect(fromChannelValue(255)).toBe(1));
  it("converts 0 to 0", () => expect(fromChannelValue(0)).toBe(0));
  it("clamps above 255 to 1", () => expect(fromChannelValue(300)).toBe(1));
  it("clamps below 0 to 0", () => expect(fromChannelValue(-50)).toBe(0));
});

describe("extractProgramMappingFromShowPatch", () => {
  const programId = "abc-123";

  it("returns empty mapping when patch is empty", () => {
    expect(extractProgramMappingFromShowPatch({}, programId)).toEqual({});
  });

  it("maps a single channel output correctly", () => {
    const patch = {
      "1": [{ programId, programOutput: 0 }],
    };
    expect(extractProgramMappingFromShowPatch(patch, programId)).toEqual({
      0: [1],
    });
  });

  it("maps multiple outputs to different channels", () => {
    const patch = {
      "1": [{ programId, programOutput: 0 }],
      "2": [{ programId, programOutput: 1 }],
    };
    const result = extractProgramMappingFromShowPatch(patch, programId);
    expect(result).toEqual({ 0: [1], 1: [2] });
  });

  it("maps one output to multiple channels (fan-out)", () => {
    const patch = {
      "1": [{ programId, programOutput: 0 }],
      "2": [{ programId, programOutput: 0 }],
    };
    const result = extractProgramMappingFromShowPatch(patch, programId);
    expect(result[0]).toContain(1);
    expect(result[0]).toContain(2);
  });

  it("ignores entries for other programIds", () => {
    const patch = {
      "1": [{ programId: "other-program", programOutput: 0 }],
      "2": [{ programId, programOutput: 0 }],
    };
    const result = extractProgramMappingFromShowPatch(patch, programId);
    expect(result).toEqual({ 0: [2] });
  });
});

describe("applyMapping", () => {
  it("applies a single output to a single channel", () => {
    const output = { outputs: { 0: 0.5 }, registry: new Map() };
    const mapping = { 0: [10] };
    expect(applyMapping(output, mapping)).toEqual({ 10: 128 });
  });

  it("fans out one output to multiple channels", () => {
    const output = { outputs: { 0: 1.0 }, registry: new Map() };
    const mapping = { 0: [1, 2, 3] };
    expect(applyMapping(output, mapping)).toEqual({ 1: 255, 2: 255, 3: 255 });
  });

  it("returns empty for empty mapping", () => {
    const output = { outputs: { 0: 0.5 }, registry: new Map() };
    expect(applyMapping(output, {})).toEqual({});
  });

  it("maps NaN output to channel value 0", () => {
    const output = { outputs: { 0: NaN }, registry: new Map() };
    const mapping = { 0: [5] };
    expect(applyMapping(output, mapping)).toEqual({ 5: 0 });
  });

  it("maps Infinity output to channel value 255", () => {
    const output = { outputs: { 0: Infinity }, registry: new Map() };
    const mapping = { 0: [5] };
    expect(applyMapping(output, mapping)).toEqual({ 5: 255 });
  });
});
