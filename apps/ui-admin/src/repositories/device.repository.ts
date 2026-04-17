import * as models from "@ptah-app/lib-models";
import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import axios from "axios";
import z from "zod";
import { BASE_URL_API } from "../utils/env";

/**
 * LIST
 */

const deviceAudioInputList = (): Promise<models.DeviceAudioInput[]> =>
  axios
    .get(`${BASE_URL_API}/device/audio/input`)
    .then(({ data }) => z.array(models.deviceAudioInput).parseAsync(data));

export const useDeviceAudioInputList = (): UseQueryResult<
  models.DeviceAudioInput[]
> =>
  useQuery({
    queryKey: ["device", "audio", "input"],
    queryFn: deviceAudioInputList,
    refetchOnMount: true,
    refetchInterval: 5000,
  });
