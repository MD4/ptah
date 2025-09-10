import { logError } from "@ptah/lib-logger";
import type { Express } from "express";

import {
  handleSettingsGet,
  handleSettingsPut,
} from "../services/settings.service";

export const configureRoutesSettings = (server: Express): Express =>
  server
    .get("/settings", (_, res) => {
      handleSettingsGet()
        .then((settings) => {
          res.statusCode = 200;
          res.json(settings);
        })
        .catch((error: unknown) => {
          logError(process.env.SERVICE_API_NAME, error);
          res.statusCode = 500;
          res.json(error);
        });
    })
    .put("/settings", (req, res) => {
      handleSettingsPut(req.body)
        .then((settings) => {
          res.statusCode = 200;
          res.json(settings);
        })
        .catch((error: unknown) => {
          logError(process.env.SERVICE_API_NAME, error);
          res.statusCode = 500;
          res.json(error);
        });
    });
