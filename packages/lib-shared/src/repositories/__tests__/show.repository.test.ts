import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadShowFromPath, saveShowToPath } from "../show.repository";

const validUuid = "123e4567-e89b-12d3-a456-426614174000";

describe("show repository migration", () => {
  const original = process.env.APP_VERSION;
  let dir: string;

  beforeEach(() => {
    process.env.APP_VERSION = "0.3.0";
    dir = mkdtempSync(join(tmpdir(), "ptah-show-"));
  });
  afterEach(() => {
    if (original === undefined) delete process.env.APP_VERSION;
    else process.env.APP_VERSION = original;
  });

  it("loads and re-stamps a legacy unstamped show", async () => {
    const file = join(dir, "legacy.json");
    writeFileSync(
      file,
      JSON.stringify({
        id: validUuid,
        name: "legacy",
        mapping: {},
        patch: {},
        programs: {},
      }),
    );

    const show = await loadShowFromPath(file);
    expect(show.version).toBe("0.3.0");
    expect(JSON.parse(readFileSync(file, "utf8")).version).toBe("0.3.0");
  });

  it("stamps the current version on save", async () => {
    const file = join(dir, "saved.json");
    await saveShowToPath(
      { id: validUuid, name: "saved", mapping: {}, patch: {}, programs: {} },
      file,
    );
    expect(JSON.parse(readFileSync(file, "utf8")).version).toBe("0.3.0");
  });
});
