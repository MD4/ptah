import * as React from "react";
import { useParams } from "react-router-dom";
import { useProgramGet } from "../../../repositories/program.repository";
import Splashscreen from "../../atoms/splashscreen";
import PtahError from "../../molecules/ptah-error";
import ProgramEdit from "../../organisms/program/program-edit";

export default function ProgramCreatePage(): JSX.Element {
  const { programName } = useParams();

  const { isPending, error, data } = useProgramGet(programName);

  return (
    <>
      {error ? <PtahError error={error} /> : null}
      {data ? <ProgramEdit program={data} /> : null}
      <Splashscreen in={isPending} />
    </>
  );
}
