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

  // Files saved in a context without APP_VERSION get stamped with the
  // 999.999.999 sentinel. That stamp must not exempt them from future
  // migrations: treat it as "unknown" and run the whole chain.
  describe("sentinel-stamped files (version 999.999.999)", () => {
    it("re-runs the chain when the app version is known", async () => {
      const file = join(dir, "poisoned.json");
      writeFileSync(file, JSON.stringify({ id: "p", version: "999.999.999" }));

      const result = await loadAndMigrate(file, bump, schema, backupDir);
      expect(result.version).toBe("0.3.0");

      const onDisk = JSON.parse(readFileSync(file, "utf8"));
      expect(onDisk.migrated).toBe(true);
      expect(onDisk.version).toBe("0.3.0");

      const backup = JSON.parse(
        readFileSync(join(backupDir, "poisoned.999.999.999.json"), "utf8"),
      );
      expect(backup).toEqual({ id: "p", version: "999.999.999" });
    });

    it("re-runs the chain even when the app version is also unknown", async () => {
      delete process.env.APP_VERSION;

      const file = join(dir, "legacy-max.json");
      writeFileSync(file, JSON.stringify({ id: "l", version: "999.999.999" }));

      await loadAndMigrate(file, bump, schema, backupDir);

      const onDisk = JSON.parse(readFileSync(file, "utf8"));
      expect(onDisk.migrated).toBe(true);
      expect(onDisk.version).toBe("999.999.999");

      // Backed up under its stored stamp — never clobbers a real baseline
      // backup from the file's first migration.
      const backup = JSON.parse(
        readFileSync(join(backupDir, "legacy-max.999.999.999.json"), "utf8"),
      );
      expect(backup).toEqual({ id: "l", version: "999.999.999" });
    });

    it("does not rewrite or back up a file the chain leaves unchanged", async () => {
      delete process.env.APP_VERSION;

      const file = join(dir, "healthy.json");
      const content = { id: "h", migrated: true, version: "999.999.999" };
      writeFileSync(file, JSON.stringify(content));

      await loadAndMigrate(file, bump, schema, backupDir);

      expect(JSON.parse(readFileSync(file, "utf8"))).toEqual(content);
      expect(() =>
        readFileSync(join(backupDir, "healthy.999.999.999.json")),
      ).toThrow();
    });
  });
});
