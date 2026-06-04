import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadSettingsFromPath,
  saveSettingsToPath,
} from "../settings.repository";

const validSettings = {
  version: "0.0.1",
  midiVirtualPortName: "ptah",
  midiChannel: 1,
  appAdminPort: 3001,
};

describe("settings repository migration", () => {
  const original = process.env.APP_VERSION;
  let dir: string;

  beforeEach(() => {
    process.env.APP_VERSION = "0.3.0";
    dir = mkdtempSync(join(tmpdir(), "ptah-set-"));
  });
  afterEach(() => {
    if (original === undefined) delete process.env.APP_VERSION;
    else process.env.APP_VERSION = original;
  });

  it("re-stamps an old settings file on load", async () => {
    const file = join(dir, "settings.json");
    writeFileSync(file, JSON.stringify(validSettings));

    const settings = await loadSettingsFromPath(file);
    expect(settings.version).toBe("0.3.0");
    expect(JSON.parse(readFileSync(file, "utf8")).version).toBe("0.3.0");
  });

  it("stamps the current version on save", async () => {
    const file = join(dir, "settings.json");
    await saveSettingsToPath(validSettings, file);
    expect(JSON.parse(readFileSync(file, "utf8")).version).toBe("0.3.0");
  });
});
