import * as React from "react";
import { useParams } from "react-router-dom";

import { useShowPrograms } from "../../../repositories/program.repository";
import { useShowGet } from "../../../repositories/show.repository";
import Splashscreen from "../../atoms/splashscreen";
import PtahError from "../../molecules/ptah-error";
import ShowDashboard from "../../organisms/show/show-dashboard";

export default function ShowCreatePage(): JSX.Element {
  const { showName } = useParams();

  const show = useShowGet(showName);
  const programs = useShowPrograms(show.data?.programs ?? {});

  return (
    <>
      {show.error ? <PtahError error={show.error} /> : null}
      {show.data && !programs.isPending && !programs.isError ? (
        <ShowDashboard programs={programs.data} show={show.data} />
      ) : null}
      <Splashscreen in={show.isPending || programs.isPending} />
    </>
  );
}
