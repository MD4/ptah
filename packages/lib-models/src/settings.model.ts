import * as z from "zod";

import { showName } from "./show.model";
import { version } from "./version.model";

export const settings = z.object({
  version,
  midiVirtualPortName: z.string().min(1).max(255),
  midiChannel: z.number().min(1).max(16),
  appAdminPort: z.number().min(1024).max(49151),
  currentShow: z.optional(showName),
});

export type Settings = z.infer<typeof settings>;
