import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { GravityCard } from "../components/GravityCard";
import { DataSourcePill } from "../components/DataSourcePill";
import { GravityDot } from "../components/GravityDot";
import { useDemoMode } from "../demo/demoMode";
import { getSupabaseEnvStatus } from "../lib/supabaseClient";
import {
  isForbiddenOperationalKpiMetricKey,
  logRemoteSmokeEvent,
  MetricValueRow,
  rpcListMetricValues,
  SnapshotRow,
} from "../lib/rpc";
import { theme } from "../theme/theme";

export function CockpitScreen({
  snapshot,
}: {
  snapshot: SnapshotRow | null;
}) {
  const env = getSupabaseEnvStatus();
  const { demoModeEnabled } = useDemoMode();
  const isEnabled = demoModeEnabled || (env.hasUrl && env.hasAnonKey);
  const [metrics, setMetrics] = React.useState<MetricValueRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [errorText, setErrorText] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    async function run(snapshotId: string) {
      setLoading(true);
      setErrorText(null);
      try {
        const data = await rpcListMetricValues(snapshotId);
        if (!alive) return;
        const safeMetrics = data.filter((m) => !isForbiddenOperationalKpiMetricKey(m.metric_key));
        setMetrics(safeMetrics);
        logRemoteSmokeEvent({
          screen: "CockpitScreen",
          snapshotId,
          rpc: "rpc_list_metric_values",
          status: safeMetrics.length > 0 ? "success" : "empty",
        });
      } catch (err) {
        if (!alive) return;
        setMetrics([]);
        setErrorText("Unable to load data.");
        logRemoteSmokeEvent({
          screen: "CockpitScreen",
          snapshotId,
          rpc: "rpc_list_metric_values",
          status: "error",
        });
        // TODO: Add locked copy for error states to docs/LOCKED_COPY.md.
      } finally {
        if (alive) setLoading(false);
      }
    }

    if (!snapshot?.id) {
      setMetrics([]);
      setErrorText(null);
      return () => {
        alive = false;
      };
    }

    // Allow demo mode to run even without Supabase env.
    if (isEnabled) {
      void run(snapshot.id);
    } else {
      setMetrics([]);
    }

    return () => {
      alive = false;
    };
  }, [env.hasUrl, env.hasAnonKey, isEnabled, snapshot?.id]);

  return (
    <View style={styles.root}>
      <GravityCard>
        <View style={styles.header}>
          <GravityDot size={10} />
          <Text style={styles.title}>Cockpit</Text>
        </View>
        <DataSourcePill demoModeEnabled={demoModeEnabled} />
        <Text style={styles.subtitle}>Snapshot metrics (display-only)</Text>
        {!snapshot ? (
          <Text style={styles.meta}>—</Text>
        ) : (
          <Text style={styles.meta}>
            {snapshot.snapshot_month} · {snapshot.snapshot_kind}
          </Text>
        )}
        {demoModeEnabled ? (
          <Text style={styles.meta}>Demo Mode: local seed metrics.</Text>
        ) : !env.hasUrl || !env.hasAnonKey ? (
          <Text style={styles.meta}>
            Missing env: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
          </Text>
        ) : loading ? (
          <Text style={styles.meta}>Loading…</Text>
        ) : errorText ? (
          <Text style={styles.meta}>{errorText}</Text>
        ) : metrics.length === 0 ? (
          <Text style={styles.meta}>No data for this snapshot.</Text>
        ) : null}
      </GravityCard>

      <FlatList
        data={metrics}
        keyExtractor={(item) => `${item.snapshot_id}:${item.metric_key}`}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <MetricValueCard metricKey={item.metric_key} valueText={item.value_text} />
        )}
      />
    </View>
  );
}

function MetricValueCard({
  metricKey,
  valueText,
}: {
  metricKey: string;
  valueText: string;
}) {
  return (
    <GravityCard style={styles.metricCard}>
      <Text style={styles.metricLabel}>{metricKey}</Text>
      <Text style={styles.metricValue}>{valueText || "—"}</Text>
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
  meta: {
    color: theme.colors.subtle,
    fontSize: 12,
    marginTop: theme.spacing.xs,
  },
  grid: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
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
