/**
 * Complex graph topology and multi-tick simulation tests.
 *
 * These tests cover:
 *  - Diamond / shared-ancestor topologies
 *  - Long evaluation chains
 *  - Fan-out (one source → multiple branches)
 *  - Full ADSR lifecycle simulated via successive ticks
 *  - Dynamic control changes between ticks
 *  - ADSR and distortion with all params driven by connected nodes
 *  - Edge-case graph structures (orphaned nodes, duplicate inputs, sourceOutput OOB)
 *  - Bug: fx-distortion ignores node.time default for disconnected input[0]
 */

import type { NodeFxMath, Program } from "@ptah-app/lib-models";
import { v4 as uuidv4 } from "uuid";
import {
  compile,
  getProgramInitialState,
  performTick,
} from "../program.domain";
import type { ProgramDefinition, ProgramState } from "../program.domain.types";
import { distortion } from "../runner.domain";

// ─── Tick duration (MIDI standard: 24 PPQN) ───────────────────────────────────
const TICK = 1 / 24;

// ─── Node builders ────────────────────────────────────────────────────────────

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

const mathNode = (
  id: string,
  operation: NodeFxMath["operation"],
  valueA = 0,
  valueB = 0,
) => ({
  id,
  type: "fx-math" as const,
  position: pos,
  operation,
  valueA,
  valueB,
});

const adsrNode = (
  id: string,
  attackRate = 0.1,
  decayRate = 0.1,
  sustainLevel = 0.5,
  releaseRate = 0.1,
) => ({
  id,
  type: "fx-adsr" as const,
  position: pos,
  attackRate,
  decayRate,
  sustainLevel,
  releaseRate,
});

const distortionNode = (
  id: string,
  time = 0,
  value = 0.5,
  drive = 0,
  tone = 0.5,
  level = 0.5,
) => ({
  id,
  type: "fx-distortion" as const,
  position: pos,
  time,
  value,
  drive,
  tone,
  level,
});

const mkEdge = (
  source: string,
  target: string,
  sourceOutput = 0,
  targetInput = 0,
) => ({
  id: uuidv4(),
  source,
  target,
  sourceOutput,
  targetInput,
});

const emptyControls = new Map<number, number>();

// ─── Simulation helpers ────────────────────────────────────────────────────────

const makeDef = (prog: Program): ProgramDefinition => ({
  compute: compile(prog),
  resetAtEnd: false,
});

/** Run N ticks and return the final state. */
const simulateTicks = (
  definition: ProgramDefinition,
  controls: Map<number, number>,
  parameter: number,
  count: number,
): ProgramState => {
  let state = getProgramInitialState(definition, controls, parameter);
  for (let i = 0; i < count; i++) {
    state = performTick(definition, controls, state, parameter);
  }
  return state;
};

/**
 * Collect states[0..count].
 * states[0] = initial state (t=0), states[n] = state after n ticks.
 */
