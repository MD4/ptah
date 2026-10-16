import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PTAH_PROGRAMS_BACKUPS_PATH } from "../../env/vars.env";
import { loadProgramFromPath, saveProgramToPath } from "../program.repository";

const validUuid = "123e4567-e89b-12d3-a456-426614174000";

describe("program repository migration", () => {
  const original = process.env.APP_VERSION;
  let dir: string;

  beforeEach(() => {
    process.env.APP_VERSION = "0.3.0";
    dir = mkdtempSync(join(tmpdir(), "ptah-prog-"));
  });
  afterEach(() => {
    if (original === undefined) delete process.env.APP_VERSION;
    else process.env.APP_VERSION = original;
  });

  it("loads a pre-#218 program by migrating targetIntput -> targetInput", async () => {
    const file = join(dir, "legacy.json");
    writeFileSync(
      file,
      JSON.stringify({
        id: validUuid,
        name: "legacy",
        nodes: [],
        edges: [
          {
            id: validUuid,
            source: "a",
            target: "b",
            sourceOutput: 0,
            targetIntput: 2,
          },
        ],
      }),
    );

    const program = await loadProgramFromPath(file);
    expect(program.edges[0].targetInput).toBe(2);
    expect(program.version).toBe("0.3.0");

    const onDisk = JSON.parse(readFileSync(file, "utf8"));
    expect(onDisk.edges[0].targetInput).toBe(2);
    expect("targetIntput" in onDisk.edges[0]).toBe(false);
  });

  it("stamps the current version on save", async () => {
    const file = join(dir, "saved.json");
    await saveProgramToPath(
      { id: validUuid, name: "saved", nodes: [], edges: [] },
      file,
    );
    const onDisk = JSON.parse(readFileSync(file, "utf8"));
    expect(onDisk.version).toBe("0.3.0");
  });

  it("uses the shared backups path constant for programs", () => {
    expect(PTAH_PROGRAMS_BACKUPS_PATH.endsWith("/.backups/programs")).toBe(
      true,
    );
  });
});
