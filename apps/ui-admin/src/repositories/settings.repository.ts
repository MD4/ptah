import * as models from "@ptah-app/lib-models";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import { BASE_URL_API } from "../utils/env";

/**
 * GET
 */

const SettingsGet = (): Promise<models.Settings> =>
  axios
    .get(`${BASE_URL_API}/settings`)
    .then(({ data }) => models.settings.parseAsync(data));

export const useSettingsGet = (): UseQueryResult<models.Settings | undefined> =>
  useQuery({
    queryKey: ["Settings", name],
    queryFn: SettingsGet,
  });

/**
 * PUT
 */

const settingsPut = (settings: models.Settings): Promise<models.Settings> =>
  axios
    .put(`${BASE_URL_API}/settings`, settings)
    .then(({ data }) => models.settings.parseAsync(data));

export const useSettingsPut = (
  onSuccess: (settings: models.Settings) => void,
  onError: (error: Error) => void,
): UseMutationResult<models.Settings, Error, models.Settings> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsPut,
    onSuccess,
    onError,
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: ["settings"],
      }),
  });
};
