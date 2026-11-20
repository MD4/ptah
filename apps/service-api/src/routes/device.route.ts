import { logError } from "@ptah-app/lib-logger";
import type { Express } from "express";
import {
  handleDeviceAudioInputList,
  handleDeviceAudioOutputList,
} from "../services/device.service";

export const configureRoutesDevice = (server: Express): Express =>
  server
    .get("/device/audio/input", (_, res) => {
      handleDeviceAudioInputList()
        .then((devices) => {
          res.statusCode = 200;
          res.json(devices);
        })
        .catch((error: unknown) => {
          logError(process.env.SERVICE_API_NAME, error);
          res.statusCode = 500;
          res.json(error);
        });
    })
    .get("/device/audio/output", (_, res) => {
      handleDeviceAudioOutputList()
        .then((devices) => {
          res.statusCode = 200;
          res.json(devices);
        })
        .catch((error: unknown) => {
          logError(process.env.SERVICE_API_NAME, error);
          res.statusCode = 500;
          res.json(error);
        });
    });
