import type { PubsubChannel, PubsubMessage } from "@ptah/lib-models";

import { handleSystemMessage } from "./message-system-handlers";

export const handleMessage = (
  channel: PubsubChannel,
  message: PubsubMessage,
): void => {
  console.log(`Message received on channel ${channel}:`, message);
  switch (channel) {
    case "system":
      handleSystemMessage(message);
      break;
    default:
  }
};
