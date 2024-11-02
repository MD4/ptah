import * as React from "react";
import { useParams } from "react-router-dom";

import { ShowEditProvider } from "../../../domain/show.domain";
import { useShowGet } from "../../../repositories/show.repository";
import Splashscreen from "../../atoms/splashscreen";
import PtahError from "../../molecules/ptah-error";
import ShowMapping from "../../organisms/show/show-mapping";

export default function ShowCreatePage(): JSX.Element {
  const { showName } = useParams();

  const { isPending, error, data } = useShowGet(showName);

  return (
    <>
      {error ? <PtahError error={error} /> : null}
      {data ? (
        <ShowEditProvider initialShow={data}>
          <ShowMapping />
        </ShowEditProvider>
      ) : null}
      <Splashscreen in={isPending} />
    </>
  );
}
