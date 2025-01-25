import * as z from "zod";

import { showName } from "./show.model";
import { version } from "./version.model";

export const settings = z.object({
  version,
  midiVirtualPortName: z.string().min(1).max(255),
  currentShow: z.optional(showName),
});

export type Settings = z.infer<typeof settings>;
