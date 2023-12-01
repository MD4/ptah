import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import * as models from "@ptah/lib-models";
import * as z from "zod";

export const BASE_URL_API = "http://localhost:5001";

/**
 * CREATE
 */

const programCreate = (
  program: models.ProgramCreate
): Promise<models.Program> =>
  axios
    .post(`${BASE_URL_API}/program`, program)
    .then(({ data }) => models.program.parseAsync(data));

export const useProgramCreate = (
  onSuccess: (program: models.Program) => void,
  onError: (error: Error) => void
): UseMutationResult<models.Program, Error, models.ProgramCreate> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: programCreate,
    onSuccess,
    onError,
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: ["program"],
      }),
  });
};

/**
 * LIST
 */

const programList = (): Promise<string[]> =>
  axios
    .get(`${BASE_URL_API}/program`)
    .then(({ data }) => z.array(z.string()).parseAsync(data));

export const useProgramList = (): UseQueryResult<models.ProgramName[]> =>
  useQuery({
    queryKey: ["program"],
    queryFn: programList,
  });

/**
 * GET
 */

const programGet = (name: models.ProgramName): Promise<models.Program> =>
  axios
    .get(`${BASE_URL_API}/program/${name}`)
    .then(({ data }) => models.program.parseAsync(data));

export const useProgramGet = (
  name?: models.ProgramName
): UseQueryResult<models.Program | undefined> =>
  useQuery({
    queryKey: ["program", name],
    enabled: Boolean(name),
    queryFn: () => (name ? programGet(name) : undefined),
  });

/**
 * PUT
 */

const programPut = (program: models.Program): Promise<models.Program> =>
  axios
    .put(`${BASE_URL_API}/program/${program.name}`, program)
    .then(({ data }) => models.program.parseAsync(data));

export const useProgramPut = (
  onSuccess: (program: models.Program) => void,
  onError: (error: Error) => void
): UseMutationResult<models.Program, Error, models.Program> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: programPut,
    onSuccess,
    onError,
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: ["program"],
      }),
  });
};
