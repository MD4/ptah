export const theme = {
  colorPrimary: "#4c2bf0",
  colorInfo: "#4c2bf0",
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
} as const;

export const dmxStatusColor = {
  connected: theme.colorSuccess,
  disconnected: theme.colorError,
  connecting: theme.colorPrimary,
} as const;

export const midiStatusColor = {
  active: theme.colorSuccess,
  inactive: theme.colorError,
  idle: theme.colorPrimary,
} as const;
