import type * as models from "@ptah/lib-models";
import type { ComponentType } from "react";
import type { NodeProps } from "reactflow";

import NodeAddProgram from "./node-add-program";
import NodeChannel from "./node-channel";
import NodeFxADSR from "./node-fx-adsr";
import NodeFxDistortion from "./node-fx-distortion";
import NodeFxMath from "./node-fx-math";
import NodeInputConstant from "./node-input-constant";
import NodeInputControl from "./node-input-control";
import NodeInputTime from "./node-input-time";
import NodeKey from "./node-key";
import NodeOutputResult from "./node-output-result";
import NodeProgram from "./node-program";

export const showNodeTypes: Record<string, ComponentType<NodeProps>> = {
  "node-key": NodeKey,
  "node-program": NodeProgram,
  "node-channel": NodeChannel,
  "node-add-program": NodeAddProgram,
};

export const programNodeTypes: Record<
  models.Node["type"],
  ComponentType<NodeProps>
> = {
  "fx-adsr": NodeFxADSR,
  "input-time": NodeInputTime,
  "input-constant": NodeInputConstant,
  "input-control": NodeInputControl,
  "fx-math": NodeFxMath,
  "fx-distortion": NodeFxDistortion,
  "output-result": NodeOutputResult,
};
