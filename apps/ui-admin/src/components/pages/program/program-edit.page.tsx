import * as React from "react";
import { useParams } from "react-router-dom";

import { ProgramEditProvider } from "../../../domain/program.domain";
import { useProgramGet } from "../../../repositories/program.repository";
import PtahError from "../../molecules/ptah-error";
import ProgramEdit from "../../organisms/program/program-edit";

export default function ProgramCreatePage(): JSX.Element {
  const { programName } = useParams();

  const { error, data } = useProgramGet(programName);

  return (
    <>
      {error ? <PtahError error={error} /> : null}
      {data ? (
        <ProgramEditProvider initialProgram={data}>
          <ProgramEdit />
        </ProgramEditProvider>
      ) : null}
    </>
  );
}
