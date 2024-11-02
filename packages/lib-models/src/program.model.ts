import * as z from "zod";

import { edge } from "./edge.model";
import { node } from "./node.model";
import { uuid } from "./uuid.model";

export const programName = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[\w-]+$/);
export type ProgramName = z.infer<typeof programName>;

export const program = z.object({
  id: uuid,
  name: programName,
  nodes: z.array(node),
  edges: z.array(edge),
});
export type Program = z.infer<typeof program>;

export const programCreate = program.pick({ name: true });
export type ProgramCreate = z.infer<typeof programCreate>;
