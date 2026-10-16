import { patch as patchDomain } from "@ptah-app/lib-domains";
import type { RgbColor } from "@ptah-app/lib-utils";

/**
 * CSS color from a normalized (0..1 components) RgbColor, using the same
 * float -> DMX byte conversion the runtime applies so previews match output.
 */
export const rgbToCss = ({ r, g, b }: RgbColor): string => {
  const { toChannelValue } = patchDomain;

  return `rgb(${toChannelValue(r)} ${toChannelValue(g)} ${toChannelValue(b)})`;
};

/** Static hue wheel marking color-kind handles; denotes chromaticity, not theme. */
export const COLOR_WHEEL_GRADIENT =
  "conic-gradient(from 180deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)";
