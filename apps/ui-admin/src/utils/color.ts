import type { RgbColor } from "@ptah-app/lib-utils";

const toByte = (value: number): number =>
  Number.isFinite(value)
    ? Math.min(Math.max(Math.round(value * 255), 0), 255)
    : 0;

/** CSS color from a normalized (0..1 components) RgbColor. */
export const rgbToCss = ({ r, g, b }: RgbColor): string =>
  `rgb(${toByte(r)} ${toByte(g)} ${toByte(b)})`;

/** Static hue wheel marking color-kind handles; denotes chromaticity, not theme. */
export const COLOR_WHEEL_GRADIENT =
  "conic-gradient(from 180deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)";
