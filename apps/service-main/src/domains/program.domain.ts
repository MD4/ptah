import type { Node, Program } from "@ptah/lib-models";
import { isDefined } from "../utils/types";
import { adsr } from "../utils/adsr";
import type { RunnerControlsState } from "../services/runner.service.types";
import type {
  ProgramCompute,
  ProgramDefinition,
  ProgramOutput,
  ProgramState,
} from "./program.types";

// Defined by MIDI standard
const TICK = 1 / 24;

export const performTick = (
  program: ProgramDefinition,
  inputs: RunnerControlsState,
  programState: ProgramState
): ProgramState => {
  const time = programState.time + TICK;

  return {
    time,
    output: program.compute(time, inputs),
  };
};

export const getProgramInitialState = (
  program: ProgramDefinition,
  inputs: RunnerControlsState
): ProgramState => {
  return {
    time: 0,
    output: program.compute(0, inputs),
  };
};

const getNodeInputValueFromRegister = (
  register: Map<string, number[]>,
  input?: {
    id: string;
    sourceOutput: number;
  },
  defaultValue = 0
): number => {
  if (!input) {
    return defaultValue;
  }

  const values = register.get(input.id);

  if (values) {
    return values[input.sourceOutput];
  }

  return defaultValue;
};

export const compile = (program: Program): ProgramCompute => {
  const outputs = program.nodes.filter(({ type }) => type === "output-result");

  const getNode = (nodeId: string): Node | undefined =>
    program.nodes.find(({ id }) => id === nodeId);

  const visitedNodes: string[] = [];

  const getNodePath = (node: Node): string[] => {
    if (visitedNodes.includes(node.id)) {
      return [];
    }
    visitedNodes.push(node.id);

    return [
      ...program.edges
        .filter((edge) => edge.target === node.id)
        .flatMap((input) => {
          const inputNode = getNode(input.source);

          return inputNode ? getNodePath(inputNode) : [];
        }),
      node.id,
    ];
  };

  const evalOrder = outputs
    .flatMap(getNodePath)
    .map(getNode)
    .filter(isDefined)
    .map((node) => ({
      node,
      inputsNodesIds: program.edges
        .filter((edge) => edge.target === node.id)
        .map(({ source, sourceOutput }) => ({ id: source, sourceOutput })),
    }));

  return (time, inputs) => {
    const register = new Map<string, number[]>();

    const programOutput: ProgramOutput = {};

    for (const { node, inputsNodesIds } of evalOrder) {
      switch (node.type) {
        case "input-constant":
          register.set(node.id, [node.value]);
          break;
        case "input-control":
          register.set(node.id, [inputs.get(node.controlId) ?? 0]);
          break;
        case "input-time":
          register.set(node.id, [time]);
          break;
        case "fx-adsr": {
          register.set(node.id, [
            adsr(
              node.attackRate,
              node.decayRate,
              node.sustainLevel,
              node.releaseRate
            )(getNodeInputValueFromRegister(register, inputsNodesIds[0])),
          ]);
          break;
        }
        case "fx-math": {
          const a = getNodeInputValueFromRegister(
            register,
            inputsNodesIds[0],
            node.valueA
          );
          const b = getNodeInputValueFromRegister(
            register,
            inputsNodesIds[1],
            node.valueB
          );

          let value = 0;

          switch (node.operation) {
            case "add":
              value = a + b;
              break;
            case "divide":
              value = a / b;
              break;
            case "multiply":
              value = a * b;
              break;
            case "substract":
              value = a - b;
              break;
          }

          register.set(node.id, [value]);
          break;
        }

        case "output-result":
          programOutput[node.outputId] = getNodeInputValueFromRegister(
            register,
            inputsNodesIds[0]
          );
          break;
        default:
      }
    }

    return programOutput;
  };
};
