import * as z from "zod";

import { showName } from "./show.model";
import { version } from "./version.model";

export const settings = z.object({
  version,
  currentShow: z.optional(showName),
});

export type Settings = z.infer<typeof settings>;
