/**
 * The app version at which the file migration system was introduced. Files with
 * no `version` stamp (legacy files written before migrations existed) are
 * assumed to be at this baseline.
 */
export const BASELINE_VERSION = "0.2.3";

/**
 * Sentinel version used as the migration target when the real app version is
 * unknown. It sits above any conceivable migration version, so the entire
 * migration chain runs — the safe default when we can't pin down where we are.
 */
export const MAX_VERSION = "999.999.999";

/**
 * The current app version, used to stamp files on write and as the migration
 * target on load. The app sets `APP_VERSION` from its package.json at startup
 * (apps/app/index.js) and propagates it to spawned services; the fallback only
 * applies in standalone/test contexts, where we force every migration to run
 * rather than silently skip newer ones.
 */
export const getCurrentAppVersion = (): string =>
  process.env.APP_VERSION ?? MAX_VERSION;
