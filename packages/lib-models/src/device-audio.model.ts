import * as z from "zod";

export const device = z.object({
  deviceId: z.string(),
  label: z.string(),
  groupId: z.string(),
});

export const deviceAudioInput = device.extend({
  kind: z.literal("audioinput"),
});

export const deviceAudioOutput = device.extend({
  kind: z.literal("audiooutput"),
});

export const deviceAudio = z.union([deviceAudioInput, deviceAudioOutput]);

export type DeviceAudioInput = z.infer<typeof deviceAudioInput>;
export type DeviceAudioOutput = z.infer<typeof deviceAudioOutput>;

export type DeviceAudio = z.infer<typeof deviceAudio>;
