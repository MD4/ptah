import * as z from "zod";
import { uuid } from "./uuid.model";

export const showMapping = z.record(z.string(), uuid);
export type ShowMapping = z.infer<typeof showMapping>;
