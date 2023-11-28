import type { Graph } from "./graph.types";
import type { Patch, PatchItem } from "./patch.types";
import { compile } from "./program.api";

const patch: Patch = new Map();

export const reset = (): void => {
  patch.clear();
};

export const getFromId = (id: number): PatchItem | undefined => {
  return patch.get(id);
};

export const loadMapping = (): void => {
  reset();

  const graph: Graph = {
    nodes: [
      { id: "input-time-0", type: "input-time" },
      { id: "input-constant-0", type: "input-constant", value: 4 },
      { id: "modifier-math-0", type: "modifier-math", operation: "divide" },
      { id: "modifier-math-1", type: "modifier-math", operation: "add" },
      {
        id: "modifier-adsr-0",
        type: "modifier-adsr",
        attackRate: 0.2,
        decayRate: 0.2,
        sustainLevel: 0.6,
        releaseRate: 0.2,
      },
      { id: "output-0", type: "output", outputId: 0 },
      { id: "output-1", type: "output", outputId: 1 },
      { id: "output-2", type: "output", outputId: 2 },
    ],
    edges: [
      {
        id: "0",
        source: "input-time-0",
        target: "modifier-math-0",
        sourceOutput: 0,
        targetIntput: 0,
      },
      {
        id: "5",
        source: "input-constant-0",
        target: "modifier-math-0",
        sourceOutput: 0,
        targetIntput: 1,
      },
      {
        id: "1",
        source: "modifier-math-0",
        target: "modifier-adsr-0",
        sourceOutput: 0,
        targetIntput: 0,
      },
      {
        id: "2",
        source: "modifier-adsr-0",
        target: "output-0",
        sourceOutput: 0,
        targetIntput: 0,
      },
      {
        id: "3",
        source: "modifier-math-0",
        target: "output-1",
        sourceOutput: 0,
        targetIntput: 0,
      },
      {
        id: "4",
        source: "modifier-adsr-0",
        target: "modifier-math-1",
        sourceOutput: 0,
        targetIntput: 0,
      },
      {
        id: "6",
        source: "modifier-math-1",
        target: "output-2",
        sourceOutput: 0,
        targetIntput: 0,
      },
    ],
  };

  // const program = compile(graph);

  // for (let i = 0; i < 24 * 4; i++) {
  //   console.log(program(i / 24, new Map()));
  // }

  patch.set(60, {
    program: {
      resetAtEnd: true,
      compute: compile(graph),
    },
    mapping: [4, 5, 6],
  });
};
