import {
  isForbiddenOperationalKpiMetricKey,
  rpcGetInvestorPosition,
  rpcListMetricValues,
  rpcListSnapshotSources,
  SnapshotRow,
} from "./rpc";

// Module 17 — Ask Leo (Snapshot-Scoped Intelligence v1)
//
// Guardrails:
// - Read-only Supabase: RPC-only reads
// - Context is strings-only (display-only snapshot fields)
// - No derived metrics or calculations

export type SnapshotContext = {
  snapshot_id: string;
  snapshot_month: string;
  snapshot_kind: string;
  project_key: string;
  created_at: string;
  label: string;
  investor_position: {
    summary_text: string;
    narrative_text: string;
  };
  metric_values: Array<{
    metric_key: string;
    value_text: string;
    source_page: string;
    created_at: string;
  }>;
  snapshot_sources: Array<{
    source_type: string;
    title: string;
    url: string;
    note: string;
  }>;
};

function nonEmptyOrDash(v: string | null | undefined): string {
  return v && v.trim().length > 0 ? v : "—";
}

export async function buildSnapshotContext(
  snapshotId: string,
  snapshotMeta?: SnapshotRow | null
): Promise<SnapshotContext> {
  const [metricsRes, positionRes, sourcesRes] = await Promise.allSettled([
    rpcListMetricValues(snapshotId),
    rpcGetInvestorPosition(snapshotId),
    rpcListSnapshotSources(snapshotId),
  ]);

  const metrics =
    metricsRes.status === "fulfilled"
      ? metricsRes.value.filter((m) => !isForbiddenOperationalKpiMetricKey(m.metric_key))
      : [];
  const position = positionRes.status === "fulfilled" ? positionRes.value : null;
  const sources = sourcesRes.status === "fulfilled" ? sourcesRes.value : [];

  return {
    snapshot_id: nonEmptyOrDash(snapshotId),
    snapshot_month: nonEmptyOrDash(snapshotMeta?.snapshot_month ?? null),
    snapshot_kind: nonEmptyOrDash(snapshotMeta?.snapshot_kind ?? null),
    project_key: nonEmptyOrDash(snapshotMeta?.project_key ?? null),
    created_at: nonEmptyOrDash(snapshotMeta?.created_at ?? null),
    label: nonEmptyOrDash(snapshotMeta?.label ?? null),
    investor_position: {
      summary_text: nonEmptyOrDash(position?.summary_text ?? null),
      narrative_text: nonEmptyOrDash(position?.narrative_text ?? null),
    },
    metric_values: metrics.map((m) => ({
      metric_key: nonEmptyOrDash(m.metric_key),
      value_text: nonEmptyOrDash(m.value_text),
      source_page: nonEmptyOrDash(m.source_page),
      created_at: nonEmptyOrDash(m.created_at),
    })),
    snapshot_sources: sources.map((s) => ({
      source_type: nonEmptyOrDash(s.source_type),
      title: nonEmptyOrDash(s.title),
      url: nonEmptyOrDash(s.url),
      note: nonEmptyOrDash(s.note),
    })),
  };
}

