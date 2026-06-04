import type * as models from "@ptah-app/lib-models";
import { getCurrentAppVersion } from "@ptah-app/lib-models";

export const createSettings = (): models.Settings => ({
  version: getCurrentAppVersion(),
  midiVirtualPortName: "ptah",
  midiChannel: 1,
  appAdminPort: 3001,
});
