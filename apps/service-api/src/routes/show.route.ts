import { logError } from "@ptah/lib-logger";
import * as models from "@ptah/lib-models";
import type { Express } from "express";
import { z } from "zod";
import { validateRequest } from "zod-express-middleware";

import {
  handleShowCreate,
  handleShowDelete,
  handleShowGet,
  handleShowList,
  handleShowSave,
} from "../services/show.service";

export const configureRoutesShow = (server: Express): Express =>
  server
    .get("/show", (_, res) => {
      handleShowList()
        .then((shows) => {
          res.statusCode = 200;
          res.json(shows);
        })
        .catch((error: unknown) => {
          logError(process.env.SERVICE_API_NAME, error);
          res.statusCode = 500;
          res.json(error);
        });
    })
    .post(
      "/show",
      validateRequest({
        body: models.showCreate,
      }),
      (req, res) => {
        handleShowCreate(req.body.name)
          .then((show) => {
            res.statusCode = 201;
            res.json(show);
          })
          .catch((error: unknown) => {
            logError(process.env.SERVICE_API_NAME, error);
            res.statusCode = 500;
            res.json(error);
          });
      },
    )
    .get("/show/:name", (req, res) => {
      handleShowGet(req.params.name)
        .then((show) => {
          res.statusCode = 201;
          res.json(show);
        })
        .catch((error: unknown) => {
          logError(process.env.SERVICE_API_NAME, error);
          res.statusCode = 500;
          res.json(error);
        });
    })
    .put(
      "/show/:name",
      validateRequest({
        body: models.show,
        params: z.object({
          name: models.showName,
        }),
      }),
      (req, res) => {
        handleShowSave(req.params.name, req.body)
          .then((show) => {
            res.statusCode = 201;
            res.json(show);
          })
          .catch((error: unknown) => {
            logError(process.env.SERVICE_API_NAME, error);
            res.statusCode = 500;
            res.json(error);
          });
      },
    )
    .delete(
      "/show/:name",
      validateRequest({
        params: z.object({
          name: models.showName,
        }),
      }),
      (req, res) => {
        handleShowDelete(req.params.name)
          .then(() => {
            res.statusCode = 204;
            res.end();
          })
          .catch((error: unknown) => {
            logError(process.env.SERVICE_API_NAME, error);
            res.statusCode = 500;
            res.json(error);
          });
      },
    );
