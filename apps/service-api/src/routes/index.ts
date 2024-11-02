import type { Express } from "express";

import { configureRoutesProgram } from "./program.route";
import { configureRoutesShow } from "./show.route";

export const configureRoutes = (server: Express): Express =>
  configureRoutesProgram(configureRoutesShow(server));
