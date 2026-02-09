import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { GravityCard } from "../components/GravityCard";
import { GravityDot } from "../components/GravityDot";
import { theme } from "../theme/theme";

export function EmptyStateScreen({
  onSignOut,
}: {
  onSignOut?: () => void;
}) {
  return (
    <View style={styles.root}>
      <GravityCard>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <GravityDot size={10} />
            {/* TODO: Use locked copy for this title in docs/LOCKED_COPY.md. */}
            <Text style={styles.title}>Onboarding</Text>
          </View>
          {onSignOut ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              onPress={onSignOut}
              style={({ pressed }) => [styles.signOutButton, pressed && styles.signOutButtonPressed]}
            >
              {/* TODO: Use locked copy for this label in docs/LOCKED_COPY.md. */}
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          ) : null}
        </View>

        {/* TODO: Use locked copy for this empty state message in docs/LOCKED_COPY.md. */}
        <Text style={styles.body}>No snapshots available yet.</Text>
      </GravityCard>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  title: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  body: {
    color: theme.colors.subtle,
    fontSize: 12,
    marginTop: theme.spacing.sm,
    lineHeight: 16,
  },
  signOutButton: {
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.panel,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  signOutButtonPressed: {
    opacity: 0.9,
  },
  signOutText: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "800",
  },
});

