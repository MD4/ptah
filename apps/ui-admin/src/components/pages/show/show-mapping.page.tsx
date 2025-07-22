import * as React from "react";
import { useParams } from "react-router-dom";

import { ShowEditProvider } from "../../../domain/show.domain";
import { useShowGet } from "../../../repositories/show.repository";
import PtahError from "../../molecules/ptah-error";
import ShowMapping from "../../organisms/show/show-mapping";

export default function ShowCreatePage() {
  const { showName } = useParams();

  const { error, data } = useShowGet(showName);

  return (
    <>
      {error ? <PtahError error={error} /> : null}
      {data ? (
        <ShowEditProvider initialShow={data}>
          <ShowMapping />
        </ShowEditProvider>
      ) : null}
    </>
  );
}
