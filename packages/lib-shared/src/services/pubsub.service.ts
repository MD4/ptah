import ipc from "@kalm/ipc";
import { log } from "@ptah/lib-logger";
import type { PubsubChannel, PubsubMessage } from "@ptah/lib-models";
import * as kalm from "kalm";

const LOG_CONTEXT = `${process.env.SERVICE_NAME ?? ""}:pusub`;

let client: Client | undefined;
let reconnecting = false;

export const connect = (
  channels: PubsubChannel[] = [],
  callback: (channel: PubsubChannel, message: PubsubMessage) => void = () =>
    undefined,
): Promise<void> =>
  new Promise((resolve, reject) => {
    const { SERVICE_BUS_NAME, SERVICE_BUS_PORT } = process.env;

    if (!SERVICE_BUS_NAME) {
      reject(Error("Missing env var SERVICE_BUS_NAME"));
    }

    if (!SERVICE_BUS_PORT) {
      reject(Error("Missing env var SERVICE_BUS_PORT"));
    }

    if (!reconnecting) {
      log(LOG_CONTEXT, `connecting to ${SERVICE_BUS_NAME ?? ""}..`);
    }

    client = kalm.connect({
      host: "0.0.0.0",
      port: Number(SERVICE_BUS_PORT),
      transport: ipc({
        path: `/tmp/${SERVICE_BUS_NAME ?? ""}.socket`,
        socketTimeout: 1000,
      }),
      routine: kalm.routines.realtime(),
    });

    channels.forEach((channel) => {
      client?.subscribe(channel, (message: PubsubMessage) => {
        callback(channel, message);
      });
    });

    client.on("connect", () => {
      reconnecting = false;
      log(LOG_CONTEXT, `connected to ${SERVICE_BUS_NAME ?? ""}`);
      resolve();
    });

    client.on("disconnect", () => {
      if (!reconnecting) {
        log(LOG_CONTEXT, `disconnected from ${SERVICE_BUS_NAME ?? ""}`);
        log(LOG_CONTEXT, `reconnecting to ${SERVICE_BUS_NAME ?? ""}..`);
      }
      reconnecting = true;
      setTimeout(() => void connect(channels, callback), 200);
    });
  });

export const send = (channel: PubsubChannel, message: PubsubMessage): void => {
  if (client) {
    client.write(channel, message);
  }
};

export const disconnect = (): void => {
  log(LOG_CONTEXT, "disconnecting ipc");
  client?.destroy();
  log(LOG_CONTEXT, "disconnected ipc");
};
