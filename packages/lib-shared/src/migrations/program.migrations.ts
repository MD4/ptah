import type { MigrationChain } from "./migration.types";

/**
 * PR #218 renamed the edge field `targetIntput` → `targetInput`. Programs
 * persisted before that release store the misspelled key and fail to load.
 * Idempotent: edges that already use `targetInput` pass through unchanged.
 */
const renameTargetInput = (raw: unknown): unknown => {
  const program = raw as { edges?: unknown };
  if (!Array.isArray(program.edges)) {
    return raw;
  }
  return {
    ...(raw as object),
    edges: program.edges.map((edge) => {
      const e = edge as Record<string, unknown>;
      if (!("targetIntput" in e)) {
        return e;
      }
      const { targetIntput, ...rest } = e;
      return { ...rest, targetInput: targetIntput };
    }),
  };
};

export const programMigrations: MigrationChain = [
  { version: "0.3.0", up: renameTargetInput },
];
