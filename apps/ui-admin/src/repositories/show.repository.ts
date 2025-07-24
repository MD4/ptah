import * as models from "@ptah/lib-models";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import * as z from "zod";

import { BASE_URL_API } from "../utils/env";

/**
 * CREATE
 */

const showCreate = (show: models.ShowCreate): Promise<models.Show> =>
  axios
    .post(`${BASE_URL_API}/show`, show)
    .then(({ data }) => models.show.parseAsync(data));

export const useShowCreate = (
  onSuccess: (show: models.Show) => void,
  onError: (error: Error) => void,
): UseMutationResult<models.Show, Error, models.ShowCreate> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: showCreate,
    onSuccess,
    onError,
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: ["show"],
      }),
  });
};

/**
 * LIST
 */

const showList = (): Promise<string[]> =>
  axios
    .get(`${BASE_URL_API}/show`)
    .then(({ data }) => z.array(z.string()).parseAsync(data));

export const useShowList = (): UseQueryResult<models.ShowName[]> =>
  useQuery({
    queryKey: ["show"],
    queryFn: showList,
  });

/**
 * GET
 */

const showGet = (name: models.ShowName): Promise<models.Show> =>
  axios
    .get(`${BASE_URL_API}/show/${name}`)
    .then(({ data }) => models.show.parseAsync(data));

export const useShowGet = (
  name?: models.ShowName,
): UseQueryResult<models.Show | undefined> => {
  const navigate = useNavigate();

  return useQuery({
    queryKey: ["show", name],
    queryFn: () => {
      if (name) {
        return showGet(name);
      }

      navigate("/");
    },
  });
};

/**
 * PUT
 */

const showPut = (show: models.Show): Promise<models.Show> =>
  axios
    .put(`${BASE_URL_API}/show/${show.name}`, show)
    .then(({ data }) => models.show.parseAsync(data));

export const useShowPut = (
  onSuccess: (show: models.Show) => void,
  onError: (error: Error) => void,
): UseMutationResult<models.Show, Error, models.Show> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: showPut,
    onSuccess,
    onError,
    onSettled: (show) =>
      queryClient.invalidateQueries({
        queryKey: ["show", show?.name],
      }),
  });
};

/**
 * DELETE
 */

const showDelete = (name: models.ShowName): Promise<void> =>
  axios.delete(`${BASE_URL_API}/show/${name}`);

export const useShowDelete = (
  onSuccess: () => void,
  onError: (error: Error) => void,
): UseMutationResult<void, Error, models.ShowName> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: showDelete,
    onSuccess,
    onError,
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: ["show"],
      }),
  });
};
