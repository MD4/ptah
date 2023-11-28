import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import * as models from "@ptah/lib-models";
import * as z from "zod";

export const BASE_URL_API = "http://localhost:5001";

const programCreate = (
  program: models.ProgramCreate
): Promise<models.Program> =>
  axios
    .post(`${BASE_URL_API}/program/create`, program)
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

const programList = (): Promise<string[]> =>
  axios
    .get(`${BASE_URL_API}/program`)
    .then(({ data }) => z.array(z.string()).parseAsync(data));

export const useProgramList = (): UseQueryResult<models.Program["name"][]> =>
  useQuery({
    queryKey: ["program"],
    queryFn: programList,
  });

const programGet = (name: models.Program["name"]): Promise<models.Program> =>
  axios
    .get(`${BASE_URL_API}/program/${name}`)
    .then(({ data }) => models.program.parseAsync(data));

export const useProgramGet = (
  name?: models.Program["name"]
): UseQueryResult<models.Program | undefined> => {
  const navigate = useNavigate();

  return useQuery({
    queryKey: ["program", name],
    queryFn: () => {
      if (name) {
        return programGet(name);
      }

      navigate("/");
    },
  });
};
