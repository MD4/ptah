import { program as programDomain } from "@ptah/lib-domains";
import type { Program } from "@ptah/lib-models";
import { range } from "@ptah/lib-utils";

import * as React from "react";
import { useInterval } from "usehooks-ts";

const initialProgramPreviewState: programDomain.ProgramOutput[] = [];

const ProgramPreviewStateContext = React.createContext<
  programDomain.ProgramOutput[]
>(initialProgramPreviewState);

export function ProgramPreviewProvider({
  program,
  length = 24 * 4,
  active = false,
  children,
}: {
  program: Program;
  length?: number;
  active?: boolean;
  children: React.ReactNode;
}) {
  const compiledProgram = React.useMemo(
    () => programDomain.compile(program),
    [program],
  );

  const inputs = React.useMemo(() => new Map<number, number>(), []);

  // const programPreview: programDomain.ProgramOutput[] = React.useMemo(
  //   () => range(length).map((time) => compiledProgram(time / 24, inputs)),
  //   [compiledProgram, inputs, length],
  // );

  const initialProgramPreview = React.useMemo(
    () => range(length).map((time) => compiledProgram(time / 24, inputs)),
    [compiledProgram, inputs, length],
  );

  const [programPreview, setProgramPreview] = React.useState<
    programDomain.ProgramOutput[]
  >(initialProgramPreview);

  const [time, setTime] = React.useState(0);

  useInterval(() => {
    if (!active) return;

    const output = compiledProgram(time / 24, inputs);

    const [_, ...rest] = programPreview;

    setProgramPreview([...rest, output]);
    setTime((prevTime) => prevTime + 1);
  }, 1000 / 24); // Update at 24 FPS

  React.useEffect(() => {
    if (!active) {
      setProgramPreview(initialProgramPreview);
      setTime(0);
    }
  }, [active, initialProgramPreview]);

  return (
    <ProgramPreviewStateContext.Provider value={programPreview}>
      {children}
    </ProgramPreviewStateContext.Provider>
  );
}

export function useProgramPreviewState(): programDomain.ProgramOutput[] {
  return React.useContext(ProgramPreviewStateContext);
}
