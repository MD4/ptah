import type * as models from "@ptah/lib-models";
import { v4 as uuidv4 } from "uuid";

export const createShow = (name: string): models.Show => ({
  name,
  id: uuidv4(),
  mapping: {},
  patch: {},
  programs: {},
});
