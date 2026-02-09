import React from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { GravityCard } from "../components/GravityCard";
import { GravityDot } from "../components/GravityDot";
import {
  isForbiddenOperationalKpiMetricKey,
  MetricValueRow,
  rpcListMetricValues,
  rpcListSnapshots,
  SnapshotRow,
} from "../lib/rpc";
import { getSupabaseEnvStatus } from "../lib/supabaseClient";
import { theme } from "../theme/theme";

type MetricsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; data: MetricValueRow[] }
  | { status: "error"; errorText: string };

export function ValueMultiSnapshotsScreen({
  selectedSnapshot,
  onSelectSnapshot,
}: {
  selectedSnapshot: SnapshotRow | null;
  onSelectSnapshot: (snapshot: SnapshotRow) => void;
}) {
  const env = getSupabaseEnvStatus();

  const [snapshots, setSnapshots] = React.useState<SnapshotRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [errorText, setErrorText] = React.useState<string | null>(null);

  const [expandedIds, setExpandedIds] = React.useState<Record<string, boolean>>({});
  const [metricsBySnapshotId, setMetricsBySnapshotId] = React.useState<
    Record<string, MetricsState>
  >({});

  React.useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setErrorText(null);
      try {
        const data = await rpcListSnapshots({ p_limit: 50 });
        if (!alive) return;
        setSnapshots(data);
      } catch (err) {
        if (!alive) return;
        setSnapshots([]);
        setErrorText("—");
        // TODO: Add locked copy for error states to docs/LOCKED_COPY.md.
      } finally {
        if (alive) setLoading(false);
      }
    }

    if (env.hasUrl && env.hasAnonKey) {
      void run();
    } else {
      setSnapshots([]);
    }

    return () => {
      alive = false;
    };
  }, [env.hasUrl, env.hasAnonKey]);

  async function ensureMetricsLoaded(snapshotId: string) {
    const existing = metricsBySnapshotId[snapshotId];
    if (existing?.status === "loading" || existing?.status === "loaded") return;

    setMetricsBySnapshotId((prev) => ({ ...prev, [snapshotId]: { status: "loading" } }));
    try {
      const data = await rpcListMetricValues(snapshotId);
      const safe = data.filter((m) => !isForbiddenOperationalKpiMetricKey(m.metric_key));
      setMetricsBySnapshotId((prev) => ({ ...prev, [snapshotId]: { status: "loaded", data: safe } }));
    } catch (err) {
      setMetricsBySnapshotId((prev) => ({
        ...prev,
        [snapshotId]: { status: "error", errorText: "—" },
      }));
      // TODO: Add locked copy for metric load error states to docs/LOCKED_COPY.md.
    }
  }

  const activeMeta = selectedSnapshot
    ? `${selectedSnapshot.snapshot_month} · ${selectedSnapshot.snapshot_kind}${
        selectedSnapshot.snapshot_kind === "project"
          ? ` · ${selectedSnapshot.project_key ?? "—"}`
          : ""
      }`
    : "—";

  return (
    <View style={styles.root}>
      <GravityCard>
        <View style={styles.header}>
          <GravityDot size={10} />
          <Text style={styles.title}>Value (Multiple Snapshots)</Text>
        </View>
        <Text style={styles.subtitle}>
          Compare snapshots using display-only stored fields. No calculations.
        </Text>
        <Text style={styles.meta}>Active snapshot: {activeMeta}</Text>

        {!env.hasUrl || !env.hasAnonKey ? (
          <Text style={styles.meta}>
            Missing env: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
          </Text>
        ) : loading ? (
          <Text style={styles.meta}>Loading…</Text>
        ) : errorText ? (
          <Text style={styles.meta}>{errorText}</Text>
        ) : snapshots.length === 0 ? (
          <Text style={styles.meta}>—</Text>
        ) : (
          <Text style={styles.meta}>Tap a snapshot to set it active. Expand to view metrics.</Text>
        )}
      </GravityCard>

      <FlatList
        data={snapshots}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isActive = item.id === selectedSnapshot?.id;
          const isExpanded = Boolean(expandedIds[item.id]);
          const metricsState = metricsBySnapshotId[item.id] ?? { status: "idle" as const };

          return (
            <SnapshotRowCard
              snapshot={item}
              active={isActive}
              expanded={isExpanded}
              metricsState={metricsState}
              onSetActive={() => onSelectSnapshot(item)}
              onToggleExpand={() => {
                const next = !isExpanded;
                setExpandedIds((prev) => ({ ...prev, [item.id]: next }));
                if (next) void ensureMetricsLoaded(item.id);
              }}
            />
          );
        }}
      />
    </View>
  );
}

