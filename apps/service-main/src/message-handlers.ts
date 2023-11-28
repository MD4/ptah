import type { services } from "@ptah/lib-shared";
import { handleMidiMessage } from "./midi-handlers";

export const handleMessage = (
  channel: services.Pubsub.Channel,
  message: services.Pubsub.Message
): void => {
  switch (channel) {
    case "midi":
      handleMidiMessage(message);
      break;
    default:
  }
};
