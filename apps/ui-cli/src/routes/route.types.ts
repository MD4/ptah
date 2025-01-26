import type { ShowName } from "@ptah/lib-models";

export type Route =
  | { path: "home" }
  | { path: "debug" }
  | { path: "load-show" }
  | { path: "show"; showName: ShowName };
