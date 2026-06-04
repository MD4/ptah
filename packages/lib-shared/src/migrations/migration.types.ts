import type { Version } from "@ptah-app/lib-models";

export type Migration = {
  /** The app version this migration upgrades the file TO. */
  version: Version;
  /** Transforms plain JSON (never a parsed model) from the previous shape. */
  up: (raw: unknown) => unknown;
};

/** Migrations for a resource type, authored in ascending version order. */
export type MigrationChain = Migration[];
