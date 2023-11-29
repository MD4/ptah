import type * as models from "@ptah/lib-models";
import { v4 as uuidv4 } from "uuid";

export const createNode = (nodeType: models.Node["type"]): models.Node => {
  switch (nodeType) {
    case "fx-adsr":
      return createNodeFxADSR();
    case "fx-math":
      return createNodeFxMath();
    case "input-constant":
      return createNodeInputConstant();
    case "input-control":
      return createNodeInputControl();
    case "input-time":
      return createNodeInputTime();
    case "output-result":
      return createNodeOutputResult();
  }
};

export const createNodeFxADSR = (): models.NodeFxADSR => ({
  id: uuidv4(),
  position: { x: 0, y: 0 },
  type: "fx-adsr",
  attackRate: 0,
  decayRate: 0,
  releaseRate: 0,
  sustainLevel: 0,
});

export const createNodeFxMath = (): models.NodeFxMath => ({
  id: uuidv4(),
  position: { x: 0, y: 0 },
  type: "fx-math",
  operation: "add",
  valueA: 0,
  valueB: 0,
});

export const createNodeInputConstant = (): models.NodeInputConstant => ({
  id: uuidv4(),
  position: { x: 0, y: 0 },
  type: "input-constant",
  value: 0,
});

export const createNodeInputControl = (): models.NodeInputControl => ({
  id: uuidv4(),
  position: { x: 0, y: 0 },
  type: "input-control",
  controlId: 0,
});

export const createNodeInputTime = (): models.NodeInputTime => ({
  id: uuidv4(),
  position: { x: 0, y: 0 },
  type: "input-time",
});

export const createNodeOutputResult = (): models.NodeOutputResult => ({
  id: uuidv4(),
  position: { x: 0, y: 0 },
  type: "output-result",
  outputId: 0,
});
