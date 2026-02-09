import * as Clipboard from "expo-clipboard";
import React from "react";
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";

import { GravityCard } from "../components/GravityCard";
import { GravityDot } from "../components/GravityDot";
import { useDemoMode } from "../demo/demoMode";
import {
  InvestorPositionRow,
  isForbiddenOperationalKpiMetricKey,
  MetricValueRow,
  rpcGetInvestorPosition,
  rpcListMetricValues,
  rpcListSnapshotSources,
  SnapshotRow,
  SnapshotSourceRow,
} from "../lib/rpc";
import { getSupabaseEnvStatus } from "../lib/supabaseClient";
import { theme } from "../theme/theme";

export function ExportSharePackScreen({
  snapshot,
  onBack,
}: {
  snapshot: SnapshotRow | null;
  onBack?: () => void;
}) {
  const env = getSupabaseEnvStatus();
  const { demoModeEnabled } = useDemoMode();
  const isEnabled = demoModeEnabled || (env.hasUrl && env.hasAnonKey);

  const [position, setPosition] = React.useState<InvestorPositionRow | null>(null);
  const [metrics, setMetrics] = React.useState<MetricValueRow[]>([]);
  const [sources, setSources] = React.useState<SnapshotSourceRow[]>([]);

  const [positionLoading, setPositionLoading] = React.useState(false);
  const [metricsLoading, setMetricsLoading] = React.useState(false);
  const [sourcesLoading, setSourcesLoading] = React.useState(false);

  const [positionErrorText, setPositionErrorText] = React.useState<string | null>(null);
  const [metricsErrorText, setMetricsErrorText] = React.useState<string | null>(null);
  const [sourcesErrorText, setSourcesErrorText] = React.useState<string | null>(null);

  const [actionMeta, setActionMeta] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;

    async function run(snapshotId: string) {
      setPositionLoading(true);
      setMetricsLoading(true);
      setSourcesLoading(true);

      setPositionErrorText(null);
      setMetricsErrorText(null);
      setSourcesErrorText(null);

      const [posRes, metricsRes, sourcesRes] = await Promise.allSettled([
        rpcGetInvestorPosition(snapshotId),
        rpcListMetricValues(snapshotId),
        rpcListSnapshotSources(snapshotId),
      ]);

      if (!alive) return;

      if (posRes.status === "fulfilled") {
        setPosition(posRes.value);
      } else {
        setPosition(null);
        setPositionErrorText("—");
        // TODO: Add locked copy for export pack position error states to docs/LOCKED_COPY.md.
      }

      if (metricsRes.status === "fulfilled") {
        setMetrics(metricsRes.value.filter((m) => !isForbiddenOperationalKpiMetricKey(m.metric_key)));
      } else {
        setMetrics([]);
        setMetricsErrorText("—");
        // TODO: Add locked copy for export pack metrics error states to docs/LOCKED_COPY.md.
      }

      if (sourcesRes.status === "fulfilled") {
        setSources(sourcesRes.value);
      } else {
        setSources([]);
        setSourcesErrorText("—");
        // TODO: Add locked copy for export pack sources error states to docs/LOCKED_COPY.md.
      }

      setPositionLoading(false);
      setMetricsLoading(false);
      setSourcesLoading(false);
    }

    if (!snapshot?.id) {
      setPosition(null);
      setMetrics([]);
      setSources([]);
      setPositionLoading(false);
      setMetricsLoading(false);
      setSourcesLoading(false);
      setPositionErrorText(null);
      setMetricsErrorText(null);
      setSourcesErrorText(null);
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
      setSources([]);
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

  const sortedMetrics = React.useMemo(() => {
    return [...metrics].sort((a, b) => a.metric_key.localeCompare(b.metric_key));
  }, [metrics]);

  const sortedSources = React.useMemo(() => {
    return [...sources].sort((a, b) => {
      const aType = (a.source_type ?? "").toLowerCase();
      const bType = (b.source_type ?? "").toLowerCase();
      if (aType !== bType) return aType.localeCompare(bType);
      const aTitle = (a.title ?? "").toLowerCase();
      const bTitle = (b.title ?? "").toLowerCase();
      if (aTitle !== bTitle) return aTitle.localeCompare(bTitle);
      return (a.url ?? "").localeCompare(b.url ?? "");
    });
  }, [sources]);

  const packText = React.useMemo(() => {
    return buildInvestorPackText({
      month,
      kind,
      projectKey,
      summaryText,
      narrativeText,
      metrics: sortedMetrics,
      sources: sortedSources,
    });
  }, [kind, month, narrativeText, projectKey, sortedMetrics, sortedSources, summaryText]);

  const canAct = Boolean(snapshot?.id && (demoModeEnabled || (env.hasUrl && env.hasAnonKey)));

  async function handleCopyPack() {
    if (!canAct) return;
    setActionMeta(null);
    try {
      await Clipboard.setStringAsync(packText);
      // TODO: Use locked copy for this success message in docs/LOCKED_COPY.md.
      setActionMeta("Copied.");
    } catch {
      setActionMeta("—");
      // TODO: Add locked copy for clipboard failure to docs/LOCKED_COPY.md.
    }
  }

  async function handleSharePack() {
    if (!canAct) return;
    setActionMeta(null);
    try {
      await Share.share({ message: packText });
    } catch {
      setActionMeta("—");
      // TODO: Add locked copy for share failures to docs/LOCKED_COPY.md.
    }
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      alwaysBounceVertical={false}
    >
      <GravityCard>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <GravityDot size={10} />
            {/* TODO: Use locked copy for this screen title in docs/LOCKED_COPY.md. */}
            <Text style={styles.title}>Export / Share Pack</Text>
          </View>
          {onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={onBack}
              style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
            >
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.meta}>
          {month} · {kind} · {projectKey}
        </Text>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Copy Pack"
            disabled={!canAct}
            onPress={() => void handleCopyPack()}
            style={({ pressed }) => [
              styles.actionButton,
              !canAct && styles.actionButtonDisabled,
              pressed && styles.actionButtonPressed,
            ]}
          >
            {/* TODO: Use locked copy for this label in docs/LOCKED_COPY.md. */}
            <Text style={styles.actionButtonText}>Copy Pack</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share"
            disabled={!canAct}
            onPress={() => void handleSharePack()}
            style={({ pressed }) => [
              styles.actionButton,
              !canAct && styles.actionButtonDisabled,
              pressed && styles.actionButtonPressed,
            ]}
          >
            {/* TODO: Use locked copy for this label in docs/LOCKED_COPY.md. */}
            <Text style={styles.actionButtonText}>Share</Text>
          </Pressable>
        </View>

        {!snapshot ? (
          <Text style={styles.meta}>—</Text>
        ) : demoModeEnabled ? (
          <Text style={styles.meta}>Demo Mode: local seed investor pack.</Text>
        ) : !env.hasUrl || !env.hasAnonKey ? (
          <Text style={styles.meta}>
            Missing env: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
          </Text>
        ) : actionMeta ? (
          <Text style={styles.meta}>{actionMeta}</Text>
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
        ) : sortedMetrics.length === 0 ? (
          <Text style={styles.sectionMeta}>—</Text>
        ) : (
          <View style={styles.metricList}>
            {sortedMetrics.map((m) => (
              <View key={`${m.snapshot_id}:${m.metric_key}`} style={styles.metricRow}>
                <Text style={styles.metricKey}>{m.metric_key}</Text>
                <Text style={styles.metricValue}>{m.value_text || "—"}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionMeta}>metric_values.value_text (display-only)</Text>
      </GravityCard>

      <GravityCard>
        <Text style={styles.sectionTitle}>Documents &amp; Sources</Text>

        {!snapshot ? (
          <Text style={styles.sectionBody}>—</Text>
        ) : sourcesLoading ? (
          <Text style={styles.sectionMeta}>Loading…</Text>
        ) : sourcesErrorText ? (
          <Text style={styles.sectionMeta}>{sourcesErrorText}</Text>
        ) : sortedSources.length === 0 ? (
          <Text style={styles.sectionMeta}>—</Text>
        ) : (
          <View style={styles.sourceList}>
            {sortedSources.map((s, idx) => (
              <SourceRow
                key={`${idx}:${s.source_type}:${s.title}:${s.url ?? ""}`}
                source={s}
              />
            ))}
          </View>
        )}
      </GravityCard>

      <GravityCard>
        {/* TODO: Use locked copy for this section title in docs/LOCKED_COPY.md. */}
        <Text style={styles.sectionTitle}>Pack (plain text)</Text>
        <Text style={styles.packText} selectable>
          {packText}
        </Text>
      </GravityCard>
    </ScrollView>
  );
}

function SourceRow({ source }: { source: SnapshotSourceRow }) {
  const title = source.title?.trim() ? source.title : "—";
  const sourceType = source.source_type?.trim() ? source.source_type : "—";
  const noteText = source.note?.trim() ? source.note : null;
  const urlText = source.url?.trim() ? source.url : "—";

  return (
    <View style={styles.sourceRow}>
      <View style={styles.sourceTop}>
        <Text style={styles.sourceTitle}>{title}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{sourceType}</Text>
        </View>
      </View>
      <Text style={styles.sourceUrl}>{urlText}</Text>
      {noteText ? <Text style={styles.sourceNote}>{noteText}</Text> : null}
    </View>
  );
}

function buildInvestorPackText(input: {
  month: string;
  kind: string;
  projectKey: string;
  summaryText: string;
  narrativeText: string;
  metrics: MetricValueRow[];
  sources: SnapshotSourceRow[];
}): string {
  const lines: string[] = [];

  lines.push("LEORA — Investor Pack");
  lines.push(`${input.month} · ${input.kind} · ${input.projectKey}`);
  lines.push("");

  lines.push("My Position");
  lines.push(`- summary_text: ${input.summaryText || "—"}`);
  lines.push(`- narrative_text: ${input.narrativeText || "—"}`);
  lines.push("");

  lines.push("Value");
  if (input.metrics.length === 0) {
    lines.push("- —");
  } else {
    for (const m of input.metrics) {
      lines.push(`- ${m.metric_key}: ${m.value_text || "—"}`);
    }
  }
  lines.push("");

  lines.push("Documents & Sources");
  if (input.sources.length === 0) {
    lines.push("- —");
  } else {
    for (const s of input.sources) {
      const sourceType = s.source_type?.trim() ? s.source_type : "—";
      const title = s.title?.trim() ? s.title : "—";
      const url = s.url?.trim() ? s.url : "—";
      lines.push(`- [${sourceType}] ${title} — ${url}`);
      if (s.note?.trim()) {
        lines.push(`  - note: ${s.note}`);
      }
    }
  }

  return lines.join("\n");
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
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
    fontWeight: "700",
  },
  meta: {
    color: theme.colors.subtle,
    fontSize: 12,
    marginTop: theme.spacing.xs,
    lineHeight: 16,
  },
  backButton: {
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.panel,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  backButtonPressed: {
    opacity: 0.9,
  },
  backText: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  actions: {
    marginTop: theme.spacing.sm,
    flexDirection: "row",
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
    color: theme.colors.subtle,
    fontSize: 12,
    lineHeight: 16,
  },
  subLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
    textTransform: "uppercase",
    marginBottom: theme.spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
  },

  metricList: {
    gap: theme.spacing.xs,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing.md,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  metricKey: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  metricValue: {
    color: theme.colors.subtle,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
  },

  sourceList: {
    gap: theme.spacing.sm,
  },
  sourceRow: {
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.panel,
    padding: theme.spacing.sm,
  },
  sourceTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  sourceTitle: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  badge: {
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.accentSoft,
    backgroundColor: theme.colors.panelElevated,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  badgeText: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  sourceUrl: {
    color: theme.colors.subtle,
    fontSize: 12,
    lineHeight: 16,
    marginTop: theme.spacing.xs,
  },
  sourceNote: {
    color: theme.colors.subtle,
    fontSize: 12,
    lineHeight: 16,
    marginTop: theme.spacing.xs,
  },

  packText: {
    color: theme.colors.subtle,
    fontSize: 12,
    lineHeight: 16,
  },
});

