import { createSettings } from "../settings.domain";

describe("createSettings", () => {
  it("returns an object with required fields", () => {
    const s = createSettings();
    expect(s.version).toBe("0.0.1");
    expect(s.midiVirtualPortName).toBe("ptah");
    expect(s.midiChannel).toBe(1);
    expect(s.appAdminPort).toBe(3001);
  });

  it("does not include currentShow by default", () => {
    expect(createSettings().currentShow).toBeUndefined();
  });

  it("returns a new object on each call", () => {
    const a = createSettings();
    const b = createSettings();
    expect(a).not.toBe(b);
  });
});
