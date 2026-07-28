import { clamp } from "./clamp";

export type RgbColor = {
  r: number;
  g: number;
  b: number;
};

/**
 * HSV -> RGB, all components normalized to [0, 1].
 * Hue wraps (1.2 === 0.2, negatives wrap up); saturation and value are
 * clamped to [0, 1]. NaN inputs propagate to NaN components — scrubbed
 * downstream by toChannelValue.
 */
export const hsvToRgb = (h: number, s: number, v: number): RgbColor => {
  const hue = (h - Math.floor(h)) * 6;
  const saturation = clamp(s, 0, 1);
  const value = clamp(v, 0, 1);

  const sector = Math.floor(hue);
  const fraction = hue - sector;
  const p = value * (1 - saturation);
  const q = value * (1 - saturation * fraction);
  const t = value * (1 - saturation * (1 - fraction));

  switch (sector % 6) {
    case 0:
      return { r: value, g: t, b: p };
    case 1:
      return { r: q, g: value, b: p };
    case 2:
      return { r: p, g: value, b: t };
    case 3:
      return { r: p, g: q, b: value };
    case 4:
      return { r: t, g: p, b: value };
    default:
      return { r: value, g: p, b: q };
  }
};
