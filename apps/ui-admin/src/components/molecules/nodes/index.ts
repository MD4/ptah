import type * as models from "@ptah/lib-models";
import type { NodeProps } from "reactflow";
import type { ComponentType } from "react";
import NodeKey from "./node-key";
import NodeProgram from "./node-program";
import NodeChannel from "./node-channel";
import NodeInputTime from "./node-input-time";
import NodeInputControl from "./node-input-control";
import NodeInputConstant from "./node-input-constant";
import NodeOutputResult from "./node-output-result";
import NodeFxMath from "./node-fx-math";
import NodeFxADSR from "./node-fx-adsr";
import NodeAddProgram from "./node-add-program";

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
  "output-result": NodeOutputResult,
};
