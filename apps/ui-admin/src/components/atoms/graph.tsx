import { theme } from "antd";
import * as React from "react";

const { useToken } = theme;

export default function Graph({
  values,
  width,
  height,
}: {
  values: number[];
  width: number;
  height: number;
}) {
  const { token } = useToken();
  const gradientId = React.useId();
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

  const rectifiedValues = React.useMemo(
    () =>
      values.filter((value) => !Number.isNaN(value) && Number.isFinite(value)),
    [values],
  );
  const max = Math.max(...rectifiedValues, 1);
  const min = Math.min(...rectifiedValues, 0);

  const pathData = React.useMemo(() => {
    const allPoints = rectifiedValues.map((value, index) => {
      const x = (index / (rectifiedValues.length - 1)) * width;
      const y = height - ((value - min) * height) / (max - min);

      return `${x},${y}`;
    });

    const [firstPoint, ...points] = allPoints;

    return `M${firstPoint} L${points.join(" L")}`;
  }, [rectifiedValues, width, height, min, max]);

  return (
    <figure style={styles.container}>
      <svg
        style={styles.svg}
        width={width}
        height={height}
        viewBox={`-2 -2 ${width + 4} ${height + 4}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <title>ADSR Envelope Preview</title>
        <defs>
          <linearGradient id={gradientId}>
            <stop offset="0" stopColor={token.colorPrimary} />
            <stop offset="1" stopColor={token.colorPrimaryHover} />
          </linearGradient>
          <mask id={`${gradientId}-mask`}>
            <path
              d={pathData}
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </mask>
        </defs>

        <g mask={`url(#${gradientId}-mask)`}>
          <rect
            x="-2"
            y="-2"
            width={width + 4}
            height={height + 4}
            fill={`url(#${gradientId})`}
          />
        </g>
      </svg>
    </figure>
  );
}
