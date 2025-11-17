import type { ShowName } from "@ptah-app/lib-models";

export type Route =
  | { path: "home" }
  | { path: "debug" }
  | { path: "load-show" }
  | { path: "show"; showName: ShowName };
