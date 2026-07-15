import { getStampVersion, runMigrations } from "../migrate";
import type { MigrationChain } from "../migration.types";

const chain: MigrationChain = [
  { version: "0.3.0", up: (raw) => ({ ...(raw as object), a: 1 }) },
  { version: "0.4.0", up: (raw) => ({ ...(raw as object), b: 2 }) },
];

describe("runMigrations", () => {
  it("applies only migrations in (from, to]", () => {
    const result = runMigrations({ version: "0.3.0" }, chain, {
      from: "0.3.0",
      to: "0.4.0",
    }) as Record<string, unknown>;
    expect(result.b).toBe(2);
    expect(result.a).toBeUndefined();
  });

  it("applies all migrations newer than a baseline 'from'", () => {
    const result = runMigrations({}, chain, {
      from: "0.2.3",
      to: "0.4.0",
    }) as Record<string, unknown>;
    expect(result.a).toBe(1);
    expect(result.b).toBe(2);
  });

  it("applies out-of-order chains in ascending version order", () => {
    const order: string[] = [];
    const unordered: MigrationChain = [
      {
        version: "0.4.0",
        up: (r) => {
          order.push("b");
          return r;
        },
      },
      {
        version: "0.3.0",
        up: (r) => {
          order.push("a");
          return r;
        },
      },
    ];
    runMigrations({}, unordered, { from: "0.2.3", to: "0.4.0" });
    expect(order).toEqual(["a", "b"]);
  });

  it("re-stamps the result with the target version", () => {
    const result = runMigrations({ version: "0.2.3" }, [], {
      from: "0.2.3",
      to: "0.3.0",
    }) as Record<string, unknown>;
    expect(result.version).toBe("0.3.0");
  });

  it("is a no-op transform for an empty chain", () => {
    const result = runMigrations({ keep: true }, [], {
      from: "0.3.0",
      to: "0.3.0",
    }) as Record<string, unknown>;
    expect(result.keep).toBe(true);
  });

  it("is idempotent when run twice", () => {
    const once = runMigrations({}, chain, { from: "0.2.3", to: "0.4.0" });
    const twice = runMigrations(once, chain, { from: "0.4.0", to: "0.4.0" });
    expect(twice).toEqual(once);
  });
});

describe("getStampVersion", () => {
  const original = process.env.APP_VERSION;

  afterEach(() => {
    if (original === undefined) delete process.env.APP_VERSION;
    else process.env.APP_VERSION = original;
  });

  const stampChain: MigrationChain = [
    { version: "0.3.0", up: (raw) => raw },
    { version: "0.4.0", up: (raw) => raw },
  ];

  it("returns the app version when it is known", () => {
    process.env.APP_VERSION = "1.2.3";
    expect(getStampVersion(stampChain)).toBe("1.2.3");
  });

  it("falls back to the newest chain version when the app version is unknown", () => {
    delete process.env.APP_VERSION;
    expect(getStampVersion(stampChain)).toBe("0.4.0");
  });

  it("picks the newest version even from an unordered chain", () => {
    delete process.env.APP_VERSION;
    expect(getStampVersion([...stampChain].reverse())).toBe("0.4.0");
  });

  it("falls back to the baseline for an empty chain", () => {
    delete process.env.APP_VERSION;
    expect(getStampVersion([])).toBe("0.2.3");
  });
});
