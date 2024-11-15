import * as models from "@ptah/lib-models";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import axios from "axios";
import * as React from "react";
import * as z from "zod";

import { deduplicate, isDefined } from "../utils/array.utils";

export const BASE_URL_API = "http://localhost:5001";

/**
 * CREATE
 */

const programCreate = (
  program: models.ProgramCreate,
): Promise<models.Program> =>
  axios
    .post(`${BASE_URL_API}/program`, program)
    .then(({ data }) => models.program.parseAsync(data));

export const useProgramCreate = (
  onSuccess: (program: models.Program) => void,
  onError: (error: Error) => void,
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
  name?: models.ProgramName,
): UseQueryResult<models.Program | undefined> =>
  useQuery({
    queryKey: ["program", name],
    enabled: Boolean(name),
    queryFn: () => (name ? programGet(name) : undefined),
  });

export const useProgramGetMany = (
  names: models.ProgramName[],
): UseQueryResult<models.Program>[] => {
  const queries = React.useMemo(
    () =>
      names.map((name) => ({
        queryKey: ["program", name],
        enabled: Boolean(name),
        queryFn: () => programGet(name),
      })),
    [names],
  );

  return useQueries({
    queries,
  });
};

export const useShowPrograms = (
  showPrograms: models.ShowPrograms,
): {
  data: models.Program[];
  isError: boolean;
  isPending: boolean;
  refetch: () => void;
} => {
  const programsNames = React.useMemo(
    () => deduplicate(Object.values(showPrograms)),
    [showPrograms],
  );

  const programsResponse = useProgramGetMany(programsNames);

  const data: models.Program[] = React.useMemo(
    () => programsResponse.map((response) => response.data).filter(isDefined),
    [programsResponse],
  );

  const isError = React.useMemo(
    () => programsResponse.some((response) => response.isError),
    [programsResponse],
  );

  const isPending = React.useMemo(
    () => programsResponse.some((response) => response.isPending),
    [programsResponse],
  );

  const refetch = React.useCallback(() => {
    programsResponse.forEach((response) => void response.refetch());
  }, [programsResponse]);

  return React.useMemo(
    () => ({ data, isError, isPending, refetch }),
    [data, isError, isPending, refetch],
  );
};

/**
 * PUT
 */

const programPut = (program: models.Program): Promise<models.Program> =>
  axios
    .put(`${BASE_URL_API}/program/${program.name}`, program)
    .then(({ data }) => models.program.parseAsync(data));

export const useProgramPut = (
  onSuccess: (program: models.Program) => void,
  onError: (error: Error) => void,
): UseMutationResult<models.Program, Error, models.Program> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: programPut,
    onSuccess,
    onError,
    onSettled: (program) =>
      queryClient.invalidateQueries({
        queryKey: ["program", program?.name],
      }),
  });
};

export const useProgramInvalidate = (): ((programName: string) => void) => {
  const queryClient = useQueryClient();

  return React.useCallback(
    (programName: string) =>
      void queryClient.invalidateQueries({
        queryKey: ["program", programName],
      }),
    [queryClient],
  );
};
