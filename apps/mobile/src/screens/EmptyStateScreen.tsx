import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { GravityCard } from "../components/GravityCard";
import { GravityDot } from "../components/GravityDot";
import { theme } from "../theme/theme";

export function EmptyStateScreen({
  title = "No snapshots available yet.",
  detail = "—",
}: {
  title?: string;
  detail?: string;
}) {
  return (
    <View style={styles.root}>
      <GravityCard>
        <View style={styles.header}>
          <GravityDot size={10} />
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.detail}>{detail}</Text>
      </GravityCard>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: theme.spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  title: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  detail: {
    color: theme.colors.subtle,
    fontSize: 12,
    lineHeight: 16,
    marginTop: theme.spacing.xs,
  },
});

