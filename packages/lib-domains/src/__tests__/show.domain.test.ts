import { createShow } from "../show.domain";

describe("createShow", () => {
  it("creates a show with the given name", () => {
    const show = createShow("my-show");
    expect(show.name).toBe("my-show");
  });

  it("assigns a UUID id", () => {
    const show = createShow("test");
    expect(show.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("initializes empty mapping, fixtures, patch, and programs", () => {
    const show = createShow("test");
    expect(show.mapping).toEqual({});
    expect(show.fixtures).toEqual([]);
    expect(show.patch).toEqual([]);
    expect(show.programs).toEqual({});
  });

  it("generates different ids for each call", () => {
    const a = createShow("a");
    const b = createShow("b");
    expect(a.id).not.toBe(b.id);
  });
});
