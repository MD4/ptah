import * as z from "zod";

export const showMapping = z.record(z.string(), z.string().uuid());
export type ShowMapping = z.infer<typeof showMapping>;
