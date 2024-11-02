import type { Socket } from "socket.io";
import { Server } from "socket.io";
import { log } from "@ptah/lib-logger";
import type { PubsubChannel, PubsubMessage } from "@ptah/lib-models";

let server: Server | undefined;

export const start = (
  channels: PubsubChannel[],
  onMessage: (channel: PubsubChannel, message: PubsubMessage) => void
): Promise<void> =>
  new Promise((resolve) => {
    server = new Server(Number(process.env.SERVICE_PORT), {
      cors: { origin: "*" },
    });

    server.on("connection", (client: Socket) => {
      log(process.env.SERVICE_NAME, "client connected");

      client.on("disconnect", (reason) => {
        log(process.env.SERVICE_NAME, "client disconnected, reason:", reason);
      });

      for (const channel of channels) {
        client.on(channel, (message: PubsubMessage) => {
          onMessage(channel, message);
        });
      }
    });

    resolve();
  });

export const stop = async (): Promise<void> => {
  log(process.env.SERVICE_NAME, "stopping ipc");
  await server?.close();
  log(process.env.SERVICE_NAME, "ipc stopped");
};

export const broadcast = (
  channel: PubsubChannel,
  message: PubsubMessage
): void => {
  if (server) {
    server.sockets.emit(channel, message);
  }
};
