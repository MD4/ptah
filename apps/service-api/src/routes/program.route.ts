import { logError } from "@ptah/lib-logger";
import * as models from "@ptah/lib-models";
import type { Express } from "express";
import { z } from "zod";
import { validateRequest } from "zod-express-middleware";

import {
  handleProgramCreate,
  handleProgramGet,
  handleProgramList,
  handleProgramSave,
} from "../services/program.service";

export const configureRoutesProgram = (server: Express): Express =>
  server
    .get("/program", (_, res) => {
      handleProgramList()
        .then((programs) => {
          res.statusCode = 200;
          res.json(programs);
        })
        .catch((error: unknown) => {
          logError(process.env.SERVICE_NAME, error);
          res.statusCode = 500;
          res.json(error);
        });
    })
    .post(
      "/program",
      validateRequest({
        body: models.programCreate,
      }),
      (req, res) => {
        handleProgramCreate(req.body.name)
          .then((program) => {
            res.statusCode = 201;
            res.json(program);
          })
          .catch((error: unknown) => {
            logError(process.env.SERVICE_NAME, error);
            res.statusCode = 500;
            res.json(error);
          });
      },
    )
    .get(
      "/program/:name",
      validateRequest({
        params: z.object({
          name: models.programName,
        }),
      }),
      (req, res) => {
        handleProgramGet(req.params.name)
          .then((program) => {
            res.statusCode = 200;
            res.json(program);
          })
          .catch((error: unknown) => {
            logError(process.env.SERVICE_NAME, error);
            res.statusCode = 500;
            res.json(error);
          });
      },
    )
    .put(
      "/program/:name",
      validateRequest({
        body: models.program,
        params: z.object({
          name: models.programName,
        }),
      }),
      (req, res) => {
        handleProgramSave(req.params.name, req.body)
          .then((program) => {
            res.statusCode = 201;
            res.json(program);
          })
          .catch((error: unknown) => {
            logError(process.env.SERVICE_NAME, error);
            res.statusCode = 500;
            res.json(error);
          });
      },
    );
