import type { Express } from "express";
import { validateRequest } from "zod-express-middleware";
import * as models from "@ptah/lib-models";
import { logError } from "@ptah/lib-logger";
import {
  handleShowCreate,
  handleShowGet,
  handleShowList,
} from "../services/show.service";

export const configureRoutesShow = (server: Express): Express =>
  server
    .get("/show", (req, res) => {
      handleShowList()
        .then((shows) => {
          res.statusCode = 200;
          res.json(shows);
        })
        .catch((error) => {
          logError(process.env.SERVICE_NAME, error);
          res.statusCode = 500;
          res.json(error);
        });
    })
    .post(
      "/show/create",
      validateRequest({
        body: models.showCreate,
      }),
      (req, res) => {
        handleShowCreate(req.body.name)
          .then((show) => {
            res.statusCode = 201;
            res.json(show);
          })
          .catch((error) => {
            logError(process.env.SERVICE_NAME, error);
            res.statusCode = 500;
            res.json(error);
          });
      }
    )
    .get("/show/:name", (req, res) => {
      handleShowGet(req.params.name)
        .then((show) => {
          res.statusCode = 201;
          res.json(show);
        })
        .catch((error) => {
          logError(process.env.SERVICE_NAME, error);
          res.statusCode = 500;
          res.json(error);
        });
    });
