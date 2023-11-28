import type { Express } from "express";
import { configureRoutesShow } from "./show.route";
import { configureRoutesProgram } from "./program.route";

export const configureRoutes = (server: Express): Express =>
  configureRoutesProgram(configureRoutesShow(server));
