import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { GravityCard } from "../components/GravityCard";
import { AGENTS, AgentId, NOT_AVAILABLE_IN_SNAPSHOT } from "../lib/agentRegistry";
import { theme } from "../theme/theme";

export function AgentsScreen({
  onOpenAgent,
}: {
  onOpenAgent: (agentId: AgentId) => void;
}) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Agents</Text>
      <Text style={styles.subtitle}>Snapshot-scoped. Read-only. No calculations or predictions.</Text>

      <View style={styles.grid}>
        {AGENTS.map((a) => {
          return (
            <Pressable
              key={a.id}
              accessibilityRole="button"
              accessibilityLabel={a.enabled ? `Open ${a.title}` : `${a.title} locked`}
              onPress={() => {
                if (!a.enabled) {
                  Alert.alert(NOT_AVAILABLE_IN_SNAPSHOT);
                  return;
                }
                onOpenAgent(a.id);
              }}
              style={({ pressed }) => [styles.cardPressable, pressed && styles.cardPressed]}
            >
              <GravityCard style={[styles.card, !a.enabled && styles.cardLocked]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{a.title}</Text>
                  {!a.enabled ? (
                    <View style={styles.lockBadge}>
                      <Text style={styles.lockBadgeText}>Locked</Text>
                    </View>
                  ) : (
                    <View style={styles.enabledBadge}>
                      <Text style={styles.enabledBadgeText}>Enabled</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardBody}>{a.shortDescription}</Text>
              </GravityCard>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bg,
  },
  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 6,
  },
  subtitle: {
    color: theme.colors.subtle,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: theme.spacing.md,
  },
  grid: {
    gap: theme.spacing.md,
  },
  cardPressable: {
    borderRadius: theme.radius.lg,
  },
  cardPressed: {
    opacity: 0.92,
  },
  card: {
    padding: theme.spacing.md,
  },
  cardLocked: {
    opacity: 0.85,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
    marginBottom: 8,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  cardBody: {
    color: theme.colors.subtle,
    fontSize: 12,
    lineHeight: 16,
  },
  lockBadge: {
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.panel,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  lockBadgeText: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  enabledBadge: {
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.accentSoft,
    backgroundColor: theme.colors.panelElevated,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  enabledBadgeText: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
});

