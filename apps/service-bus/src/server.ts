import fs from "node:fs";
import * as kalm from "kalm";
import ipc from "@kalm/ipc";
import { log } from "@ptah/lib-logger";

let server: Server | undefined;

export const start = (): Promise<void> =>
  new Promise((resolve) => {
    const socketPath = `/tmp/${process.env.SERVICE_NAME}.socket${process.env.SERVICE_PORT}`;

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
      port: Number(process.env.SERVICE_PORT),
      transport: ipc({
        path: `/tmp/${process.env.SERVICE_NAME}.socket`,
        socketTimeout: 1000,
      }),
      routine: kalm.routines.tick({ hz: 1000 }),
    });

    server.on("connection", (client) => {
      log(process.env.SERVICE_NAME, "client connected");

      client.on("disconnect", () => {
        log(process.env.SERVICE_NAME, "client disconnected");
      });

      client.subscribe("midi", (body) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- s
        server?.broadcast("midi", body);
      });
    });

    resolve();
  });

export const stop = (): void => {
  log(process.env.SERVICE_NAME, "stopping ipc");
  server?.stop();
  log(process.env.SERVICE_NAME, "ipc stopped");
};
