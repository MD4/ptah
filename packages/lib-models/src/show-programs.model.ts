import * as z from "zod";
import { uuid } from "./uuid.model";
import { programName } from "./program.model";

export const showPrograms = z.record(uuid, programName);
export type ShowPrograms = z.infer<typeof showPrograms>;
