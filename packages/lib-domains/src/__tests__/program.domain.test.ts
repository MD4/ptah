import { v4 as uuidv4 } from "uuid";
import type { Program } from "@ptah-app/lib-models";
import {
  compile,
  createProgram,
  getProgramInitialState,
  performTick,
} from "../program.domain";

const pos = { x: 0, y: 0 };

const constantNode = (id: string, value: number) => ({
  id,
  type: "input-constant" as const,
  position: pos,
  value,
});

const timeNode = (id: string) => ({
  id,
  type: "input-time" as const,
  position: pos,
});

const controlNode = (id: string, controlId: number, defaultValue = 0) => ({
  id,
  type: "input-control" as const,
  position: pos,
  controlId,
  defaultValue,
});

const velocityNode = (id: string, defaultValue = 0) => ({
  id,
  type: "input-velocity" as const,
  position: pos,
  defaultValue,
});

const outputNode = (id: string, outputId: number) => ({
  id,
  type: "output-result" as const,
  position: pos,
  outputId,
});

const mathNode = (id: string, operation: string, valueA = 0, valueB = 0) => ({
  id,
  type: "fx-math" as const,
  position: pos,
  operation: operation as any,
  valueA,
  valueB,
});

const adsrNode = (
  id: string,
  attackRate = 0.1,
  decayRate = 0.1,
  sustainLevel = 0.5,
  releaseRate = 0.1
) => ({
  id,
  type: "fx-adsr" as const,
  position: pos,
  attackRate,
  decayRate,
  sustainLevel,
  releaseRate,
});

const mkEdge = (
  source: string,
  target: string,
  sourceOutput = 0,
  targetInput = 0
) => ({
  id: uuidv4(),
  source,
  target,
  sourceOutput,
  targetInput,
});

const emptyControls = new Map<number, number>();

