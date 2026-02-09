import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { GravityCard } from "../components/GravityCard";
import { GravityDot } from "../components/GravityDot";
import { useDemoMode } from "../demo/demoMode";
import { logAuditEvent } from "../lib/auditLog";
import {
  InvestorPositionRow,
  isForbiddenOperationalKpiMetricKey,
  MetricValueRow,
  rpcGetInvestorPosition,
  rpcListMetricValues,
  SnapshotRow,
} from "../lib/rpc";
import { getSupabaseEnvStatus } from "../lib/supabaseClient";
import { theme } from "../theme/theme";

type MetricGroup = {
  label: string;
  rows: MetricValueRow[];
};

export function SnapshotDetailScreen({
  snapshot,
  onOpenDocumentsSources,
  onOpenSnapshotTimeline,
  onOpenExportPack,
}: {
  snapshot: SnapshotRow | null;
  onOpenDocumentsSources: () => void;
  onOpenSnapshotTimeline: () => void;
  onOpenExportPack: () => void;
}) {
  const env = getSupabaseEnvStatus();
  const { demoModeEnabled } = useDemoMode();
  const isEnabled = demoModeEnabled || (env.hasUrl && env.hasAnonKey);

  const [position, setPosition] = React.useState<InvestorPositionRow | null>(null);
  const [metrics, setMetrics] = React.useState<MetricValueRow[]>([]);

  const [positionLoading, setPositionLoading] = React.useState(false);
  const [metricsLoading, setMetricsLoading] = React.useState(false);
  const [positionErrorText, setPositionErrorText] = React.useState<string | null>(null);
  const [metricsErrorText, setMetricsErrorText] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!snapshot?.id) return;
    logAuditEvent({ event_type: "VIEW_SNAPSHOT", snapshot });
  }, [snapshot?.id]);

  React.useEffect(() => {
    let alive = true;

    async function run(snapshotId: string) {
      setPositionLoading(true);
      setMetricsLoading(true);
      setPositionErrorText(null);
      setMetricsErrorText(null);

      const [posRes, metricsRes] = await Promise.allSettled([
        rpcGetInvestorPosition(snapshotId),
        rpcListMetricValues(snapshotId),
      ]);

      if (!alive) return;

      if (posRes.status === "fulfilled") {
        setPosition(posRes.value);
      } else {
        setPosition(null);
        setPositionErrorText("—");
        // TODO: Add locked copy for position load error states to docs/LOCKED_COPY.md.
      }

      if (metricsRes.status === "fulfilled") {
        setMetrics(metricsRes.value.filter((m) => !isForbiddenOperationalKpiMetricKey(m.metric_key)));
      } else {
        setMetrics([]);
        setMetricsErrorText("—");
        // TODO: Add locked copy for metrics load error states to docs/LOCKED_COPY.md.
      }

      setPositionLoading(false);
      setMetricsLoading(false);
    }

    if (!snapshot?.id) {
      setPosition(null);
      setMetrics([]);
      setPositionLoading(false);
      setMetricsLoading(false);
      setPositionErrorText(null);
      setMetricsErrorText(null);
      return () => {
        alive = false;
      };
    }

    // Allow demo mode to run even without Supabase env.
    if (isEnabled) {
      void run(snapshot.id);
    } else {
      setPosition(null);
      setMetrics([]);
    }

    return () => {
      alive = false;
    };
  }, [env.hasUrl, env.hasAnonKey, isEnabled, snapshot?.id]);

  const projectKey = snapshot?.project_key ?? "—";
  const month = snapshot?.snapshot_month ?? "—";
  const kind = snapshot?.snapshot_kind ?? "—";

  const summaryText =
    position?.summary_text && position.summary_text.trim().length > 0
      ? position.summary_text
      : "—";
  const narrativeText =
    position?.narrative_text && position.narrative_text.trim().length > 0
      ? position.narrative_text
      : "—";

  const valueGroups = buildMetricGroups(metrics);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      alwaysBounceVertical={false}
    >
      <GravityCard>
        <View style={styles.header}>
          <GravityDot size={10} />
          <Text style={styles.title}>Snapshot Detail</Text>
        </View>

        <Text style={styles.meta}>
          {month} · {kind} · {projectKey}
        </Text>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Documents and Sources"
            disabled={!snapshot}
            onPress={() => {
              if (!snapshot) return;
              onOpenDocumentsSources();
            }}
            style={({ pressed }) => [
              styles.actionButton,
              !snapshot && styles.actionButtonDisabled,
              pressed && styles.actionButtonPressed,
            ]}
          >
            {/* TODO: Use locked copy for this label in docs/LOCKED_COPY.md. */}
            <Text style={styles.actionButtonText}>Documents &amp; Sources</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Snapshot Timeline"
            disabled={!snapshot}
            onPress={() => {
              if (!snapshot) return;
              onOpenSnapshotTimeline();
            }}
            style={({ pressed }) => [
              styles.actionButton,
              !snapshot && styles.actionButtonDisabled,
              pressed && styles.actionButtonPressed,
            ]}
          >
            {/* TODO: Use locked copy for this label in docs/LOCKED_COPY.md. */}
            <Text style={styles.actionButtonText}>Snapshot Timeline</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Export Pack"
            disabled={!snapshot}
            onPress={() => {
              if (!snapshot) return;
              onOpenExportPack();
            }}
            style={({ pressed }) => [
              styles.actionButton,
              !snapshot && styles.actionButtonDisabled,
              pressed && styles.actionButtonPressed,
            ]}
          >
            {/* TODO: Use locked copy for this label in docs/LOCKED_COPY.md. */}
            <Text style={styles.actionButtonText}>Export Pack</Text>
          </Pressable>
        </View>

        {!snapshot ? (
          <Text style={styles.meta}>—</Text>
        ) : demoModeEnabled ? (
          <Text style={styles.meta}>Demo Mode: local seed snapshot detail.</Text>
        ) : !env.hasUrl || !env.hasAnonKey ? (
          <Text style={styles.meta}>
            Missing env: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
          </Text>
        ) : null}
      </GravityCard>

      <GravityCard>
        <Text style={styles.sectionTitle}>My Position</Text>

        {!snapshot ? (
          <Text style={styles.sectionBody}>—</Text>
        ) : positionLoading ? (
          <Text style={styles.sectionMeta}>Loading…</Text>
        ) : positionErrorText ? (
          <Text style={styles.sectionMeta}>{positionErrorText}</Text>
        ) : (
          <>
            <Text style={styles.subLabel}>summary_text</Text>
            <Text style={styles.sectionBody}>{summaryText}</Text>

            <View style={styles.divider} />

            <Text style={styles.subLabel}>narrative_text</Text>
            <Text style={styles.sectionBody}>{narrativeText}</Text>
          </>
        )}
      </GravityCard>

      <GravityCard>
        <Text style={styles.sectionTitle}>Value</Text>

        {!snapshot ? (
          <Text style={styles.sectionBody}>—</Text>
        ) : metricsLoading ? (
          <Text style={styles.sectionMeta}>Loading…</Text>
        ) : metricsErrorText ? (
          <Text style={styles.sectionMeta}>{metricsErrorText}</Text>
        ) : metrics.length === 0 ? (
          <Text style={styles.sectionMeta}>—</Text>
        ) : (
          <>
            {valueGroups.map((group) => (
              <View key={group.label} style={styles.group}>
                {group.label ? (
                  <Text style={styles.groupTitle}>{group.label}</Text>
                ) : null}
                <View style={styles.metricList}>
                  {group.rows.map((m) => (
                    <View key={`${m.snapshot_id}:${m.metric_key}`} style={styles.metricRow}>
                      <Text style={styles.metricKey}>{m.metric_key}</Text>
                      <Text style={styles.metricValue}>{m.value_text || "—"}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </>
        )}

        <Text style={styles.sectionMeta}>metric_values.value_text (display-only)</Text>
      </GravityCard>
    </ScrollView>
  );
}

function buildMetricGroups(metrics: MetricValueRow[]): MetricGroup[] {
  const sorted = [...metrics].sort((a, b) => a.metric_key.localeCompare(b.metric_key));
  const hasPrefix = sorted.some((m) => m.metric_key.includes("."));
  if (!hasPrefix) return [{ label: "", rows: sorted }];

  const groups = new Map<string, MetricValueRow[]>();
  const unprefixed: MetricValueRow[] = [];

  for (const m of sorted) {
    const idx = m.metric_key.indexOf(".");
    if (idx > 0) {
      const prefix = m.metric_key.slice(0, idx);
      const list = groups.get(prefix) ?? [];
      list.push(m);
      groups.set(prefix, list);
    } else {
      unprefixed.push(m);
    }
  }

  const out: MetricGroup[] = [];

  // Keep unprefixed keys visible without inventing categories.
  if (unprefixed.length > 0) {
    out.push({ label: "", rows: unprefixed });
  }

  for (const prefix of Array.from(groups.keys()).sort((a, b) => a.localeCompare(b))) {
    out.push({ label: `${prefix}.`, rows: groups.get(prefix) ?? [] });
  }

  return out;
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
  meta: {
    color: theme.colors.subtle,
    fontSize: 12,
    marginTop: theme.spacing.xs,
    lineHeight: 16,
  },
  actions: {
    marginTop: theme.spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  actionButton: {
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.panel,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
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

  sectionTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: theme.spacing.sm,
  },
  sectionMeta: {
    color: theme.colors.subtle,
    fontSize: 12,
    marginTop: theme.spacing.xs,
    lineHeight: 16,
  },
  sectionBody: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  subLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
    textTransform: "uppercase",
    marginBottom: theme.spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },

  group: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  groupTitle: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  metricList: {
    gap: theme.spacing.xs,
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: theme.spacing.md,
    paddingVertical: 2,
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
});

