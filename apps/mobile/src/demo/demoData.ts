import type {
  MetricValueRow,
  SnapshotRow,
  SnapshotSourceRow,
  SnapshotKind,
} from "../lib/rpc";

// Module 14 — Demo Mode seed data (DEV-only)
// Guardrails:
// - Display-only strings only (no calculations)
// - Generic placeholders; use "—" when unknown
// - Never write to Supabase; this is local-only

export const DEMO_INVESTOR_ID = "11111111-1111-4111-8111-111111111111";

const NOW = "2026-02-09T00:00:00.000Z";

export const demoSnapshots = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    investor_id: DEMO_INVESTOR_ID,
    snapshot_kind: "monthly" as SnapshotKind,
    snapshot_month: "2026-01-01",
    project_key: null,
    created_at: "2026-01-10T12:00:00.000Z",
    label: "Demo seed snapshot (display-only).",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    investor_id: DEMO_INVESTOR_ID,
    snapshot_kind: "monthly" as SnapshotKind,
    snapshot_month: "2026-02-01",
    project_key: null,
    created_at: "2026-02-10T12:00:00.000Z",
    label: "Demo seed snapshot (display-only).",
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    investor_id: DEMO_INVESTOR_ID,
    snapshot_kind: "project" as SnapshotKind,
    snapshot_month: "2026-02-01",
    project_key: "DEMO-PROJECT",
    created_at: "2026-02-12T12:00:00.000Z",
    label: "Demo project snapshot (display-only).",
  },
] satisfies SnapshotRow[];

export const demoMetricValuesBySnapshotId: Record<
  string,
  Array<Pick<MetricValueRow, "metric_key" | "value_text">>
> = {
  [demoSnapshots[0].id]: [
    { metric_key: "value.enterprise_value", value_text: "—" },
    { metric_key: "value.post_money", value_text: "—" },
    { metric_key: "cap_table.ownership_percent", value_text: "—" },
    { metric_key: "company.stage", value_text: "—" },
  ],
  [demoSnapshots[1].id]: [
    { metric_key: "value.enterprise_value", value_text: "—" },
    { metric_key: "value.post_money", value_text: "—" },
    { metric_key: "revenue.mrr", value_text: "—" },
    { metric_key: "company.stage", value_text: "—" },
  ],
  [demoSnapshots[2].id]: [
    { metric_key: "project.status", value_text: "—" },
    { metric_key: "project.milestone", value_text: "—" },
  ],
};

export const demoInvestorPositionBySnapshotId: Record<
  string,
  {
    summary_text: string;
    narrative_text: string;
  }
> = {
  [demoSnapshots[0].id]: {
    summary_text: "Demo seed position summary (display-only).",
    narrative_text: "Demo seed narrative text (display-only).",
  },
  [demoSnapshots[1].id]: {
    summary_text: "Demo seed position summary (display-only).",
    narrative_text: "Demo seed narrative text (display-only).",
  },
  [demoSnapshots[2].id]: {
    summary_text: "Demo seed position summary (display-only).",
    narrative_text: "Demo seed narrative text (display-only).",
  },
};

export const demoSourcesBySnapshotId: Record<string, SnapshotSourceRow[]> = {
  [demoSnapshots[0].id]: [
    {
      source_type: "Notion (demo)",
      title: "Source document (demo)",
      url: null,
      note: "—",
    },
  ],
  [demoSnapshots[1].id]: [
    {
      source_type: "Notion (demo)",
      title: "Source document (demo)",
      url: null,
      note: "—",
    },
  ],
  [demoSnapshots[2].id]: [
    {
      source_type: "Notion (demo)",
      title: "Source document (demo)",
      url: null,
      note: "—",
    },
  ],
};

export const demoSnapshotIdSet = new Set(demoSnapshots.map((s) => s.id));

export function getMostRecentDemoSnapshot(): SnapshotRow {
  // Display-only ordering: prefer snapshot_month, then created_at.
  const sorted = [...demoSnapshots].sort((a, b) => {
    const byMonth = (b.snapshot_month ?? "").localeCompare(a.snapshot_month ?? "");
    if (byMonth !== 0) return byMonth;
    return (b.created_at ?? "").localeCompare(a.created_at ?? "");
  });
  return sorted[0] ?? demoSnapshots[0];
}

export function buildDemoMetricValueRows(snapshotId: string): MetricValueRow[] {
  const rows = demoMetricValuesBySnapshotId[snapshotId] ?? [];
  return rows.map((r) => ({
    snapshot_id: snapshotId,
    metric_key: r.metric_key,
    value_text: r.value_text,
    source_page: "—",
    created_at: NOW,
  }));
}

export function buildDemoInvestorPositionRow(snapshotId: string) {
  const p = demoInvestorPositionBySnapshotId[snapshotId];
  if (!p) return null;
  return {
    investor_id: DEMO_INVESTOR_ID,
    snapshot_id: snapshotId,
    summary_text: p.summary_text,
    narrative_text: p.narrative_text,
    created_at: NOW,
    updated_at: NOW,
  };
}

