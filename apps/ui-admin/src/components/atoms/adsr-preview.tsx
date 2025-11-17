import { runner as runnerDomain } from "@ptah-app/lib-domains";
import { range } from "@ptah-app/lib-utils";
import * as React from "react";
import Graph from "./graph";

export default function AdsrPreview({
  attackRate,
  decayRate,
  sustainLevel,
  releaseRate,
  precision,
  width,
  height,
}: {
  attackRate: number;
  decayRate: number;
  sustainLevel: number;
  releaseRate: number;
  precision: number;
  width: number;
  height: number;
}) {
  const adsrInstance = React.useMemo(
    () => runnerDomain.adsr(attackRate, decayRate, sustainLevel, releaseRate),
    [attackRate, decayRate, sustainLevel, releaseRate],
  );

  const values = React.useMemo(
    () => range(precision).map((i) => adsrInstance(i / precision)),
    [adsrInstance, precision],
  );

  return <Graph values={values} width={width} height={height} />;
}
