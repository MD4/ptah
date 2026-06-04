import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as z from "zod";
import type { MigrationChain } from "../../migrations";
import { loadAndMigrate } from "../migrate-resource";

const schema = z.object({ id: z.string(), version: z.optional(z.string()) });
const bump: MigrationChain = [
  { version: "0.3.0", up: (raw) => ({ ...(raw as object), migrated: true }) },
];

describe("loadAndMigrate", () => {
  const original = process.env.APP_VERSION;
  let dir: string;
  let backupDir: string;

  beforeEach(() => {
    process.env.APP_VERSION = "0.3.0";
    dir = mkdtempSync(join(tmpdir(), "ptah-mig-"));
    backupDir = join(dir, ".backups");
  });
  afterEach(() => {
    if (original === undefined) {
      delete process.env.APP_VERSION;
    } else {
      process.env.APP_VERSION = original;
    }
  });

  it("migrates a legacy (unstamped) file, backs it up, and writes it back", async () => {
    const file = join(dir, "thing.json");
    writeFileSync(file, JSON.stringify({ id: "x" }));

    const result = await loadAndMigrate(file, bump, schema, backupDir);
    expect(result).toEqual({ id: "x", version: "0.3.0" });

    const backup = JSON.parse(
      readFileSync(join(backupDir, "thing.0.2.3.json"), "utf8"),
    );
    expect(backup).toEqual({ id: "x" });

    const onDisk = JSON.parse(readFileSync(file, "utf8"));
    expect(onDisk.version).toBe("0.3.0");
    expect(onDisk.migrated).toBe(true);
  });

  it("is a no-op for an already-current file (no backup written)", async () => {
    const file = join(dir, "current.json");
    writeFileSync(file, JSON.stringify({ id: "y", version: "0.3.0" }));

    await loadAndMigrate(file, bump, schema, backupDir);

    expect(() => readFileSync(join(backupDir, "current.0.3.0.json"))).toThrow();
  });

  it("throws on corrupt JSON", async () => {
    const file = join(dir, "bad.json");
    writeFileSync(file, "{ not json");
    await expect(
      loadAndMigrate(file, bump, schema, backupDir),
    ).rejects.toThrow();
  });
});
