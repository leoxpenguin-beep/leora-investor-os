import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { theme } from "../theme/theme";

type GravityCardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function GravityCard({ children, style }: GravityCardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.panel,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
});
