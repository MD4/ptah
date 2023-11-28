import * as z from "zod";

export const edge = z.object({
  id: z.string().uuid(),
  source: z.string(),
  target: z.string(),
  sourceOutput: z.number(),
  targetIntput: z.number(),
});
export type Edge = z.infer<typeof edge>;
