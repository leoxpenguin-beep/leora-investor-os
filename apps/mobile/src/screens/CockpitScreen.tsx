import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { GravityCard } from "../components/GravityCard";
import { GravityDot } from "../components/GravityDot";
import { theme } from "../theme/theme";

export function CockpitScreen() {
  return (
    <View style={styles.root}>
      <GravityCard>
        <View style={styles.header}>
          <GravityDot size={10} />
          <Text style={styles.title}>Cockpit</Text>
        </View>
        <Text style={styles.subtitle}>
          Snapshot detail placeholder. Values are display-only and currently unset.
        </Text>
      </GravityCard>

      <View style={styles.grid}>
        <MetricPlaceholder label="Metric" />
        <MetricPlaceholder label="Metric" />
        <MetricPlaceholder label="Metric" />
        <MetricPlaceholder label="Metric" />
      </View>
    </View>
  );
}

function MetricPlaceholder({ label }: { label: string }) {
  return (
    <GravityCard style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      {/* TODO: Replace with stored snapshot `value_text` once wired (display-only). */}
      <Text style={styles.metricValue}>—</Text>
      <Text style={styles.metricMeta}>value_text (display-only)</Text>
    </GravityCard>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: theme.spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  title: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 12,
    marginTop: theme.spacing.sm,
    lineHeight: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  metricCard: {
    flexGrow: 1,
    flexBasis: 160,
  },
  metricLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  metricValue: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "800",
    marginTop: theme.spacing.sm,
  },
  metricMeta: {
    color: theme.colors.subtle,
    fontSize: 12,
    marginTop: theme.spacing.xs,
  },
});