describe("createProgram", () => {
  it("creates a program with the given name", () => {
    const p = createProgram("test");
    expect(p.name).toBe("test");
    expect(p.nodes).toEqual([]);
    expect(p.edges).toEqual([]);
  });

  it("assigns unique UUIDs", () => {
    const a = createProgram("a");
    const b = createProgram("b");
    expect(a.id).not.toBe(b.id);
  });

  it("assigns valid UUID format", () => {
    const p = createProgram("test");
    expect(p.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });
});

describe("compile — empty program", () => {
  it("returns empty outputs for a program with no output nodes", () => {
    const prog: Program = { id: uuidv4(), name: "empty", nodes: [], edges: [] };
    const result = compile(prog)(0, emptyControls);
    expect(result.outputs).toEqual({});
  });
});

describe("compile — constant → output", () => {
  const prog: Program = {
    id: uuidv4(),
    name: "const-out",
    nodes: [constantNode("c", 0.5), outputNode("out", 0)],
    edges: [mkEdge("c", "out")],
  };
  const compute = compile(prog);

  it("passes constant value to output", () => {
    expect(compute(0, emptyControls).outputs[0]).toBe(0.5);
  });

  it("output is same at any time (constant is time-independent)", () => {
    expect(compute(0, emptyControls).outputs[0]).toBe(
      compute(100, emptyControls).outputs[0]
    );
  });
});

describe("compile — time → output", () => {
  const prog: Program = {
    id: uuidv4(),
    name: "time-out",
    nodes: [timeNode("t"), outputNode("out", 0)],
    edges: [mkEdge("t", "out")],
  };
  const compute = compile(prog);

  it("passes time as output", () => {
    expect(compute(0.42, emptyControls).outputs[0]).toBe(0.42);
  });

  it("reflects different time values", () => {
    expect(compute(1, emptyControls).outputs[0]).toBe(1);
    expect(compute(0.5, emptyControls).outputs[0]).toBe(0.5);
  });
});

describe("compile — control → output", () => {
  const prog: Program = {
    id: uuidv4(),
    name: "ctrl-out",
    nodes: [controlNode("ctrl", 7, 0), outputNode("out", 0)],
    edges: [mkEdge("ctrl", "out")],
  };
  const compute = compile(prog);

  it("uses control value from inputs map", () => {
    const inputs = new Map([[7, 0.8]]);
    expect(compute(0, inputs).outputs[0]).toBe(0.8);
  });

  it("falls back to defaultValue when control not in map", () => {
    expect(compute(0, emptyControls).outputs[0]).toBe(0);
  });

  it("ignores controls for other controlIds", () => {
    const inputs = new Map([[99, 1.0]]);
    expect(compute(0, inputs).outputs[0]).toBe(0);
  });
});

describe("compile — velocity → output", () => {
  const prog: Program = {
    id: uuidv4(),
    name: "vel-out",
    nodes: [velocityNode("v", 0), outputNode("out", 0)],
    edges: [mkEdge("v", "out")],
  };
  const compute = compile(prog);

  it("uses parameter as velocity", () => {
    expect(compute(0, emptyControls, 0.9).outputs[0]).toBe(0.9);
  });

  it("falls back to defaultValue when parameter is undefined", () => {
    expect(compute(0, emptyControls, undefined).outputs[0]).toBe(0);
  });
});

describe("compile — disconnected output defaults to 0", () => {
  const prog: Program = {
    id: uuidv4(),
    name: "disconnected",
    nodes: [outputNode("out", 0)],
    edges: [],
  };

  it("defaults disconnected output to 0", () => {
    expect(compile(prog)(0, emptyControls).outputs[0]).toBe(0);
  });
});

describe("compile — math node operations", () => {
  const makeBinaryProg = (op: string, a: number, b: number): Program => ({
    id: uuidv4(),
    name: op,
    nodes: [constantNode("a", a), constantNode("b", b), mathNode("m", op), outputNode("out", 0)],
    edges: [mkEdge("a", "m", 0, 0), mkEdge("b", "m", 0, 1), mkEdge("m", "out")],
  });

  const makeUnaryProg = (op: string, a: number): Program => ({
    id: uuidv4(),
    name: op,
    nodes: [constantNode("a", a), mathNode("m", op), outputNode("out", 0)],
    edges: [mkEdge("a", "m", 0, 0), mkEdge("m", "out")],
  });

  it("add", () => {
    expect(compile(makeBinaryProg("add", 0.3, 0.2))(0, emptyControls).outputs[0]).toBeCloseTo(0.5);
  });
  it("substract", () => {
    expect(compile(makeBinaryProg("substract", 1, 0.3))(0, emptyControls).outputs[0]).toBeCloseTo(0.7);
  });
  it("multiply", () => {
    expect(compile(makeBinaryProg("multiply", 2, 3))(0, emptyControls).outputs[0]).toBeCloseTo(6);
  });
  it("divide", () => {
    expect(compile(makeBinaryProg("divide", 1, 4))(0, emptyControls).outputs[0]).toBeCloseTo(0.25);
  });
  it("modulo", () => {
    expect(compile(makeBinaryProg("modulo", 7, 3))(0, emptyControls).outputs[0]).toBeCloseTo(1);
  });
  it("power", () => {
    expect(compile(makeBinaryProg("power", 2, 3))(0, emptyControls).outputs[0]).toBeCloseTo(8);
  });
  it("sinus", () => {
    expect(compile(makeUnaryProg("sinus", Math.PI / 2))(0, emptyControls).outputs[0]).toBeCloseTo(1);
  });
  it("cosinus", () => {
    expect(compile(makeUnaryProg("cosinus", 0))(0, emptyControls).outputs[0]).toBeCloseTo(1);
  });
  it("tangent", () => {
    expect(compile(makeUnaryProg("tangent", 0))(0, emptyControls).outputs[0]).toBeCloseTo(0);
  });
  it("absolute", () => {
    expect(compile(makeUnaryProg("absolute", -5))(0, emptyControls).outputs[0]).toBeCloseTo(5);
  });
  it("square-root", () => {
    expect(compile(makeUnaryProg("square-root", 9))(0, emptyControls).outputs[0]).toBeCloseTo(3);
  });
  it("exponential", () => {
    expect(compile(makeUnaryProg("exponential", 1))(0, emptyControls).outputs[0]).toBeCloseTo(Math.E);
  });
  it("logarithm", () => {
    expect(compile(makeUnaryProg("logarithm", Math.E))(0, emptyControls).outputs[0]).toBeCloseTo(1);
  });
  it("round", () => {
    expect(compile(makeUnaryProg("round", 2.7))(0, emptyControls).outputs[0]).toBe(3);
  });
  it("floor", () => {
    expect(compile(makeUnaryProg("floor", 2.9))(0, emptyControls).outputs[0]).toBe(2);
  });
  it("ceil", () => {
    expect(compile(makeUnaryProg("ceil", 2.1))(0, emptyControls).outputs[0]).toBe(3);
  });
  it("arcsinus", () => {
    expect(compile(makeUnaryProg("arcsinus", 1))(0, emptyControls).outputs[0]).toBeCloseTo(Math.PI / 2);
  });
  it("arccosinus", () => {
    expect(compile(makeUnaryProg("arccosinus", 1))(0, emptyControls).outputs[0]).toBeCloseTo(0);
  });
  it("arctangent", () => {
    expect(compile(makeUnaryProg("arctangent", 1))(0, emptyControls).outputs[0]).toBeCloseTo(Math.PI / 4);
  });
});

describe("compile — multiple outputs", () => {
  const prog: Program = {
    id: uuidv4(),
    name: "multi-out",
    nodes: [
      constantNode("c1", 0.1),
      constantNode("c2", 0.9),
      outputNode("out1", 0),
      outputNode("out2", 1),
    ],
    edges: [mkEdge("c1", "out1"), mkEdge("c2", "out2")],
  };

  it("writes to distinct output slots", () => {
    const result = compile(prog)(0, emptyControls);
    expect(result.outputs[0]).toBeCloseTo(0.1);
    expect(result.outputs[1]).toBeCloseTo(0.9);
  });
});

describe("compile — fx-adsr node", () => {
  const prog: Program = {
    id: uuidv4(),
    name: "adsr-prog",
    nodes: [
      timeNode("t"),
      adsrNode("a", 0.1, 0.1, 0.5, 0.1),
      outputNode("out", 0),
    ],
    edges: [
      mkEdge("t", "a", 0, 0),
      mkEdge("a", "out"),
    ],
  };
  const compute = compile(prog);

  it("returns value between 0 and 1", () => {
    const v = compute(0.05, emptyControls).outputs[0];
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  });

  it("uses node defaults when inputs are disconnected (returns value in [0,1])", () => {
    const progNoInputs: Program = {
      id: uuidv4(),
      name: "adsr-defaults",
      nodes: [adsrNode("a", 0.1, 0.1, 0.5, 0.1), outputNode("out", 0)],
      edges: [mkEdge("a", "out")],
    };
    const v = compile(progNoInputs)(0.5, emptyControls).outputs[0];
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  });
});

describe("compile — cycle detection (visited guard)", () => {
  it("does not infinite-loop on cyclic edges", () => {
    const prog: Program = {
      id: uuidv4(),
      name: "cyclic",
      nodes: [mathNode("a", "add"), outputNode("out", 0)],
      edges: [
        mkEdge("a", "a", 0, 0), // self-loop
        mkEdge("a", "out"),
      ],
    };
    expect(() => compile(prog)(0, emptyControls)).not.toThrow();
  });
});

describe("compile — unknown node type throws", () => {
  it("throws when unknown node type encountered", () => {
    const prog = {
      id: uuidv4(),
      name: "bad",
      nodes: [
        { id: "x", type: "unknown-type", position: pos },
        outputNode("out", 0),
      ],
      edges: [mkEdge("x", "out")],
    } as unknown as Program;
    const compute = compile(prog);
    expect(() => compute(0, emptyControls)).toThrow("Node not implemented");
  });
});

describe("performTick", () => {
  const prog: Program = {
    id: uuidv4(),
    name: "tick",
    nodes: [timeNode("t"), outputNode("out", 0)],
    edges: [mkEdge("t", "out")],
  };
  const definition = { compute: compile(prog), resetAtEnd: false };
  const initialState = getProgramInitialState(definition, emptyControls);

  it("starts at time 0", () => {
    expect(initialState.time).toBe(0);
  });

  it("increments time by 1/24 per tick", () => {
    const next = performTick(definition, emptyControls, initialState, 0);
    expect(next.time).toBeCloseTo(1 / 24);
  });

  it("output reflects new time value", () => {
    const next = performTick(definition, emptyControls, initialState, 0);
    expect(next.output.outputs[0]).toBeCloseTo(1 / 24);
  });

  it("accumulates time across multiple ticks", () => {
    let state = initialState;
    for (let i = 0; i < 24; i++) {
      state = performTick(definition, emptyControls, state, 0);
    }
    expect(state.time).toBeCloseTo(1);
  });
});
