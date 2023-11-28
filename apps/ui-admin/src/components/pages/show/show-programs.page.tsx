import * as React from "react";
import { useParams } from "react-router-dom";
import { useShowGet } from "../../../repositories/show.repository";
import Splashscreen from "../../atoms/splashscreen";
import PtahError from "../../molecules/ptah-error";
import ShowPrograms from "../../organisms/show/show-programs";

export default function ShowCreatePage(): JSX.Element {
  const { showName } = useParams();

  const { isPending, error, data } = useShowGet(showName);

  return (
    <>
      {error ? <PtahError error={error} /> : null}
      {data ? <ShowPrograms show={data} /> : null}
      <Splashscreen in={isPending} />
    </>
  );
}
