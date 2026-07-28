import * as z from "zod";
import { uuid } from "./uuid.model";

const nodeGeneric = z.object({
  id: uuid,
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
});

export const nodeInputTime = nodeGeneric.extend({
  type: z.literal("input-time"),
});
export type NodeInputTime = z.infer<typeof nodeInputTime>;

export const nodeInputConstant = nodeGeneric.extend({
  type: z.literal("input-constant"),
  value: z.number(),
});
export type NodeInputConstant = z.infer<typeof nodeInputConstant>;

export const nodeInputControl = nodeGeneric.extend({
  type: z.literal("input-control"),
  controlId: z.number(),
  defaultValue: z.number().min(0).max(255),
});
export type NodeInputControl = z.infer<typeof nodeInputControl>;

export const nodeInputVelocity = nodeGeneric.extend({
  type: z.literal("input-velocity"),
  defaultValue: z.number().min(0).max(255),
});
export type NodeInputVelocity = z.infer<typeof nodeInputVelocity>;

export const nodeInput = z.union([
  nodeInputTime,
  nodeInputConstant,
  nodeInputControl,
  nodeInputVelocity,
]);
export type NodeInput = z.infer<typeof nodeInput>;

export const nodeOutputResult = nodeGeneric.extend({
  type: z.literal("output-result"),
  outputId: z.number().min(0).max(127),
});
export type NodeOutputResult = z.infer<typeof nodeOutputResult>;

export const nodeOutputColor = nodeGeneric.extend({
  type: z.literal("output-color"),
  outputId: z.number().min(0).max(127),
  mode: z.union([z.literal("rgb"), z.literal("hsv")]),
  // Wireable inputs 0/1/2 with these as defaults: r,g,b in rgb mode; h,s,v in
  // hsv mode. Generic names because meaning depends on mode (precedent:
  // fx-math valueA/valueB).
  valueA: z.number().min(0).max(1),
  valueB: z.number().min(0).max(1),
  valueC: z.number().min(0).max(1),
});
export type NodeOutputColor = z.infer<typeof nodeOutputColor>;

export const nodeOutput = z.union([nodeOutputResult, nodeOutputColor]);
export type NodeOutput = z.infer<typeof nodeOutput>;

export const nodeFxADSR = nodeGeneric.extend({
  type: z.literal("fx-adsr"),
  attackRate: z.number().min(0).max(1),
  decayRate: z.number().min(0).max(1),
  sustainLevel: z.number().min(0).max(1),
  releaseRate: z.number().min(0).max(1),
});
export type NodeFxADSR = z.infer<typeof nodeFxADSR>;

export const nodeFxMath = nodeGeneric.extend({
  type: z.literal("fx-math"),
  operation: z.union([
    z.literal("add"),
    z.literal("substract"),
    z.literal("divide"),
    z.literal("multiply"),
    z.literal("modulo"),
    z.literal("sinus"),
    z.literal("cosinus"),
    z.literal("tangent"),
    z.literal("arcsinus"),
    z.literal("arccosinus"),
    z.literal("arctangent"),
    z.literal("exponential"),
    z.literal("logarithm"),
    z.literal("square-root"),
    z.literal("power"),
    z.literal("absolute"),
    z.literal("round"),
    z.literal("floor"),
    z.literal("ceil"),
  ]),
  valueA: z.number(),
  valueB: z.number(),
});
export type NodeFxMath = z.infer<typeof nodeFxMath>;

export const nodeFxDistortion = nodeGeneric.extend({
  type: z.literal("fx-distortion"),
  time: z.number().min(0).max(1),
  value: z.number().min(0).max(1),
  drive: z.number().min(0).max(1),
  tone: z.number().min(0).max(1),
  level: z.number().min(0).max(1),
});
export type NodeFxDistortion = z.infer<typeof nodeFxDistortion>;

export const nodeFx = z.union([nodeFxADSR, nodeFxMath, nodeFxDistortion]);
export type NodeFx = z.infer<typeof nodeFx>;

export const node = z.union([nodeInput, nodeOutput, nodeFx]);
export type Node = z.infer<typeof node>;
