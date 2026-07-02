import {
  BASELINE_VERSION,
  getCurrentAppVersion,
  MAX_VERSION,
} from "../app-version.model";

describe("app version", () => {
  const original = process.env.APP_VERSION;
  afterEach(() => {
    if (original === undefined) {
      delete process.env.APP_VERSION;
    } else {
      process.env.APP_VERSION = original;
    }
  });

  it("BASELINE_VERSION is the version migrations are introduced at", () => {
    expect(BASELINE_VERSION).toBe("0.2.3");
  });

  it("getCurrentAppVersion returns APP_VERSION when set", () => {
    process.env.APP_VERSION = "0.3.0";
    expect(getCurrentAppVersion()).toBe("0.3.0");
  });

  it("getCurrentAppVersion falls back to MAX_VERSION when unset, forcing all migrations to run", () => {
    delete process.env.APP_VERSION;
    expect(getCurrentAppVersion()).toBe(MAX_VERSION);
  });
});
