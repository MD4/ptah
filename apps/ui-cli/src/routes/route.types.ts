import { ShowName } from "@ptah/lib-models";

export type Route =
	| { path: "home" }
	| { path: "load-show" }
	| { path: "show"; showName: ShowName };
