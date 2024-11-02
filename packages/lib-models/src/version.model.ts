import * as z from "zod";

export const version = z
  .string()
  .regex(
    /^(?<p0>0|[1-9]\d*)\.(?<p1>0|[1-9]\d*)\.(?<p2>0|[1-9]\d*)(?:-(?<p3>(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+(?<p4>[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/,
  );

export type Version = z.infer<typeof version>;
