import type { PubsubMessage } from "@ptah-app/lib-models";

import * as midi from "../midi-server";

export const handleSystemMessage = (message: PubsubMessage): void => {
  switch (message.type) {
    case "midi:status:get":
      midi.notifyStatus();
      break;
    default:
  }
};
