import type * as models from "@ptah/lib-models";
import { v4 as uuidv4 } from "uuid";

export const createProgram = (name: string): models.Program => ({
  name,
  id: uuidv4(),
  nodes: [],
  edges: [],
});
