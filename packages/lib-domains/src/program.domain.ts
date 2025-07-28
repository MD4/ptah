import type * as models from "@ptah/lib-models";
import { isDefined } from "@ptah/lib-utils";
import { v4 as uuidv4 } from "uuid";
import type {
  ProgramCompute,
  ProgramDefinition,
  ProgramOutput,
  ProgramState,
} from "./program.domain.types";
import { adsr, distortion } from "./runner.domain";
import type { RunnerControlsState } from "./runner.domain.types";

export type * from "./program.domain.types";

export const createProgram = (name: string): models.Program => ({
  name,
  id: uuidv4(),
  nodes: [],
  edges: [],
});

// Defined by MIDI standard
const TICK = 1 / 24;

export const performTick = (
  program: ProgramDefinition,
  inputs: RunnerControlsState,
  programState: ProgramState,
): ProgramState => {
  const time = programState.time + TICK;

  return {
    time,
    output: program.compute(time, inputs),
  };
};

export const getProgramInitialState = (
  program: ProgramDefinition,
  inputs: RunnerControlsState,
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
  defaultValue = 0,
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

export const compile = (program: models.Program): ProgramCompute => {
  const outputs = program.nodes.filter(({ type }) => type === "output-result");

  const getNode = (nodeId: string): models.Node | undefined =>
    program.nodes.find(({ id }) => id === nodeId);

  const visitedNodes: string[] = [];

  const getNodePath = (node: models.Node): string[] => {
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
        .reduce<{ id: string; sourceOutput: number }[]>(
          (acc, { source, sourceOutput, targetIntput }) => {
            acc[targetIntput] = {
              id: source,
              sourceOutput,
            };

            return acc;
          },
          [],
        ),
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
          const attackRate = getNodeInputValueFromRegister(
            register,
            inputsNodesIds[1],
            node.attackRate,
          );
          const decayRate = getNodeInputValueFromRegister(
            register,
            inputsNodesIds[2],
            node.decayRate,
          );
          const sustainLevel = getNodeInputValueFromRegister(
            register,
            inputsNodesIds[3],
            node.sustainLevel,
          );
          const releaseRate = getNodeInputValueFromRegister(
            register,
            inputsNodesIds[4],
            node.releaseRate,
          );

          register.set(node.id, [
            adsr(
              attackRate,
              decayRate,
              sustainLevel,
              releaseRate,
            )(getNodeInputValueFromRegister(register, inputsNodesIds[0])),
          ]);
          break;
        }
        case "fx-math": {
          const a = getNodeInputValueFromRegister(
            register,
            inputsNodesIds[0],
            node.valueA,
          );
          const b = getNodeInputValueFromRegister(
            register,
            inputsNodesIds[1],
            node.valueB,
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
            case "modulo":
              value = a % b;
              break;
            case "sinus":
              value = Math.sin(a);
              break;
            case "cosinus":
              value = Math.cos(a);
              break;
            case "tangent":
              value = Math.tan(a);
              break;
            case "arcsinus":
              value = Math.asin(a);
              break;
            case "arccosinus":
              value = Math.acos(a);
              break;
            case "arctangent":
              value = Math.atan(a);
              break;
            case "exponential":
              value = Math.exp(a);
              break;
            case "logarithm":
              value = Math.log(a);
              break;
            case "square-root":
              value = Math.sqrt(a);
              break;
            case "power":
              value = a ** b;
              break;
            case "absolute":
              value = Math.abs(a);
              break;
            case "round":
              value = Math.round(a);
              break;
            case "floor":
              value = Math.floor(a);
              break;
            case "ceil":
              value = Math.ceil(a);
              break;
          }

          register.set(node.id, [value]);
          break;
        }

        case "fx-distortion": {
          const value = getNodeInputValueFromRegister(
            register,
            inputsNodesIds[1],
            node.value,
          );

          const drive = getNodeInputValueFromRegister(
            register,
            inputsNodesIds[2],
            node.drive,
          );
          const tone = getNodeInputValueFromRegister(
            register,
            inputsNodesIds[3],
            node.tone,
          );
          const level = getNodeInputValueFromRegister(
            register,
            inputsNodesIds[4],
            node.level,
          );

          register.set(node.id, [
            distortion(
              value,
              drive,
              tone,
              level,
            )(getNodeInputValueFromRegister(register, inputsNodesIds[0])),
          ]);
          break;
        }

        case "output-result":
          programOutput[node.outputId] = getNodeInputValueFromRegister(
            register,
            inputsNodesIds[0],
          );
          break;
        default:
      }
    }

    return programOutput;
  };
};
