import type { RgbColor } from "@ptah-app/lib-utils";
import { theme } from "antd";
import * as React from "react";

import { rgbToCss } from "../../utils/color";

const { useToken } = theme;

/**
 * Color analog of the Graph sparkline: a timeline strip of the previewed
 * colors with the current frame as a larger swatch below.
 */
export default function ColorStrip({
  colors,
  width,
  height,
}: {
  colors: RgbColor[];
  width: number;
  height: number;
}) {
  const { token } = useToken();

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

  const stripHeight = height * 0.55;
  const swatchY = height * 0.7;
  const swatchHeight = height * 0.3;
  const frameWidth = width / Math.max(colors.length, 1);

  const frames = React.useMemo(
    () =>
      colors.map((color, index) => ({
        x: index * frameWidth,
        fill: rgbToCss(color),
      })),
    [colors, frameWidth],
  );

  const currentColor = colors.at(-1);

  return (
    <figure style={styles.container}>
      <svg
        style={styles.svg}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <title>Color Output Preview</title>
        {frames.map((frame) => (
          <rect
            key={frame.x}
            x={frame.x}
            y={0}
            width={frameWidth + 0.5}
            height={stripHeight}
            fill={frame.fill}
          />
        ))}
        <rect
          x={0}
          y={swatchY}
          width={width}
          height={swatchHeight}
          rx={token.borderRadiusSM}
          fill={currentColor ? rgbToCss(currentColor) : "transparent"}
          stroke={token.colorBorderSecondary}
        />
      </svg>
    </figure>
  );
}
