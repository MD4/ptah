import fs from "node:fs";

import ipc from "@kalm/ipc";
import { log } from "@ptah/lib-logger";
import * as kalm from "kalm";

let server: Server | undefined;

export const start = (): Promise<void> =>
  new Promise((resolve, reject) => {
    const { SERVICE_BUS_NAME, SERVICE_BUS_PORT } = process.env;

    if (!SERVICE_BUS_NAME) {
      reject(Error("Missing env var SERVICE_BUS_NAME"));
    }
    if (!SERVICE_BUS_PORT) {
      reject(Error("Missing env var SERVICE_BUS_PORT"));
    }

    const socketPath = `/tmp/${SERVICE_BUS_NAME ?? ""}.socket${SERVICE_BUS_PORT ?? ""}`;

    if (fs.existsSync(socketPath)) {
      log(
        process.env.SERVICE_BUS_NAME,
        "socket file is already existing, removing it..",
      );
      fs.unlinkSync(socketPath);
      log(process.env.SERVICE_BUS_NAME, "socket file removed");
    }

    server = kalm.listen({
      host: "0.0.0.0",
      port: Number(SERVICE_BUS_PORT),
      transport: ipc({
        path: `/tmp/${SERVICE_BUS_NAME ?? ""}.socket`,
        socketTimeout: 1000,
      }),
      routine: kalm.routines.tick({ hz: 1000 }),
    });

    server.on("connection", (client) => {
      log(process.env.SERVICE_BUS_NAME, "client connected");

      client.on("disconnect", () => {
        log(process.env.SERVICE_BUS_NAME, "client disconnected");
      });

      const channels = ["midi", "system"];

      for (const channel of channels) {
        client.subscribe(channel, (body: Serializable) => {
          server?.broadcast(channel, body);
        });
      }
    });

    resolve();
  });

export const stop = (): void => {
  log(process.env.SERVICE_BUS_NAME, "stopping ipc");
  server?.stop();
  log(process.env.SERVICE_BUS_NAME, "ipc stopped");
};
