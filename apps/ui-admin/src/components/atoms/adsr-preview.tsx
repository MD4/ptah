import { adsr } from "@ptah/lib-utils";
import * as React from "react";

export default function AdsrPreview({
  attackRate,
  decayRate,
  sustainLevel,
  releaseRate,
  precision,
  width = 100,
}: {
  attackRate: number;
  decayRate: number;
  sustainLevel: number;
  releaseRate: number;
  precision: number;
  width?: number;
}) {
  const styles = React.useMemo(
    () =>
      ({
        container: {
          padding: 0,
          margin: 0,
        },
        svg: {
          display: "block",
        },
      }) satisfies Record<string, React.CSSProperties>,
    [],
  );

  const adsrInstance = React.useMemo(
    () => adsr(attackRate, decayRate, sustainLevel, releaseRate),
    [attackRate, decayRate, sustainLevel, releaseRate],
  );

  const values = React.useMemo(
    () =>
      Array.from({ length: precision }, (_, i) => adsrInstance(i / precision)),
    [adsrInstance, precision],
  );

  const pathData = React.useMemo(() => {
    const allPoints = values.map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = width / 2 - value * (width / 2);
      return `${x},${y}`;
    });

    const [firstPoint, ...points] = allPoints;

    return `M${firstPoint} L${points.join(" L")}`;
  }, [values, width]);

  return (
    <figure style={styles.container}>
      <svg
        style={styles.svg}
        width={width}
        viewBox={`-2 -2 ${width + 4} ${width / 2 + 4}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <title>ADSR Envelope Preview</title>
        <defs>
          <linearGradient id="gradient">
            <stop offset="0" stopColor="#4c2bf0" />
            <stop offset="1" stopColor="#6d4fe5" />
          </linearGradient>
          <mask id="gradient-mask">
            <path
              d={pathData}
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </mask>
        </defs>

        <g mask="url(#gradient-mask)">
          <rect
            x="-2"
            y="-2"
            width={width + 4}
            height={width / 2 + 4}
            fill="url(#gradient)"
          />
        </g>
      </svg>
    </figure>
  );
}
