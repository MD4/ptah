import * as React from "react";
import { useParams } from "react-router-dom";

import { ShowEditProvider } from "../../../domain/show.domain";
import { useShowPrograms } from "../../../repositories/program.repository";
import { useShowGet } from "../../../repositories/show.repository";
import Splashscreen from "../../atoms/splashscreen";
import PtahError from "../../molecules/ptah-error";
import ShowPatch from "../../organisms/show/show-patch";

export default function ShowCreatePage(): JSX.Element {
  const { showName } = useParams();

  const show = useShowGet(showName);
  const programs = useShowPrograms(show.data?.programs ?? {});

  return (
    <>
      {show.error ? <PtahError error={show.error} /> : null}
      {show.data && !programs.isPending && !programs.isError ? (
        <ShowEditProvider initialShow={show.data}>
          <ShowPatch programs={programs.data} />
        </ShowEditProvider>
      ) : null}
      <Splashscreen in={show.isPending || programs.isPending} />
    </>
  );
}
