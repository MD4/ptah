import type { PubsubChannel, PubsubMessage } from "@ptah/lib-models";

import { handleSystemMessage } from "./message-system-handlers";

export const handleMessage = async (
  channel: PubsubChannel,
  message: PubsubMessage,
): Promise<void> => {
  switch (channel) {
    case "system":
      return handleSystemMessage(message);
    default:
  }
};
