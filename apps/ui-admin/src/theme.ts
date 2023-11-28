import type { ThemeConfig } from "antd";
import { theme } from "antd";

export const ptahTheme: ThemeConfig = {
  algorithm: [theme.darkAlgorithm],
  token: {
    colorPrimary: "#4c2bf0",
    colorInfo: "#4c2bf0",
    colorError: "#ee2b3b",
    colorSuccess: "#81e052",
    colorWarning: "#f8c754",
    borderRadius: 12,
    wireframe: false,
    boxShadow: "none",

    motionDurationFast: "80ms",
    motionDurationMid: "100ms",
    motionDurationSlow: "200s",

    fontFamily: "Jost",
  },
  components: {
    Typography: {
      fontWeightStrong: 300,
    },
  },
};
