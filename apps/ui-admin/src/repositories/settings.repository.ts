import * as models from "@ptah/lib-models";
import type { UseQueryResult } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
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
