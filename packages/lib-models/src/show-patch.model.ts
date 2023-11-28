import * as z from "zod";

export const showPatch = z.array(z.object({
    programId: z.string().uuid(),
    outputIndex: z.number(),
    channel: z.number()
}));
export type ShowPatch = z.infer<typeof showPatch>;
