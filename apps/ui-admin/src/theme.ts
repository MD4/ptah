import type { ThemeConfig } from "antd";
import { theme } from "antd";

export const ptahTheme: ThemeConfig = {
  algorithm: [theme.darkAlgorithm],
  token: {
    colorPrimary: "#4c2bf0",
    colorInfo: "#4c2bf0",
    colorPrimaryHover: "#6d4fe5",
    colorError: "#ee2b3b",
    colorSuccess: "#81e052",
    colorWarning: "#f8c754",
    borderRadius: 12,
    wireframe: false,
    boxShadow: "none",
    lineWidth: 2,

    motionDurationFast: "80ms",
    motionDurationMid: "100ms",
    motionDurationSlow: "200ms",

    fontFamily: "Jost",
  },
  components: {
    Typography: {
      fontWeightStrong: 300,
    },
    Input: {
      colorBorder: "transparent",
    },
    InputNumber: {
      colorBorder: "transparent",
    },
    Select: {
      colorBorder: "transparent",
    },
    List: {
      colorBorder: "transparent",
    },
    Button: {
      primaryShadow: "none",
    },
    Slider: {
      colorPrimary: "#4c2bf0",
      colorPrimaryHover: "#4c2bf0",
      colorPrimaryActive: "#4c2bf0",
      colorPrimaryBorder: "#4c2bf0",
      colorPrimaryTextHover: "#ffffff",
      colorPrimaryTextActive: "#ffffff",
      colorPrimaryText: "#ffffff",
      colorPrimaryBorderHover: "#4c2bf0",
      trackHoverBg: "#4c2bf0",
      lineWidth: 1,
      handleLineWidth: 0,
      handleLineWidthHover: 0,
      handleColor: "#4c2bf0",
      handleActiveColor: "#4c2bf0",
      handleActiveOutlineColor: "transparent",
      lineWidthBold: 1,
      lineWidthFocus: 1,
      controlOutlineWidth: 0,
      railHoverBg: "rgba(0,0,0,0.2)",
      railBg: "rgba(0,0,0,0.2)",
      railSize: 3,
      handleSize: 12,
      handleSizeHover: 12,
      handleColorDisabled: "#4c2bf0",
      dotSize: 8,
      margin: 0,
      colorBgElevated: "#4c2bf0",
    },
  },
};
