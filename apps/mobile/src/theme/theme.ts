import { Platform } from "react-native";

export const theme = {
  colors: {
    bg: "#0B0D12",
    panel: "#0F1420",
    panelElevated: "#121A2B",
    border: "rgba(231, 236, 245, 0.10)",
    text: "#E7ECF5",
    muted: "rgba(231, 236, 245, 0.72)",
    subtle: "rgba(231, 236, 245, 0.52)",
    accent: "#7AA2FF",
    accentSoft: "rgba(122, 162, 255, 0.18)",
  },
  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 18,
  },
  typography: {
    mono: Platform.select({ ios: "Menlo", default: "monospace" }),
  },
} as const;