function SnapshotRowCard({
  snapshot,
  active,
  expanded,
  metricsState,
  onSetActive,
  onToggleExpand,
}: {
  snapshot: SnapshotRow;
  active: boolean;
  expanded: boolean;
  metricsState: MetricsState;
  onSetActive: () => void;
  onToggleExpand: () => void;
}) {
  return (
    <GravityCard style={[styles.rowCard, active && styles.rowCardActive]}>
      <View style={styles.rowTop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Set active snapshot"
          onPress={onSetActive}
          style={({ pressed }) => [styles.rowMain, pressed && styles.rowPressed]}
        >
          <Text style={styles.rowMonth}>{snapshot.snapshot_month}</Text>
          <Text style={styles.rowKind}>{snapshot.snapshot_kind}</Text>
          {snapshot.snapshot_kind === "project" ? (
            <Text style={styles.rowProjectKey}>{snapshot.project_key ?? "—"}</Text>
          ) : null}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? "Collapse metrics" : "Expand metrics"}
          onPress={onToggleExpand}
          style={({ pressed }) => [styles.expandBtn, pressed && styles.expandBtnPressed]}
        >
          <Text style={styles.expandGlyph}>{expanded ? "▾" : "▸"}</Text>
        </Pressable>
      </View>

      <Text style={styles.rowMeta}>{snapshot.label ?? "—"}</Text>

      {expanded ? (
        <View style={styles.metricsWrap}>
          {metricsState.status === "loading" ? (
            <Text style={styles.metricsMeta}>Loading…</Text>
          ) : metricsState.status === "error" ? (
            <Text style={styles.metricsMeta}>{metricsState.errorText}</Text>
          ) : metricsState.status === "loaded" ? (
            metricsState.data.length === 0 ? (
              <Text style={styles.metricsMeta}>—</Text>
            ) : (
              <View style={styles.metricsList}>
                {metricsState.data.map((m) => (
                  <View key={`${m.snapshot_id}:${m.metric_key}`} style={styles.metricRow}>
                    <Text style={styles.metricKey}>{m.metric_key}</Text>
                    <Text style={styles.metricValue}>{m.value_text || "—"}</Text>
                  </View>
                ))}
              </View>
            )
          ) : (
            <Text style={styles.metricsMeta}>—</Text>
          )}
          <Text style={styles.metricsHint}>value_text (display-only)</Text>
        </View>
      ) : null}
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
    lineHeight: 16,
  },

  list: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
  },

  rowCard: {
    paddingVertical: theme.spacing.sm,
  },
  rowCardActive: {
    borderColor: theme.colors.accentSoft,
    backgroundColor: theme.colors.panelElevated,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  rowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: 2,
  },
  rowPressed: {
    opacity: 0.9,
  },
  rowMonth: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  rowKind: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  rowProjectKey: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  rowMeta: {
    color: theme.colors.subtle,
    fontSize: 12,
    marginTop: theme.spacing.xs,
  },

  expandBtn: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  expandBtnPressed: {
    opacity: 0.9,
  },
  expandGlyph: {
    color: theme.colors.muted,
    fontSize: 16,
    fontWeight: "900",
    marginTop: -1,
  },

  metricsWrap: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  metricsMeta: {
    color: theme.colors.subtle,
    fontSize: 12,
  },
  metricsList: {
    gap: theme.spacing.xs,
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  metricKey: {
    flex: 1,
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  metricValue: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  metricsHint: {
    color: theme.colors.subtle,
    fontSize: 12,
    marginTop: theme.spacing.xs,
  },
});

