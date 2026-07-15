import type { RgbColor } from "@ptah-app/lib-utils";

const toByte = (value: number): number =>
  Number.isFinite(value)
    ? Math.min(Math.max(Math.round(value * 255), 0), 255)
    : 0;

/** CSS color from a normalized (0..1 components) RgbColor. */
export const rgbToCss = ({ r, g, b }: RgbColor): string =>
  `rgb(${toByte(r)} ${toByte(g)} ${toByte(b)})`;
