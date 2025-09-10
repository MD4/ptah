import type * as models from "@ptah/lib-models";

export const createSettings = (): models.Settings => ({
  version: "1.0.0",
  midiVirtualPortName: "ptah",
  midiChannel: 1,
  appAdminPort: 3001,
});
