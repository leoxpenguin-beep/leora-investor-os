import Constants from "expo-constants";
import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { GravityCard } from "../components/GravityCard";
import { GravityDot } from "../components/GravityDot";
import { SnapshotRow } from "../lib/rpc";
import { supabase } from "../lib/supabaseClient";
import { theme } from "../theme/theme";

export function AccountScreen({
  email,
  userId,
  selectedSnapshot,
  onOpenDocumentsSources,
}: {
  email: string | null;
  userId: string | null;
  selectedSnapshot: SnapshotRow | null;
  onOpenDocumentsSources: () => void;
}) {
  const [signOutLoading, setSignOutLoading] = React.useState(false);
  const [signOutErrorText, setSignOutErrorText] = React.useState<string | null>(null);

  const isSignedIn = Boolean(email && email.trim().length > 0);
  const emailText = email?.trim() ? email : "—";
  const shortUserId = userId?.trim() ? shortId(userId) : "—";

  const version = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "—";
  const build = Constants.nativeBuildVersion ?? "—";

  async function signOut() {
    if (!supabase) return;
    setSignOutLoading(true);
    setSignOutErrorText(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // App-level session gating will return the user to the Auth screen.
    } catch (err) {
      setSignOutErrorText(err instanceof Error ? err.message : "—");
      // TODO: Add locked copy for sign-out failures to docs/LOCKED_COPY.md.
    } finally {
      setSignOutLoading(false);
    }
  }

  const canViewSources = Boolean(selectedSnapshot?.id);

  return (
    <View style={styles.root}>
      <GravityCard>
        <View style={styles.header}>
          <GravityDot size={10} />
          <Text style={styles.title}>Account</Text>
        </View>
        <Text style={styles.meta}>Profile and app information (read-only)</Text>
      </GravityCard>

      <GravityCard>
        <Text style={styles.sectionTitle}>Profile</Text>

        <View style={styles.row}>
          <Text style={styles.rowKey}>Email</Text>
          <Text style={styles.rowValue}>{emailText}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowKey}>User ID</Text>
          <Text style={styles.rowValue}>{shortUserId}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowKey}>Status</Text>
          <View style={styles.statusRight}>
            <View style={[styles.statusDot, isSignedIn && styles.statusDotActive]} />
            <Text style={styles.rowValue}>{isSignedIn ? "Signed in" : "—"}</Text>
          </View>
        </View>
      </GravityCard>

      <GravityCard>
        <Text style={styles.sectionTitle}>Security</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          disabled={signOutLoading}
          onPress={() => void signOut()}
          style={({ pressed }) => [
            styles.actionButton,
            signOutLoading && styles.actionButtonDisabled,
            pressed && styles.actionButtonPressed,
          ]}
        >
          <Text style={styles.actionButtonText}>{signOutLoading ? "Signing out…" : "Sign out"}</Text>
        </Pressable>
        {signOutErrorText ? <Text style={styles.meta}>{signOutErrorText}</Text> : null}
      </GravityCard>

      <GravityCard>
        <Text style={styles.sectionTitle}>App Info</Text>

        <View style={styles.row}>
          <Text style={styles.rowKey}>App</Text>
          <Text style={styles.rowValue}>Leora Investor OS</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowKey}>Version</Text>
          <Text style={styles.rowValue}>{version}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowKey}>Build</Text>
          <Text style={styles.rowValue}>{build}</Text>
        </View>
      </GravityCard>

      <GravityCard>
        <Text style={styles.sectionTitle}>Privacy &amp; Access</Text>
        <Text style={styles.calloutText}>Read-only investor view.</Text>
        <Text style={styles.calloutText}>Data is owner-scoped (RLS).</Text>
        <Text style={styles.calloutText}>No financial calculations are performed in-app.</Text>
      </GravityCard>

      <GravityCard>
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.actionsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Report an issue"
            onPress={async () => {
              try {
                await Linking.openURL(
                  "https://github.com/leoxpenguin-beep/leora-investor-os/issues/new"
                );
              } catch {
                // TODO: Add locked copy for open-url failures to docs/LOCKED_COPY.md.
              }
            }}
            style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
          >
            <Text style={styles.actionButtonText}>Report an issue</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View Sources"
            disabled={!canViewSources}
            onPress={() => {
              if (!canViewSources) return;
              onOpenDocumentsSources();
            }}
            style={({ pressed }) => [
              styles.actionButton,
              !canViewSources && styles.actionButtonDisabled,
              pressed && styles.actionButtonPressed,
            ]}
          >
            <Text style={styles.actionButtonText}>View Sources</Text>
          </Pressable>
        </View>

        <Text style={styles.meta}>
          Active snapshot: {selectedSnapshot ? selectedSnapshot.snapshot_month : "—"}
        </Text>
      </GravityCard>
    </View>
  );
}

function shortId(fullId: string): string {
  const s = fullId.trim();
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
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
  meta: {
    color: theme.colors.subtle,
    fontSize: 12,
    marginTop: theme.spacing.xs,
    lineHeight: 16,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: theme.spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowKey: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  rowValue: {
    flexShrink: 1,
    color: theme.colors.subtle,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
  },
  statusRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.border,
  },
  statusDotActive: {
    backgroundColor: theme.colors.accentSoft,
  },
  actionButton: {
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.panel,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonPressed: {
    opacity: 0.9,
  },
  actionButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  calloutText: {
    color: theme.colors.subtle,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    flexWrap: "wrap",
  },
});

