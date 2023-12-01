import * as z from "zod";
import { uuid } from "./uuid.model";

export const showPatch = z.record(
  z.string(),
  z.object({
    programId: uuid,
    programOutput: z.number().min(0).max(127),
  })
);
export type ShowPatch = z.infer<typeof showPatch>;
