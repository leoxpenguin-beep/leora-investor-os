import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { theme } from "../theme/theme";

export function DataSourcePill({ demoModeEnabled }: { demoModeEnabled: boolean }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{demoModeEnabled ? "Data Source: DEMO" : "Data Source: REMOTE"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    marginTop: theme.spacing.xs,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.accentSoft,
    backgroundColor: theme.colors.panelElevated,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  pillText: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
});
