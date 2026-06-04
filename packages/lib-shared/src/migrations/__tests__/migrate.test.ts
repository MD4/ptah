import { runMigrations } from "../migrate";
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
