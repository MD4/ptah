import { v4 as uuidv4 } from "uuid";
import type * as models from "@ptah/lib-models";

export const createShow = (name: string): models.Show => ({
  name,
  id: uuidv4(),
  mapping: {},
  patch: {},
  programs: {},
});
