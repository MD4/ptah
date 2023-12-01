import * as z from "zod";
import { showMapping } from "./show-mapping.model";
import { showPatch } from "./show-patch.model";
import { uuid } from "./uuid.model";
import { showPrograms } from "./show-programs.model";

export const showName = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[\w-]+$/);
export type ShowName = z.infer<typeof showName>;

export const show = z.object({
  id: uuid,
  name: showName,
  mapping: showMapping,
  patch: showPatch,
  programs: showPrograms,
});
export type Show = z.infer<typeof show>;

export const showCreate = show.pick({ name: true });
export type ShowCreate = z.infer<typeof showCreate>;
