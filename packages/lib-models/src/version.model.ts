import * as z from "zod";

export const version = z
  .string()
  .regex(
    /^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?(\+[a-zA-Z0-9]+)?$/,
    "Invalid version format. Expected format: 'major.minor.patch[-prerelease][+build]'",
  );

export type Version = z.infer<typeof version>;
