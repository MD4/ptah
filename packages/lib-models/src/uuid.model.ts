import * as z from "zod";

export const uuid = z.string().uuid();
