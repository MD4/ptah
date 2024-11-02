import "dotenv/config"
import { log, logError } from "@ptah/lib-logger"
import type { PubsubChannel, PubsubMessage } from "@ptah/lib-models"
import { services } from "@ptah/lib-shared"

import * as server from "./server"

const kill = async (gracefully: boolean): Promise<void> => {
  log(process.env.SERVICE_NAME, "killing...")
  services.pubsub.disconnect()
  if (gracefully) {
    await server.stop()
  } else {
    void server.stop()
  }
  log(process.env.SERVICE_NAME, "killed.")
  process.exitCode = gracefully ? 0 : 1
  process.exit()
}

const killVoid = (gracefully: boolean) => (): void => void kill(gracefully)

const main = async (): Promise<void> => {
  log(process.env.SERVICE_NAME, "starting..")

  process.on("SIGINT", killVoid(true))
  process.on("SIGTERM", killVoid(true))
  // process.on("SIGKILL", killVoid(false));

  const channels: PubsubChannel[] = ["midi", "system"]

  await Promise.all([
    services.pubsub.connect(
      channels,
      (channel: PubsubChannel, message: PubsubMessage) => {
        if (message.type === "clock:tick") {
          return // ignore clock:tick to avoid ws flooding
        }

        server.broadcast(channel, message)
      }
    ),
    server.start(channels, (channel: PubsubChannel, message: PubsubMessage) => {
      services.pubsub.send(channel, message)
    }),
  ])

  log(process.env.SERVICE_NAME, "service is running")
}

main().catch((error: unknown) => {
  logError(process.env.SERVICE_NAME, error)
  return kill(false)
})
