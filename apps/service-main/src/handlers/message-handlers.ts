import type { PubsubChannel, PubsubMessage } from "@ptah/lib-models"

import { handleMidiMessage } from "./message-midi-handlers"
import { handleSystemMessage } from "./message-system-handlers"

export const handleMessage = async (
  channel: PubsubChannel,
  message: PubsubMessage
): Promise<void> => {
  switch (channel) {
    case "midi":
      handleMidiMessage(message)
      return
    case "system":
      return handleSystemMessage(message)
    default:
  }
}
