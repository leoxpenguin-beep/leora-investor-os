import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { GravityCard } from "../components/GravityCard";
import { GravityDot } from "../components/GravityDot";
import { getSupabaseEnvStatus } from "../lib/supabaseClient";
import { InvestorPositionRow, rpcGetInvestorPosition, SnapshotRow } from "../lib/rpc";
import { theme } from "../theme/theme";

export function MyPositionScreen({
  snapshot,
}: {
  snapshot: SnapshotRow | null;
}) {
  const env = getSupabaseEnvStatus();
  const [position, setPosition] = React.useState<InvestorPositionRow | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [errorText, setErrorText] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;

    async function run(snapshotId: string) {
      setLoading(true);
      setErrorText(null);
      try {
        const row = await rpcGetInvestorPosition(snapshotId);
        if (!alive) return;
        setPosition(row);
      } catch (err) {
        if (!alive) return;
        setPosition(null);
        setErrorText("—");
        // TODO: Add locked copy for error states to docs/LOCKED_COPY.md.
      } finally {
        if (alive) setLoading(false);
      }
    }

    if (!snapshot?.id) {
      setPosition(null);
      setErrorText(null);
      return () => {
        alive = false;
      };
    }

    if (env.hasUrl && env.hasAnonKey) {
      void run(snapshot.id);
    } else {
      setPosition(null);
    }

    return () => {
      alive = false;
    };
  }, [env.hasUrl, env.hasAnonKey, snapshot?.id]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <GravityCard>
        <View style={styles.header}>
          <GravityDot size={10} />
          <Text style={styles.title}>My Position</Text>
        </View>
        <Text style={styles.subtitle}>Investor position text (display-only)</Text>
        {!snapshot ? (
          <Text style={styles.meta}>—</Text>
        ) : (
          <Text style={styles.meta}>
            {snapshot.snapshot_month} · {snapshot.snapshot_kind}
          </Text>
        )}
        {!env.hasUrl || !env.hasAnonKey ? (
          <Text style={styles.meta}>
            Missing env: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
          </Text>
        ) : loading ? (
          <Text style={styles.meta}>Loading…</Text>
        ) : errorText ? (
          <Text style={styles.meta}>{errorText}</Text>
        ) : !position ? (
          <Text style={styles.meta}>—</Text>
        ) : null}
      </GravityCard>

      <GravityCard>
        <Text style={styles.blockLabel}>summary_text</Text>
        <Text style={styles.blockValue}>{position?.summary_text ?? "—"}</Text>
      </GravityCard>

      <GravityCard>
        <Text style={styles.blockLabel}>narrative_text</Text>
        <Text style={styles.blockValue}>{position?.narrative_text ?? "—"}</Text>
      </GravityCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
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
  meta: {
    color: theme.colors.subtle,
    fontSize: 12,
    marginTop: theme.spacing.xs,
  },
  blockLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  blockValue: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
    marginTop: theme.spacing.sm,
  },
});

