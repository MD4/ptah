import type * as models from "@ptah-app/lib-models";
import { v4 as uuidv4 } from "uuid";

export const createNode = (nodeType: models.Node["type"]): models.Node => {
  switch (nodeType) {
    case "fx-adsr":
      return createNodeFxADSR();
    case "fx-math":
      return createNodeFxMath();
    case "fx-distortion":
      return createNodeFxDistortion();
    case "input-constant":
      return createNodeInputConstant();
    case "input-control":
      return createNodeInputControl();
    case "input-velocity":
      return createNodeInputVelocity();
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
  attackRate: 0.1,
  decayRate: 0.2,
  releaseRate: 0.5,
  sustainLevel: 0.3,
});

export const createNodeFxMath = (): models.NodeFxMath => ({
  id: uuidv4(),
  position: { x: 0, y: 0 },
  type: "fx-math",
  operation: "add",
  valueA: 0,
  valueB: 0,
});

export const createNodeFxDistortion = (): models.NodeFxDistortion => ({
  id: uuidv4(),
  position: { x: 0, y: 0 },
  type: "fx-distortion",
  time: 0,
  value: 0,
  drive: 0.2,
  tone: 0.6,
  level: 0.8,
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
  defaultValue: 127,
});

export const createNodeInputVelocity = (): models.NodeInputVelocity => ({
  id: uuidv4(),
  position: { x: 0, y: 0 },
  type: "input-velocity",
  defaultValue: 127,
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
