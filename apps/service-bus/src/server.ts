import fs from "node:fs";
import * as kalm from "kalm";
import ipc from "@kalm/ipc";
import { log } from "@ptah/lib-logger";

let server: Server | undefined;

export const start = (): Promise<void> =>
  new Promise((resolve, reject) => {
    const { SERVICE_NAME, SERVICE_PORT } = process.env;

    if (!SERVICE_NAME) {
      reject(Error("Missing env var SERVICE_NAME"));
    }
    if (!SERVICE_PORT) {
      reject(Error("Missing env var SERVICE_PORT"));
    }

    const socketPath = `/tmp/${SERVICE_NAME ?? ""}.socket${SERVICE_PORT ?? ""}`;

    if (fs.existsSync(socketPath)) {
      log(
        process.env.SERVICE_NAME,
        "socket file is already existing, removing it.."
      );
      fs.unlinkSync(socketPath);
      log(process.env.SERVICE_NAME, "socket file removed");
    }

    server = kalm.listen({
      host: "0.0.0.0",
      port: Number(SERVICE_PORT),
      transport: ipc({
        path: `/tmp/${SERVICE_NAME ?? ""}.socket`,
        socketTimeout: 1000,
      }),
      routine: kalm.routines.tick({ hz: 1000 }),
    });

    server.on("connection", (client) => {
      log(process.env.SERVICE_NAME, "client connected");

      client.on("disconnect", () => {
        log(process.env.SERVICE_NAME, "client disconnected");
      });

      const channels = ["midi", "system"];

      channels.forEach((channel) => {
        client.subscribe(channel, (body: Serializable) => {
          server?.broadcast(channel, body);
        });
      });
    });

    resolve();
  });

export const stop = (): void => {
  log(process.env.SERVICE_NAME, "stopping ipc");
  server?.stop();
  log(process.env.SERVICE_NAME, "ipc stopped");
};
