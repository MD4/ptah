import type * as models from "@ptah-app/lib-models";
import {
  // @ts-expect-error -- wtf??
  mediaDevices,
} from "node-web-audio-api";

export const getDeviceKindPredicate =
  (_kind: models.DeviceAudio["kind"]) =>
  ({ kind }: models.DeviceAudio) =>
    kind === _kind;

export const listDeviceAudio = async (
  filter: (device: models.DeviceAudio) => boolean,
): Promise<models.DeviceAudio[]> => {
  const devices: models.DeviceAudio[] = await mediaDevices.enumerateDevices();

  return devices.filter(filter);
};

export const listDeviceAudioInput = async (): Promise<models.DeviceAudio[]> =>
  listDeviceAudio(getDeviceKindPredicate("audioinput"));

export const listDeviceAudioOutput = async (): Promise<models.DeviceAudio[]> =>
  listDeviceAudio(getDeviceKindPredicate("audiooutput"));
