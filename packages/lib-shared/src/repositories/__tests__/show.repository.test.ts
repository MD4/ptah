import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadShowFromPath, saveShowToPath } from "../show.repository";

const validUuid = "123e4567-e89b-12d3-a456-426614174000";

describe("show repository migration", () => {
  const original = process.env.APP_VERSION;
  let dir: string;

  beforeEach(() => {
    process.env.APP_VERSION = "0.4.0";
    dir = mkdtempSync(join(tmpdir(), "ptah-show-"));
  });
  afterEach(() => {
    if (original === undefined) delete process.env.APP_VERSION;
    else process.env.APP_VERSION = original;
  });

  it("loads, migrates and re-stamps a legacy unstamped show", async () => {
    const file = join(dir, "legacy.json");
    writeFileSync(
      file,
      JSON.stringify({
        id: validUuid,
        name: "legacy",
        mapping: {},
        patch: { "7": [{ programId: validUuid, programOutput: 0 }] },
        programs: {},
      }),
    );

    const show = await loadShowFromPath(file);
    expect(show.version).toBe("0.4.0");
    expect(show.fixtures).toHaveLength(1);
    expect(show.fixtures[0]).toMatchObject({
      name: "Channel 7",
      profileId: "dimmer",
      startChannel: 7,
    });
    expect(show.patch).toHaveLength(1);
    expect(JSON.parse(readFileSync(file, "utf8")).version).toBe("0.4.0");
  });

  it("migrates a legacy show stamped with the unknown-version sentinel", async () => {
    // A dev-mode load once restamped this file to 999.999.999 while it still
    // had the raw-channel patch shape — the 0.4.0 migration must still run.
    const file = join(dir, "poisoned.json");
    writeFileSync(
      file,
      JSON.stringify({
        id: validUuid,
        name: "poisoned",
        mapping: {},
        patch: { "7": [{ programId: validUuid, programOutput: 0 }] },
        programs: {},
        version: "999.999.999",
      }),
    );

    const show = await loadShowFromPath(file);
    expect(show.fixtures).toHaveLength(1);
    expect(show.patch).toHaveLength(1);
    expect(show.version).toBe("0.4.0");
  });

  it("stamps the current version on save", async () => {
    const file = join(dir, "saved.json");
    await saveShowToPath(
      {
        id: validUuid,
        name: "saved",
        mapping: {},
        fixtures: [],
        patch: [],
        programs: {},
      },
      file,
    );
    expect(JSON.parse(readFileSync(file, "utf8")).version).toBe("0.4.0");
  });

  it("stamps the newest migration version on save when the app version is unknown", async () => {
    delete process.env.APP_VERSION;

    const file = join(dir, "saved-dev.json");
    await saveShowToPath(
      {
        id: validUuid,
        name: "saved-dev",
        mapping: {},
        fixtures: [],
        patch: [],
        programs: {},
      },
      file,
    );
    // Newest show migration, never the 999.999.999 sentinel.
    expect(JSON.parse(readFileSync(file, "utf8")).version).toBe("0.4.0");
  });
});
