import type * as models from "@ptah-app/lib-models";

export const createSettings = (): models.Settings => ({
  version: "0.0.1",
  midiVirtualPortName: "ptah",
  midiChannel: 1,
  appAdminPort: 3001,
});
