import * as z from "zod";

import { programName } from "./program.model";
import { uuid } from "./uuid.model";

export const showPrograms = z.record(uuid, programName);
export type ShowPrograms = z.infer<typeof showPrograms>;
