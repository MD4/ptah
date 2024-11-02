import type { Server } from "node:http";
import { json, urlencoded } from "body-parser";
import morgan from "morgan";
import cors from "cors";
import express from "express";
import { configureRoutes } from "../routes";

let server: Server | undefined;

export const createServer = (): Promise<void> =>
  new Promise((resolve, reject) => {
    if (server) {
      return;
    }

    server = configureRoutes(
      express()
        .disable("x-powered-by")
        .use(morgan("dev"))
        .use(urlencoded({ extended: true }))
        .use(json())
        .use(cors())
    )
      .listen(process.env.SERVICE_PORT ?? 5001, resolve)
      .on("error", reject);
  });

export const killServer = (): Promise<void> =>
  new Promise((resolve, reject) => {
    if (server) {
      server.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
      server = undefined;
    }
  });
