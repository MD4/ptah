import * as z from "zod";
import { node } from "./node.model";
import { edge } from "./edge.model";

export const program = z.object({
  id: z.string().uuid(),
  name: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[\w-]+$/),
  nodes: z.array(node),
  edges: z.array(edge),
});
export type Program = z.infer<typeof program>;

export const programCreate = program.pick({ name: true });
export type ProgramCreate = z.infer<typeof programCreate>;
