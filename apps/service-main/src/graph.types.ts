type GenericNode = {
  id: string;
};

type InputTimeNode = GenericNode & {
  type: "input-time";
};

type InputControlNode = GenericNode & {
  type: "input-control";
  controlId: number;
};

type InputConstantNode = GenericNode & {
  type: "input-constant";
  value: number;
};

type InputNode = InputTimeNode | InputControlNode | InputConstantNode;

type OutputNode = GenericNode & {
  type: "output";
  outputId: number;
};

type ADSRNode = GenericNode & {
  type: "modifier-adsr";
  attackRate: number;
  decayRate: number;
  sustainLevel: number;
  releaseRate: number;
};

type MathNode = GenericNode & {
  type: "modifier-math";
  operation: "add" | "substract" | "divide" | "multiply";
  valueA: number;
  valueB: number;
};

type ModifierNode = ADSRNode | MathNode;

export type Node = InputNode | OutputNode | ModifierNode;

export type Edge = {
  id: string;
  source: string;
  target: string;
  sourceOutput: number;
  targetIntput: number;
};

export type Graph = {
  nodes: Node[];
  edges: Edge[];
};
