/**
 * The app version at which the file migration system was introduced. Files with
 * no `version` stamp (legacy files written before migrations existed) are
 * assumed to be at this baseline.
 */
export const BASELINE_VERSION = "0.2.3";

/**
 * The current app version, used to stamp files on write and as the migration
 * target on load. The app sets `APP_VERSION` from its package.json at startup
 * (apps/app/index.js) and propagates it to spawned services; the fallback only
 * applies in standalone/test contexts.
 */
export const getCurrentAppVersion = (): string =>
  process.env.APP_VERSION ?? BASELINE_VERSION;
