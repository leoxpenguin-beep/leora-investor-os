import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { GravityCard } from "../components/GravityCard";
import { GravityDot } from "../components/GravityDot";
import { theme } from "../theme/theme";

export function OrbitScreen() {
  return (
    <View style={styles.root}>
      <GravityCard>
        <View style={styles.header}>
          <GravityDot size={10} />
          <Text style={styles.title}>Orbit</Text>
        </View>
        <Text style={styles.subtitle}>
          Investor list placeholder. No real data is wired in Module 0.
        </Text>
      </GravityCard>

      <View style={styles.list}>
        <OrbitRow label="Investor" />
        <OrbitRow label="Investor" />
        <OrbitRow label="Investor" />
      </View>
    </View>
  );
}

function OrbitRow({ label }: { label: string }) {
  return (
    <GravityCard style={styles.rowCard}>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>{label}</Text>
        {/* TODO: Replace with display-only snapshot text once wired (no derived metrics). */}
        <Text style={styles.rowValue}>—</Text>
      </View>
      <Text style={styles.rowMeta}>Display-only placeholder</Text>
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
  list: {
    gap: theme.spacing.sm,
  },
  rowCard: {
    paddingVertical: theme.spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  rowLabel: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  rowValue: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  rowMeta: {
    color: theme.colors.subtle,
    fontSize: 12,
    marginTop: theme.spacing.xs,
  },
});
