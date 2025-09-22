import type { NodeTypes } from "@xyflow/react";

import NodeAddProgram from "./node-add-program";
import NodeChannel from "./node-channel";
import NodeFxADSR from "./node-fx-adsr";
import NodeFxDistortion from "./node-fx-distortion";
import NodeFxMath from "./node-fx-math";
import NodeInputConstant from "./node-input-constant";
import NodeInputControl from "./node-input-control";
import NodeInputTime from "./node-input-time";
import NodeInputVelocity from "./node-input-velocity";
import NodeKey from "./node-key";
import NodeOutputResult from "./node-output-result";
import NodeProgram from "./node-program";

export const showNodeTypes: NodeTypes = {
  "node-key": NodeKey,
  "node-program": NodeProgram,
  "node-channel": NodeChannel,
  "node-add-program": NodeAddProgram,
};

export const programNodeTypes: NodeTypes = {
  "fx-adsr": NodeFxADSR,
  "input-time": NodeInputTime,
  "input-constant": NodeInputConstant,
  "input-control": NodeInputControl,
  "input-velocity": NodeInputVelocity,
  "fx-math": NodeFxMath,
  "fx-distortion": NodeFxDistortion,
  "output-result": NodeOutputResult,
};
