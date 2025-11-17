import { logError } from "@ptah-app/lib-logger";
import * as models from "@ptah-app/lib-models";
import { services } from "@ptah-app/lib-shared";
import type { Express } from "express";
import { z } from "zod";
import { validateRequest } from "zod-express-middleware";

import {
  handleProgramCreate,
  handleProgramDelete,
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
          logError(process.env.SERVICE_API_NAME, error);
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
            logError(process.env.SERVICE_API_NAME, error);
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
            logError(process.env.SERVICE_API_NAME, error);
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
            services.pubsub.send("system", {
              type: "program:save:success",
              programName: program.name,
            });
            res.statusCode = 201;
            res.json(program);
          })
          .catch((error: unknown) => {
            logError(process.env.SERVICE_API_NAME, error);
            services.pubsub.send("system", {
              type: "program:save:error",
              programName: req.params.name,
            });
            res.statusCode = 500;
            res.json(error);
          });
      },
    )
    .delete(
      "/program/:name",
      validateRequest({
        params: z.object({
          name: models.programName,
        }),
      }),
      (req, res) => {
        handleProgramDelete(req.params.name)
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
