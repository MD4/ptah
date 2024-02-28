import "dotenv/config";
import { log, logError } from "@ptah/lib-logger";
import { services } from "@ptah/lib-shared";
import type { PubsubChannel, PubsubMessage } from "@ptah/lib-models";
import * as server from "./server";

const kill = (gracefully = true): void => {
  log(process.env.SERVICE_NAME, "killing...");
  services.pubsub.disconnect();
  server.stop();
  log(process.env.SERVICE_NAME, "killed.");
  process.exitCode = gracefully ? 0 : 1;
  process.exit();
};

const main = async (): Promise<void> => {
  log(process.env.SERVICE_NAME, "starting..");

  process.on("SIGINT", kill);
  process.on("SIGTERM", kill);

  const channels: PubsubChannel[] = ["midi", "system"];

  await Promise.all([
    services.pubsub.connect(
      channels,
      (channel: PubsubChannel, message: PubsubMessage) => {
        if (message.type === "clock:tick") {
          return; // ignore clock:tick to avoid ws flooding
        }

        server.broadcast(channel, message);
      }
    ),
    server.start(channels, (channel: PubsubChannel, message: PubsubMessage) => {
      services.pubsub.send(channel, message);
    }),
  ]);

  log(process.env.SERVICE_NAME, "service is running");
};

main().catch((err) => {
  logError(process.env.SERVICE_NAME, err);
  kill(false);
});
