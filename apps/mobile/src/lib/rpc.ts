import { supabase } from "./supabaseClient";

import { demoSourcesBySnapshotId, demoSnapshots, buildDemoInvestorPositionRow, buildDemoMetricValueRows } from "../demo/demoData";
import { getDemoModeEnabled } from "../demo/demoMode";

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

export type SnapshotSourceRow = {
  source_type: string;
  title: string;
  url: string | null;
  note: string | null;
};

export type SnapshotTimelineEventRow = {
  event_key: string;
  event_date: string | null;
  title: string | null;
  detail: string | null;
  source_page: string;
  created_at: string;
};

export type ListSnapshotsParams = {
  p_snapshot_kind?: SnapshotKind | null;
  p_snapshot_month?: string | null;
  p_project_key?: string | null;
  p_limit?: number | null;
};

export type RemoteSmokeStatus = "success" | "empty" | "error";

export function logRemoteSmokeEvent(input: {
  screen: string;
  snapshotId: string | null;
  rpc: string;
  status: RemoteSmokeStatus;
}): void {
  if (!__DEV__) return;
  if (getDemoModeEnabled()) return;
  const snapshotId = input.snapshotId?.trim() || "—";
  console.log(
    `[Remote] screen=${input.screen} snapshotId=${snapshotId} rpc=${input.rpc} status=${input.status}`
  );
}

export async function rpcListSnapshots(
  params: ListSnapshotsParams = {}
): Promise<SnapshotRow[]> {
  if (getDemoModeEnabled()) {
    let out = [...demoSnapshots];
    if (params.p_snapshot_kind) {
      out = out.filter((s) => s.snapshot_kind === params.p_snapshot_kind);
    }
    if (params.p_snapshot_month) {
      out = out.filter((s) => s.snapshot_month === params.p_snapshot_month);
    }
    if (params.p_project_key) {
      out = out.filter((s) => (s.project_key ?? "") === params.p_project_key);
    }
    // Deterministic ordering for demo data (display-only).
    out.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    const limit = typeof params.p_limit === "number" ? params.p_limit : 50;
    return out.slice(0, Math.max(0, limit));
  }

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
  if (getDemoModeEnabled()) {
    return buildDemoMetricValueRows(snapshotId);
  }

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
  if (getDemoModeEnabled()) {
    return (buildDemoInvestorPositionRow(snapshotId) ?? null) as InvestorPositionRow | null;
  }

  if (!supabase) return null;

  const { data, error } = await supabase.rpc("rpc_get_investor_position", {
    p_snapshot_id: snapshotId,
  });

  if (error) throw error;
  const rows = (data ?? []) as InvestorPositionRow[];
  return rows[0] ?? null;
}

export async function rpcListSnapshotSources(
  snapshotId: string
): Promise<SnapshotSourceRow[]> {
  if (getDemoModeEnabled()) {
    return demoSourcesBySnapshotId[snapshotId] ?? [];
  }

  if (!supabase) return [];

  const { data, error } = await supabase.rpc("rpc_list_snapshot_sources", {
    p_snapshot_id: snapshotId,
  });

  if (error) throw error;
  return (data ?? []) as SnapshotSourceRow[];
}

export async function rpcListSnapshotTimelineEvents(
  snapshotId: string
): Promise<SnapshotTimelineEventRow[]> {
  if (getDemoModeEnabled()) {
    return [];
  }

  if (!supabase) return [];

  const { data, error } = await supabase.rpc("rpc_list_snapshot_timeline_events", {
    p_snapshot_id: snapshotId,
  });

  if (error) throw error;
  return (data ?? []) as SnapshotTimelineEventRow[];
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
