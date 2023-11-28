import type { Express } from "express";
import { validateRequest } from "zod-express-middleware";
import * as models from "@ptah/lib-models";
import { logError } from "@ptah/lib-logger";
import {
  handleProgramCreate,
  handleProgramGet,
  handleProgramList,
} from "../services/program.service";

export const configureRoutesProgram = (server: Express): Express =>
  server
    .get("/program", (req, res) => {
      handleProgramList()
        .then((programs) => {
          res.statusCode = 200;
          res.json(programs);
        })
        .catch((error) => {
          logError(process.env.SERVICE_NAME, error);
          res.statusCode = 500;
          res.json(error);
        });
    })
    .post(
      "/program/create",
      validateRequest({
        body: models.programCreate,
      }),
      (req, res) => {
        handleProgramCreate(req.body.name)
          .then((program) => {
            res.statusCode = 201;
            res.json(program);
          })
          .catch((error) => {
            logError(process.env.SERVICE_NAME, error);
            res.statusCode = 500;
            res.json(error);
          });
      }
    )
    .get("/program/:name", (req, res) => {
      handleProgramGet(req.params.name)
        .then((program) => {
          res.statusCode = 200;
          res.json(program);
        })
        .catch((error) => {
          logError(process.env.SERVICE_NAME, error);
          res.statusCode = 500;
          res.json(error);
        });
    });
