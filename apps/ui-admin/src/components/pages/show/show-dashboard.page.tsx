import * as React from "react";
import { useParams } from "react-router-dom";
import { useShowGet } from "../../../repositories/show.repository";
import Splashscreen from "../../atoms/splashscreen";
import PtahError from "../../molecules/ptah-error";
import ShowDashboard from "../../organisms/show/show-dashboard";

export default function ShowCreatePage(): JSX.Element {
  const { showName } = useParams();

  const { isPending, error, data } = useShowGet(showName);

  return (
    <>
      {error ? <PtahError error={error} /> : null}
      {data ? <ShowDashboard show={data} /> : null}
      <Splashscreen in={isPending} />
    </>
  );
}
