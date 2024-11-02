import * as z from "zod";

import { version } from "./version.model";

export const settings = z.object({
  version,
});

export type Settings = z.infer<typeof settings>;
