import { supabase } from "./supabaseClient";

export type SnapshotKind = "monthly" | "project";

export type SnapshotRow = {
  id: string;
  investor_id: string;
  snapshot_kind: SnapshotKind;
  snapshot_month: string; // date
  project_key: string | null;
  created_at: string;
  label: string | null;
};

export type MetricValueRow = {
  snapshot_id: string;
  metric_key: string;
  value_text: string;
  source_page: string;
  created_at: string;
};

export type InvestorPositionRow = {
  investor_id: string;
  snapshot_id: string;
  summary_text: string | null;
  narrative_text: string | null;
  created_at: string;
  updated_at: string;
};

export type ListSnapshotsParams = {
  p_snapshot_kind?: SnapshotKind | null;
  p_snapshot_month?: string | null;
  p_project_key?: string | null;
  p_limit?: number | null;
};

export async function rpcListSnapshots(
  params: ListSnapshotsParams = {}
): Promise<SnapshotRow[]> {
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("rpc_list_snapshots", {
    p_snapshot_kind: params.p_snapshot_kind ?? null,
    p_snapshot_month: params.p_snapshot_month ?? null,
    p_project_key: params.p_project_key ?? null,
    p_limit: params.p_limit ?? 50,
  });

  if (error) throw error;
  return (data ?? []) as SnapshotRow[];
}

export async function rpcListMetricValues(
  snapshotId: string
): Promise<MetricValueRow[]> {
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("rpc_list_metric_values", {
    p_snapshot_id: snapshotId,
  });

  if (error) throw error;
  return (data ?? []) as MetricValueRow[];
}

export async function rpcGetInvestorPosition(
  snapshotId: string
): Promise<InvestorPositionRow | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("rpc_get_investor_position", {
    p_snapshot_id: snapshotId,
  });

  if (error) throw error;
  const rows = (data ?? []) as InvestorPositionRow[];
  return rows[0] ?? null;
}

// Guardrail: do not display unsupported operational KPIs as tiles/lists.
export function isForbiddenOperationalKpiMetricKey(metricKey: string): boolean {
  const k = metricKey.toLowerCase();
  return (
    k.includes("error") ||
    k.includes("rework") ||
    k.includes("design_to_production") ||
    k.includes("design-to-production") ||
    k.includes("design_speed") ||
    k.includes("design-speed")
  );
}