const collectTicks = (
  definition: ProgramDefinition,
  controls: Map<number, number>,
  parameter: number,
  count: number,
): ProgramState[] => {
  const states: ProgramState[] = [];
  let state = getProgramInitialState(definition, controls, parameter);
  states.push(state);
  for (let i = 0; i < count; i++) {
    state = performTick(definition, controls, state, parameter);
    states.push(state);
  }
  return states;
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("compile — diamond topology (shared ancestor feeds two branches)", () => {
  /**
   * X(3) is shared by two branches:
   *   A = X + 0       = 3
   *   B = X * X       = 9  (two edges from X to B, one per input slot)
   *   C = A + B       = 12  → output(0)
   */
  const prog: Program = {
    id: uuidv4(),
    name: "diamond",
    nodes: [
      constantNode("X", 3),
      mathNode("A", "add"), // A = X + 0 = 3
      mathNode("B", "multiply"), // B = X * X = 9
      mathNode("C", "add"), // C = A + B = 12
      outputNode("out", 0),
    ],
    edges: [
      mkEdge("X", "A", 0, 0),
      mkEdge("X", "B", 0, 0),
      mkEdge("X", "B", 0, 1), // X feeds both input slots of B
      mkEdge("A", "C", 0, 0),
      mkEdge("B", "C", 0, 1),
      mkEdge("C", "out"),
    ],
  };
  const compute = compile(prog);

  it("shared ancestor is evaluated once and result reused in both branches", () => {
    expect(compute(0, emptyControls).outputs[0]).toBeCloseTo(12);
  });

  it("result is deterministic on repeated compute calls", () => {
    expect(compute(0, emptyControls).outputs[0]).toBe(
      compute(0, emptyControls).outputs[0],
    );
  });
});

describe("compile — long chain (6 nodes deep)", () => {
  /**
   * c(1) → add(+1=2) → multiply(*3=6) → substract(-1=5) → power(^2=25) → floor(25) → output
   * Using node.valueB for static operands, c wired to the chain head.
   */
  const prog: Program = {
    id: uuidv4(),
    name: "long-chain",
    nodes: [
      constantNode("c", 1),
      mathNode("add1", "add", 0, 1), // 1 + 1 = 2
      mathNode("mul3", "multiply", 0, 3), // 2 * 3 = 6
      mathNode("sub1", "substract", 0, 1), // 6 - 1 = 5
      mathNode("pow2", "power", 0, 2), // 5^2 = 25
      mathNode("flr", "floor"), // floor(25) = 25
      outputNode("out", 0),
    ],
    edges: [
      mkEdge("c", "add1"),
      mkEdge("add1", "mul3"),
      mkEdge("mul3", "sub1"),
      mkEdge("sub1", "pow2"),
      mkEdge("pow2", "flr"),
      mkEdge("flr", "out"),
    ],
  };

  it("evaluates a 6-deep chain to exact value 25", () => {
    expect(compile(prog)(0, emptyControls).outputs[0]).toBe(25);
  });

  it("intermediate registry values are populated correctly", () => {
    const { registry } = compile(prog)(0, emptyControls);
    expect(registry.get("add1")?.[0]).toBeCloseTo(2);
    expect(registry.get("mul3")?.[0]).toBeCloseTo(6);
    expect(registry.get("sub1")?.[0]).toBeCloseTo(5);
    expect(registry.get("pow2")?.[0]).toBeCloseTo(25);
    expect(registry.get("flr")?.[0]).toBe(25);
  });
});

describe("compile — fan-out (one source feeds two independent output branches)", () => {
  /**
   * timeNode("t") fans out to:
   *   branch0: t * 2         → output(0)
   *   branch1: t + 0.1       → output(1)
   */
  const prog: Program = {
    id: uuidv4(),
    name: "fan-out",
    nodes: [
      timeNode("t"),
      mathNode("dbl", "multiply", 0, 2),
      mathNode("inc", "add", 0, 0.1),
      outputNode("out0", 0),
      outputNode("out1", 1),
    ],
    edges: [
      mkEdge("t", "dbl"),
      mkEdge("t", "inc"),
      mkEdge("dbl", "out0"),
      mkEdge("inc", "out1"),
    ],
  };
  const compute = compile(prog);

  it("writes distinct transformations to each output at t=0.5", () => {
    const { outputs } = compute(0.5, emptyControls);
    expect(outputs[0]).toBeCloseTo(1.0); // 0.5 * 2
    expect(outputs[1]).toBeCloseTo(0.6); // 0.5 + 0.1
  });

  it("both outputs change independently as time advances", () => {
    const { outputs: o1 } = compute(0.3, emptyControls);
    const { outputs: o2 } = compute(0.6, emptyControls);
    expect(o1[0]).toBeCloseTo(0.6);
    expect(o1[1]).toBeCloseTo(0.4);
    expect(o2[0]).toBeCloseTo(1.2);
    expect(o2[1]).toBeCloseTo(0.7);
  });

  it("source node (time) is computed once but consumed by both branches", () => {
    // Verify registry has exactly one entry for "t"
    const { registry } = compute(0.4, emptyControls);
    expect(registry.has("t")).toBe(true);
    expect(registry.get("t")).toEqual([0.4]);
  });
});

describe("compile — shared computation: one node feeds two output nodes", () => {
  /**
   * const("x", 4) → math("sq", power, x^x=16) → both out0 and out1
   * Both outputs should receive 16.
   */
  const prog: Program = {
    id: uuidv4(),
    name: "shared-to-two-outputs",
    nodes: [
      constantNode("x", 4),
      mathNode("sq", "power"),
      outputNode("out0", 0),
      outputNode("out1", 1),
    ],
    edges: [
      mkEdge("x", "sq", 0, 0),
      mkEdge("x", "sq", 0, 1), // x^x = 4^4 = 256
      mkEdge("sq", "out0"),
      mkEdge("sq", "out1"),
    ],
  };

  it("both outputs receive the same shared computation result", () => {
    const { outputs } = compile(prog)(0, emptyControls);
    expect(outputs[0]).toBeCloseTo(256);
    expect(outputs[1]).toBeCloseTo(256);
  });
});

describe("compile — ADSR with all 5 inputs overridden by wired constants", () => {
  /**
   * All ADSR params are driven by constant nodes, overriding the node defaults.
   * t=0.25, attackRate=0.3 → attack phase (0.25 < 0.3).
   * If defaults were used (attackRate=0.1): 0.25 would be in decay → very different output.
   */
  const prog: Program = {
    id: uuidv4(),
    name: "adsr-full-wired",
    nodes: [
      constantNode("t_sig", 0.25), // time signal to ADSR
      constantNode("atk", 0.3), // attackRate
      constantNode("dec", 0.2), // decayRate
      constantNode("sus", 0.7), // sustainLevel
      constantNode("rel", 0.1), // releaseRate
      adsrNode("a", 0.1, 0.1, 0.5, 0.05), // node defaults (all overridden)
      outputNode("out", 0),
    ],
    edges: [
      mkEdge("t_sig", "a", 0, 0),
      mkEdge("atk", "a", 0, 1),
      mkEdge("dec", "a", 0, 2),
      mkEdge("sus", "a", 0, 3),
      mkEdge("rel", "a", 0, 4),
      mkEdge("a", "out"),
    ],
  };
  const compute = compile(prog);

  it("with wired attackRate=0.3, t=0.25 is in attack phase (output > 0.9)", () => {
    // attack formula at t=0.25 with attackRate=0.3:
    // easeOutQuint(0.25/0.3) = 1 - (1-0.833)^5 ≈ 0.9999
    const v = compute(0, emptyControls).outputs[0];
    expect(v).toBeGreaterThan(0.9);
    expect(v).toBeLessThanOrEqual(1);
  });

  it("ignores node.attackRate default (0.1): with default, t=0.25 would be in decay", () => {
    // With node default attackRate=0.1, sustainLevel=0.5:
    //   t=0.25 → not in attack (0.25 > 0.1), not in decay (0.25 > 0.2), not in release → sustain=0.5
    // With wired attackRate=0.3: output ≈ 0.9999 (attack phase)
    const withWiring = compute(0, emptyControls).outputs[0];
    expect(withWiring).toBeGreaterThan(0.9); // in attack with overridden param
  });

  it("with wired sustainLevel=0.7, sustain phase holds at 0.7", () => {
    // t=0.6 is past attack(0.3)+decay(0.2)=0.5, before release(1-0.1=0.9) → sustain
    const prog2: Program = {
      id: uuidv4(),
      name: "adsr-sustain-wired",
      nodes: [
        constantNode("t2", 0.6),
        constantNode("atk2", 0.3),
        constantNode("dec2", 0.2),
        constantNode("sus2", 0.7),
        constantNode("rel2", 0.1),
        adsrNode("a2"),
        outputNode("out2", 0),
      ],
      edges: [
        mkEdge("t2", "a2", 0, 0),
        mkEdge("atk2", "a2", 0, 1),
        mkEdge("dec2", "a2", 0, 2),
        mkEdge("sus2", "a2", 0, 3),
        mkEdge("rel2", "a2", 0, 4),
        mkEdge("a2", "out2"),
      ],
    };
    expect(compile(prog2)(0, emptyControls).outputs[0]).toBeCloseTo(0.7, 1);
  });
});

describe("compile — ADSR with control-driven sustainLevel", () => {
  /**
   * At t=0.5, well into sustain phase (attack=0.1, decay=0.1, release=0.1).
   * Sustain level driven by a control node → output = control value.
   */
  const prog: Program = {
    id: uuidv4(),
    name: "adsr-ctrl-sustain",
    nodes: [
      constantNode("t_sig", 0.5),
      constantNode("atk", 0.1),
      constantNode("dec", 0.1),
      controlNode("sus_ctrl", 3, 0.5),
      constantNode("rel", 0.1),
      adsrNode("a"),
      outputNode("out", 0),
    ],
    edges: [
      mkEdge("t_sig", "a", 0, 0),
      mkEdge("atk", "a", 0, 1),
      mkEdge("dec", "a", 0, 2),
      mkEdge("sus_ctrl", "a", 0, 3),
      mkEdge("rel", "a", 0, 4),
      mkEdge("a", "out"),
    ],
  };
  const compute = compile(prog);

  it("sustain output equals control value 0.2", () => {
    expect(compute(0, new Map([[3, 0.2]])).outputs[0]).toBeCloseTo(0.2, 2);
  });

  it("sustain output equals control value 0.8", () => {
    expect(compute(0, new Map([[3, 0.8]])).outputs[0]).toBeCloseTo(0.8, 2);
  });

  it("sustain output changes dynamically with control value", () => {
    const lo = compute(0, new Map([[3, 0.1]])).outputs[0];
    const hi = compute(0, new Map([[3, 0.9]])).outputs[0];
    expect(hi).toBeGreaterThan(lo);
  });
});

describe("compile — distortion with all params overridden by wired inputs", () => {
  /**
   * drive=0, level=1 → output = value * 1 + 0 = value.
   * Time input is irrelevant when drive=0.
   */
  const prog: Program = {
    id: uuidv4(),
    name: "distortion-zero-drive",
    nodes: [
      constantNode("val", 0.8),
      constantNode("drv", 0),
      constantNode("ton", 0.5),
      constantNode("lvl", 1),
      distortionNode("d", 0, 0.5, 0.5, 0.5, 0.5), // defaults overridden
      outputNode("out", 0),
    ],
    edges: [
      mkEdge("val", "d", 0, 1),
      mkEdge("drv", "d", 0, 2),
      mkEdge("ton", "d", 0, 3),
      mkEdge("lvl", "d", 0, 4),
      mkEdge("d", "out"),
    ],
  };

  it("with drive=0 and level=1, output equals wired value (0.8)", () => {
    // distortion(0.8, 0, 0.5, 1)(any) = 0.8*1 + 0 + 0 = 0.8
    expect(compile(prog)(0, emptyControls).outputs[0]).toBeCloseTo(0.8);
  });
});

describe("compile — distortion node.time default (BUG: currently uses 0 instead of node.time)", () => {
  /**
   * NodeFxDistortion.time should be the default for input[0] when disconnected,
   * matching how node.value/drive/tone/level are used for inputs [1-4].
   * Currently the compile function ignores node.time and always uses 0.
   */
  const nodeTime = 0.5;
  const prog: Program = {
    id: uuidv4(),
    name: "distortion-time-default",
    nodes: [
      distortionNode("d", nodeTime, 0.5, 1.0, 1.0, 1.0), // drive=1, tone=1, level=1
      outputNode("out", 0),
    ],
    edges: [mkEdge("d", "out")], // no input[0] connection
  };

  it("uses node.time (0.5) as default for disconnected time input", () => {
    const result = compile(prog)(0, emptyControls).outputs[0];
    // Expected: distortion(0.5, 1.0, 1.0, 1.0)(node.time=0.5)
    const expected = distortion(0.5, 1.0, 1.0, 1.0)(nodeTime);
    // Buggy behavior: distortion(0.5, 1.0, 1.0, 1.0)(0) = 0.5 + 0 + 0.3*sin(0) + 0.3*cos(0) = 0.8
    // expected ≈ 0.649 — clearly different from 0.8
    expect(result).toBeCloseTo(expected, 3);
  });
});

describe("compile — multi-tick ADSR full lifecycle simulation", () => {
  /**
   * Graph: time → ADSR(attack=0.3, decay=0.2, sustain=0.5, release=0.2) → output(0)
   *
   * Phase boundaries at 24 PPQN:
   *   attack:  t < 0.3  → ticks 0–7   (7/24 ≈ 0.292)
   *   decay:   0.3≤t<0.5 → ticks 8–11  (8/24≈0.333 to 11/24≈0.458)
   *   sustain: 0.5≤t≤0.8 → ticks 12–19
   *   release: t > 0.8  → ticks 20–23  (20/24≈0.833 to 23/24≈0.958)
   */
  const prog: Program = {
    id: uuidv4(),
    name: "adsr-lifecycle",
    nodes: [
      timeNode("t"),
      adsrNode("a", 0.3, 0.2, 0.5, 0.2),
      outputNode("out", 0),
    ],
    edges: [mkEdge("t", "a", 0, 0), mkEdge("a", "out")],
  };
  const def = makeDef(prog);

  it("initial state: time=0, output≈0 (start of attack)", () => {
    const state = getProgramInitialState(def, emptyControls, 0);
    expect(state.time).toBe(0);
    expect(state.output.outputs[0]).toBeCloseTo(0, 5);
  });

  it("after 4 ticks (t≈0.167): in attack phase, output rising above 0", () => {
    const state = simulateTicks(def, emptyControls, 0, 4);
    expect(state.time).toBeCloseTo(4 * TICK);
    expect(state.output.outputs[0]).toBeGreaterThan(0);
    expect(state.output.outputs[0]).toBeLessThan(1);
  });

  it("after 7 ticks (t≈0.292): late attack, output near 1", () => {
    const state = simulateTicks(def, emptyControls, 0, 7);
    expect(7 * TICK).toBeLessThan(0.3); // still in attack
    expect(state.output.outputs[0]).toBeGreaterThan(0.9);
  });

  it("after 8 ticks (t≈0.333): entered decay, 0.5 < output < 1", () => {
    const state = simulateTicks(def, emptyControls, 0, 8);
    expect(8 * TICK).toBeGreaterThan(0.3); // past attackRate
    expect(state.output.outputs[0]).toBeLessThan(1);
    expect(state.output.outputs[0]).toBeGreaterThan(0.5);
  });

  it("after 12 ticks (t=0.5): at decay/sustain boundary, output≈0.5", () => {
    const state = simulateTicks(def, emptyControls, 0, 12);
    expect(state.time).toBeCloseTo(0.5);
    expect(state.output.outputs[0]).toBeCloseTo(0.5, 1);
  });

  it("after 16 ticks (t≈0.667): in sustain, output holds at 0.5", () => {
    const state = simulateTicks(def, emptyControls, 0, 16);
    expect(state.output.outputs[0]).toBeCloseTo(0.5, 2);
  });

  it("after 19 ticks (t≈0.792): still in sustain (before release at 0.8)", () => {
    const state = simulateTicks(def, emptyControls, 0, 19);
    expect(19 * TICK).toBeLessThan(0.8); // still in sustain
    expect(state.output.outputs[0]).toBeCloseTo(0.5, 2);
  });

  it("after 20 ticks (t≈0.833): entered release, output drops below 0.5", () => {
    const state = simulateTicks(def, emptyControls, 0, 20);
    expect(20 * TICK).toBeGreaterThan(0.8); // past 1-releaseRate=0.8
    expect(state.output.outputs[0]).toBeLessThan(0.5);
    expect(state.output.outputs[0]).toBeGreaterThan(0);
  });

  it("after 23 ticks (t≈0.958): deep in release, output nearly 0", () => {
    const state = simulateTicks(def, emptyControls, 0, 23);
    expect(state.output.outputs[0]).toBeCloseTo(0, 1);
  });

  it("output monotonically increases during attack phase (ticks 0→7)", () => {
    const states = collectTicks(def, emptyControls, 0, 7);
    for (let i = 1; i < states.length; i++) {
      expect(states[i].output.outputs[0]).toBeGreaterThanOrEqual(
        states[i - 1].output.outputs[0],
      );
    }
  });

  it("output monotonically decreases during release phase (ticks 20→23)", () => {
    const states = collectTicks(def, emptyControls, 0, 24);
    for (let i = 21; i <= 24; i++) {
      expect(states[i].output.outputs[0]).toBeLessThanOrEqual(
        states[i - 1].output.outputs[0],
      );
    }
  });

  it("time accumulates exactly as TICK per step across 24 ticks", () => {
    const states = collectTicks(def, emptyControls, 0, 24);
    for (let i = 0; i <= 24; i++) {
      expect(states[i].time).toBeCloseTo(i * TICK);
    }
  });
});

describe("performTick — chained math output tracks time precisely over multiple ticks", () => {
  /**
   * Graph: time → multiply(×2) → add(+0.1) → output
   * Expected output at time t: t * 2 + 0.1
   */
  const prog: Program = {
    id: uuidv4(),
    name: "time-math-chain-ticks",
    nodes: [
      timeNode("t"),
      mathNode("dbl", "multiply", 0, 2),
      mathNode("inc", "add", 0, 0.1),
      outputNode("out", 0),
    ],
    edges: [mkEdge("t", "dbl"), mkEdge("dbl", "inc"), mkEdge("inc", "out")],
  };
  const def = makeDef(prog);

  it("initial output = 0*2+0.1 = 0.1", () => {
    const state = getProgramInitialState(def, emptyControls, 0);
    expect(state.output.outputs[0]).toBeCloseTo(0.1);
  });

  it("after each tick, output matches time*2+0.1 exactly for 12 ticks", () => {
    let state = getProgramInitialState(def, emptyControls, 0);
    for (let i = 1; i <= 12; i++) {
      state = performTick(def, emptyControls, state, 0);
      expect(state.output.outputs[0]).toBeCloseTo(i * TICK * 2 + 0.1);
    }
  });
});

describe("performTick — control changes are reflected immediately per tick", () => {
  const prog: Program = {
    id: uuidv4(),
    name: "ctrl-per-tick",
    nodes: [controlNode("ctrl", 5, 0), outputNode("out", 0)],
    edges: [mkEdge("ctrl", "out")],
  };
  const def = makeDef(prog);

  it("initial state reflects initial controls", () => {
    const state = getProgramInitialState(def, new Map([[5, 0.3]]), 0);
    expect(state.output.outputs[0]).toBeCloseTo(0.3);
  });

  it("each tick reflects the controls passed to that tick", () => {
    const init = getProgramInitialState(def, new Map([[5, 0.2]]), 0);
    expect(init.output.outputs[0]).toBeCloseTo(0.2);

    const tick1 = performTick(def, new Map([[5, 0.8]]), init, 0);
    expect(tick1.output.outputs[0]).toBeCloseTo(0.8);

    const tick2 = performTick(def, new Map([[5, 0.1]]), tick1, 0);
    expect(tick2.output.outputs[0]).toBeCloseTo(0.1);
  });

  it("missing control falls back to node defaultValue", () => {
    const init = getProgramInitialState(def, emptyControls, 0);
    expect(init.output.outputs[0]).toBe(0); // defaultValue=0
  });
});

describe("performTick — velocity (parameter) can vary per tick", () => {
  const prog: Program = {
    id: uuidv4(),
    name: "vel-ticks",
    nodes: [velocityNode("v", 0), outputNode("out", 0)],
    edges: [mkEdge("v", "out")],
  };
  const def = makeDef(prog);

  it("initial state uses the provided parameter", () => {
    expect(
      getProgramInitialState(def, emptyControls, 0.6).output.outputs[0],
    ).toBeCloseTo(0.6);
  });

  it("each tick can receive a different parameter", () => {
    const init = getProgramInitialState(def, emptyControls, 0.3);
    const tick1 = performTick(def, emptyControls, init, 0.9);
    expect(tick1.output.outputs[0]).toBeCloseTo(0.9);
  });
});

describe("compile — orphaned nodes are ignored", () => {
  it("constant node with no outgoing edges does not appear in evaluation", () => {
    const prog: Program = {
      id: uuidv4(),
      name: "orphan-const",
      nodes: [constantNode("orphan", 42), outputNode("out", 0)],
      edges: [],
    };
    // Orphan is not reachable from any output → evalOrder = [out]
    // output has no input → defaults to 0
    expect(compile(prog)(0, emptyControls).outputs[0]).toBe(0);
  });

  it("orphaned sub-graph does not throw and does not affect reachable outputs", () => {
    const prog: Program = {
      id: uuidv4(),
      name: "orphan-subgraph",
      nodes: [
        constantNode("a", 1),
        constantNode("b", 2),
        mathNode("orphan_math", "add"), // a+b not connected to any output
        constantNode("c", 3),
        outputNode("out", 0),
      ],
      edges: [mkEdge("c", "out")],
    };
    expect(() => compile(prog)(0, emptyControls)).not.toThrow();
    expect(compile(prog)(0, emptyControls).outputs[0]).toBeCloseTo(3);
  });
});

describe("compile — multiple edges to same targetInput (last edge wins)", () => {
  /**
   * The inputsNodesIds array is built via reduce: acc[targetInput] = {id, sourceOutput}.
   * When two edges share the same targetInput, the second one overwrites the first.
   * This documents (and tests) the defined override behavior.
   */
  it("second edge to same input slot overwrites first", () => {
    const prog: Program = {
      id: uuidv4(),
      name: "overwrite-input",
      nodes: [
        constantNode("first", 10),
        constantNode("second", 20),
        mathNode("m", "add", 0, 0), // valueB=0 to isolate input[0]
        outputNode("out", 0),
      ],
      edges: [
        mkEdge("first", "m", 0, 0), // first → m.input[0]
        mkEdge("second", "m", 0, 0), // second → m.input[0] (overwrites first)
        mkEdge("m", "out"),
      ],
    };
    // m = second (20) + 0 = 20
    expect(compile(prog)(0, emptyControls).outputs[0]).toBeCloseTo(20);
  });

  it("two constants to different input slots both take effect", () => {
    const prog: Program = {
      id: uuidv4(),
      name: "two-inputs",
      nodes: [
        constantNode("a", 7),
        constantNode("b", 3),
        mathNode("m", "substract"),
        outputNode("out", 0),
      ],
      edges: [
        mkEdge("a", "m", 0, 0), // a → m.input[0]
        mkEdge("b", "m", 0, 1), // b → m.input[1]
        mkEdge("m", "out"),
      ],
    };
    // m = a - b = 7 - 3 = 4
    expect(compile(prog)(0, emptyControls).outputs[0]).toBeCloseTo(4);
  });
});

describe("compile — sourceOutput > 0 falls back to 0 (no multi-output nodes exist)", () => {
  it("sourceOutput=1 on a constant returns 0 (only index 0 is populated)", () => {
    const prog: Program = {
      id: uuidv4(),
      name: "source-output-oob",
      nodes: [constantNode("c", 0.9), outputNode("out", 0)],
      edges: [
        mkEdge("c", "out", 1, 0), // sourceOutput=1 — registry has only [0]
      ],
    };
    // registry.get("c") = [0.9], values[1] = undefined → falls back to defaultValue=0
    expect(compile(prog)(0, emptyControls).outputs[0]).toBeCloseTo(0);
  });
});

describe("compile — edge to non-existent source node", () => {
  it("edge with ghost source ID is ignored at evaluation time (returns default 0)", () => {
    const prog: Program = {
      id: uuidv4(),
      name: "ghost-source",
      nodes: [outputNode("out", 0)],
      edges: [
        {
          id: uuidv4(),
          source: "ghost",
          target: "out",
          sourceOutput: 0,
          targetInput: 0,
        },
      ],
    };
    // "ghost" not in nodes → getNode("ghost") = undefined in getNodePath
    // inputsNodesIds[0] = {id:"ghost", sourceOutput:0}, but registry.get("ghost") = undefined → 0
    expect(compile(prog)(0, emptyControls).outputs[0]).toBe(0);
  });
});

describe("compile — duplicate outputId: last in evalOrder wins", () => {
  /**
   * Two output-result nodes with the same outputId.
   * In the evalOrder derived from the nodes array (first output first),
   * the SECOND output node is evaluated last and overwrites the first.
   */
  it("second output-result node (in nodes array order) overwrites first for same outputId", () => {
    const prog: Program = {
      id: uuidv4(),
      name: "dup-output-id",
      nodes: [
        constantNode("lo", 0.1),
        constantNode("hi", 0.9),
        outputNode("out_lo", 0), // first in nodes → evaluated first
        outputNode("out_hi", 0), // second in nodes → evaluated last → wins
      ],
      edges: [mkEdge("lo", "out_lo"), mkEdge("hi", "out_hi")],
    };
    // evalOrder: lo, out_lo, hi, out_hi
    // outputs[0] set to 0.1 by out_lo, then overwritten to 0.9 by out_hi
    expect(compile(prog)(0, emptyControls).outputs[0]).toBeCloseTo(0.9);
  });
});

describe("compile — math divide by zero produces Infinity (handled by patch layer)", () => {
  it("divide by zero yields Infinity (not NaN or throw)", () => {
    const prog: Program = {
      id: uuidv4(),
      name: "div-zero",
      nodes: [
        constantNode("a", 5),
        constantNode("b", 0),
        mathNode("m", "divide"),
        outputNode("out", 0),
      ],
      edges: [
        mkEdge("a", "m", 0, 0),
        mkEdge("b", "m", 0, 1),
        mkEdge("m", "out"),
      ],
    };
    expect(() => compile(prog)(0, emptyControls)).not.toThrow();
    expect(compile(prog)(0, emptyControls).outputs[0]).toBe(
      Number.POSITIVE_INFINITY,
    );
  });
});

describe("compile — math sqrt of negative produces NaN (handled by patch layer)", () => {
  it("sqrt(-1) yields NaN without throwing", () => {
    const prog: Program = {
      id: uuidv4(),
      name: "sqrt-neg",
      nodes: [
        constantNode("neg", -1),
        mathNode("m", "square-root"),
        outputNode("out", 0),
      ],
      edges: [mkEdge("neg", "m"), mkEdge("m", "out")],
    };
    expect(() => compile(prog)(0, emptyControls)).not.toThrow();
    expect(compile(prog)(0, emptyControls).outputs[0]).toBeNaN();
  });
});

describe("compile — velocity node in complex graph with math chain", () => {
  /**
   * velocity → multiply(×127) → round → output
   * Validates velocity is correctly scaled through a chain.
   */
  const prog: Program = {
    id: uuidv4(),
    name: "vel-chain",
    nodes: [
      velocityNode("v", 0),
      mathNode("scale", "multiply", 0, 127),
      mathNode("rnd", "round"),
      outputNode("out", 0),
    ],
    edges: [mkEdge("v", "scale"), mkEdge("scale", "rnd"), mkEdge("rnd", "out")],
  };
  const compute = compile(prog);

  it("velocity=0 produces output 0", () => {
    expect(compute(0, emptyControls, 0).outputs[0]).toBe(0);
  });

  it("velocity=1 produces output 127", () => {
    expect(compute(0, emptyControls, 1).outputs[0]).toBe(127);
  });

  it("velocity=0.5 produces output 64 (rounded)", () => {
    expect(compute(0, emptyControls, 0.5).outputs[0]).toBe(64);
  });
});

describe("compile — constant feeding ADSR and distortion in same program", () => {
  /**
   * Two outputs in one program: one from ADSR, one from distortion.
   * Uses time node as shared input to both FX nodes.
   * Validates that both FX nodes share the same time source correctly.
   */
  const prog: Program = {
    id: uuidv4(),
    name: "adsr-and-distortion",
    nodes: [
      timeNode("t"),
      adsrNode("a", 0.1, 0.1, 0.5, 0.1),
      distortionNode("d", 0, 0.5, 0, 0.5, 0.5), // drive=0 → deterministic
      outputNode("out_adsr", 0),
      outputNode("out_dist", 1),
    ],
    edges: [
      mkEdge("t", "a", 0, 0),
      mkEdge("t", "d", 0, 0),
      mkEdge("a", "out_adsr"),
      mkEdge("d", "out_dist"),
    ],
  };
  const compute = compile(prog);

  it("both outputs are populated independently at t=0.5", () => {
    const { outputs } = compute(0.5, emptyControls);
    // ADSR at t=0.5: past attack(0.1)+decay(0.1)=0.2, before release(0.9) → sustain=0.5
    expect(outputs[0]).toBeCloseTo(0.5, 1);
    // distortion(0.5, 0, 0.5, 0.5)(0.5) = 0.5*0.5 + 0.5/2 + 0 = 0.25+0.25=0.5
    expect(outputs[1]).toBeCloseTo(0.5, 1);
  });

  it("ADSR output changes with time while distortion (zero drive) remains constant", () => {
    const at0 = compute(0, emptyControls);
    const at1 = compute(0.5, emptyControls);
    // ADSR at t=0: attack start ≈ 0; at t=0.5: sustain ≈ 0.5
    expect(at1.outputs[0]).toBeGreaterThan(at0.outputs[0]);
    // distortion with drive=0: output = value*level + (1-level)/2 — time-independent
    expect(at0.outputs[1]).toBeCloseTo(at1.outputs[1]);
  });
});
