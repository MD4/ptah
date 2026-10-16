import * as z from "zod";

import { uuid } from "./uuid.model";

export const edge = z.object({
  id: uuid,
  source: z.string(),
  target: z.string(),
  sourceOutput: z.number(),
  targetInput: z.number(),
});
export type Edge = z.infer<typeof edge>;
