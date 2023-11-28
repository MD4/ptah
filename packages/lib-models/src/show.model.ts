import * as z from "zod";
import { showMapping } from "./show-mapping.model";
import { showPatch } from "./show-patch.model";

export const show = z.object({
  id: z.string().uuid(),
  name: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[\w-]+$/),
  mapping: showMapping,
  patch: showPatch,
});
export type Show = z.infer<typeof show>;

export const showCreate = show.pick({ name: true });
export type ShowCreate = z.infer<typeof showCreate>;
