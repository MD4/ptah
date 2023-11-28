import * as z from "zod";

const nodeGeneric = z.object({
  id: z.string().uuid(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
});

export const nodeInputTime = nodeGeneric.extend({
  type: z.literal("input-time"),
});
export type NodeInputTime = z.infer<typeof nodeInputTime>;

export const nodeInputControl = nodeGeneric.extend({
  type: z.literal("input-control"),
  controlId: z.number(),
});
export type NodeInputControl = z.infer<typeof nodeInputControl>;

export const nodeInputConstant = nodeGeneric.extend({
  type: z.literal("input-constant"),
  value: z.number(),
});
export type NodeInputConstant = z.infer<typeof nodeInputConstant>;

export const nodeInput = z.union([
  nodeInputTime,
  nodeInputControl,
  nodeInputConstant,
]);
export type NodeInput = z.infer<typeof nodeInput>;

export const nodeOutputResult = nodeGeneric.extend({
  type: z.literal("output-result"),
  outputId: z.number().min(0).max(127),
});
export type NodeOutputResult = z.infer<typeof nodeOutputResult>;

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
  ]),
  valueA: z.number(),
  valueB: z.number(),
});
export type NodeFxMath = z.infer<typeof nodeFxMath>;

export const nodeFx = z.union([nodeFxADSR, nodeFxMath]);
export type NodeFx = z.infer<typeof nodeFx>;

export const node = z.union([nodeInput, nodeOutputResult, nodeFx]);
export type Node = z.infer<typeof node>;
