import type { PubsubChannel, PubsubMessage } from "@ptah/lib-models";

import { handleSystemMessage } from "./message-system-handlers";

export const handleMessage = (
  channel: PubsubChannel,
  message: PubsubMessage,
): void => {
  switch (channel) {
    case "system":
      handleSystemMessage(message);
      break;
    default:
  }
};
