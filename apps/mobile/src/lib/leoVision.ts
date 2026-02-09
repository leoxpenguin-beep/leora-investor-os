import { buildInvestorPackText } from "./exportPack";
import {
  InvestorPositionRow,
  isForbiddenOperationalKpiMetricKey,
  MetricValueRow,
  SnapshotRow,
  SnapshotSourceRow,
} from "./rpc";
import type { ShellRouteKey } from "../shell/routes";

// Module 16 — Leo Vision (Ask Leo Drawer)
//
// Guardrails:
// - Deterministic + template-based (NO external AI calls)
// - No derived metrics / no finance math / no deltas
// - Display-only: reuse stored snapshot strings (`value_text`, `summary_text`, `narrative_text`, etc.)
// - No Supabase writes (data loading happens elsewhere via read-only RPCs)

export type LeoVisionQuickActionKey =
  | "explain_screen"
  | "what_changed_since_last_snapshot"
  | "what_should_i_check_next"
  | "create_investor_brief";

export type LeoContextPack = {
  screenTitle: string;
  route: ShellRouteKey;
  snapshot: SnapshotRow | null;
  exportPackText: string;
  contextPackText: string;
};

function nonEmptyOrDash(v: string | null | undefined): string {
  return v && v.trim().length > 0 ? v : "—";
}

export function buildSnapshotDisplayLabel(snapshot: SnapshotRow | null): string {
  const month = nonEmptyOrDash(snapshot?.snapshot_month ?? null);
  const kind = nonEmptyOrDash(snapshot?.snapshot_kind ?? null);
  const projectKey = nonEmptyOrDash(snapshot?.project_key ?? null);
  return `${month} · ${kind} · ${projectKey}`;
}

export function buildSnapshotMetaLines(snapshot: SnapshotRow | null): string[] {
  const id = nonEmptyOrDash(snapshot?.id ?? null);
  const idShort = id !== "—" ? id.slice(-6) : "—";
  return [
    `- snapshot_id: ${id}`,
    `- snapshot_id_short: ${idShort}`,
    `- snapshot_month: ${nonEmptyOrDash(snapshot?.snapshot_month ?? null)}`,
    `- snapshot_kind: ${nonEmptyOrDash(snapshot?.snapshot_kind ?? null)}`,
    `- project_key: ${nonEmptyOrDash(snapshot?.project_key ?? null)}`,
    `- created_at: ${nonEmptyOrDash(snapshot?.created_at ?? null)}`,
    `- label: ${nonEmptyOrDash(snapshot?.label ?? null)}`,
  ];
}

function buildPositionText(position: InvestorPositionRow | null): {
  summaryText: string;
  narrativeText: string;
} {
  return {
    summaryText: nonEmptyOrDash(position?.summary_text ?? null),
    narrativeText: nonEmptyOrDash(position?.narrative_text ?? null),
  };
}

function sortMetrics(metrics: MetricValueRow[]): MetricValueRow[] {
  return [...metrics]
    .filter((m) => !isForbiddenOperationalKpiMetricKey(m.metric_key))
    .sort((a, b) => a.metric_key.localeCompare(b.metric_key));
}

function sortSources(sources: SnapshotSourceRow[]): SnapshotSourceRow[] {
  return [...sources].sort((a, b) => {
    const aType = (a.source_type ?? "").toLowerCase();
    const bType = (b.source_type ?? "").toLowerCase();
    if (aType !== bType) return aType.localeCompare(bType);
    const aTitle = (a.title ?? "").toLowerCase();
    const bTitle = (b.title ?? "").toLowerCase();
    if (aTitle !== bTitle) return aTitle.localeCompare(bTitle);
    return (a.url ?? "").localeCompare(b.url ?? "");
  });
}

export function buildLeoContextPack(input: {
  screenTitle: string;
  route: ShellRouteKey;
  snapshot: SnapshotRow | null;
  position: InvestorPositionRow | null;
  metrics: MetricValueRow[];
  sources: SnapshotSourceRow[];
}): LeoContextPack {
  const month = nonEmptyOrDash(input.snapshot?.snapshot_month ?? null);
  const kind = nonEmptyOrDash(input.snapshot?.snapshot_kind ?? null);
  const projectKey = nonEmptyOrDash(input.snapshot?.project_key ?? null);

  const { summaryText, narrativeText } = buildPositionText(input.position);
  const sortedMetrics = sortMetrics(input.metrics);
  const sortedSources = sortSources(input.sources);

  const exportPackText = buildInvestorPackText({
    month,
    kind,
    projectKey,
    summaryText,
    narrativeText,
    metrics: sortedMetrics,
    sources: sortedSources,
  });

  const lines: string[] = [];
  lines.push("LEO VISION — Context Pack");
  lines.push(`Screen: ${input.screenTitle} (${input.route})`);
  lines.push(`Snapshot: ${buildSnapshotDisplayLabel(input.snapshot)}`);
  lines.push(...buildSnapshotMetaLines(input.snapshot));
  lines.push("");
  lines.push(exportPackText);

  return {
    screenTitle: input.screenTitle,
    route: input.route,
    snapshot: input.snapshot,
    exportPackText,
    contextPackText: lines.join("\n"),
  };
}

function explainScreenBody(route: ShellRouteKey): string[] {
  // Keep this purely descriptive (no analytics, no inference).
  return route === "orbit"
    ? [
        "- Orbit is the entry point to select a snapshot and enter the read-only investor view.",
        "- Use the snapshot selector to pick the active snapshot.",
      ]
    : route === "value_multi"
      ? [
          "- Value is a display-only view of stored metric values (metric_key + value_text).",
          "- No calculations or derived metrics are performed in-app.",
        ]
      : route === "snapshot_detail"
        ? [
            "- Snapshot Detail shows the selected snapshot’s stored narrative and metric values.",
            "- Text is displayed verbatim; missing fields show “—”.",
          ]
        : route === "documents_sources"
          ? [
              "- Documents & Sources lists snapshot-linked source documents (titles/urls/notes).",
              "- Links open externally; there are no uploads or edits.",
            ]
          : route === "export_pack"
            ? [
                "- Export generates a deterministic plain-text Investor Pack for the active snapshot.",
                "- It supports Copy and Share without adding any calculations.",
              ]
            : route === "audit"
              ? [
                  "- Audit Log shows local, read-only activity records (no analytics, no backend writes).",
                  "- It’s chronological truth only (what/when/on which snapshot).",
                ]
              : route === "account"
                ? [
                    "- Account shows your identity/build info and provides Sign out.",
                    "- The app is read-only (other than auth sign-out).",
                  ]
                : route === "snapshot_timeline"
                  ? [
                      "- Snapshot Timeline lists snapshots chronologically and lets you jump into details.",
                      "- Timeline items are metadata only (no trends, charts, or deltas).",
                    ]
                  : [
                      "- Cockpit is the read-only landing view for the active snapshot.",
                      "- Use navigation to open Detail, Value, Sources, Export, and Audit Log.",
                    ];
}

export function renderLeoVisionAnswer(input: {
  action: LeoVisionQuickActionKey;
  current: LeoContextPack;
  previous?: LeoContextPack | null;
}): string {
  const { action, current, previous } = input;

  const header =
    action === "explain_screen"
      ? "Ask Leo — Explain this screen"
      : action === "what_changed_since_last_snapshot"
        ? "Ask Leo — What changed since last snapshot?"
        : action === "what_should_i_check_next"
          ? "Ask Leo — What should I check next?"
          : "Ask Leo — Investor Brief (template)";

  const lines: string[] = [];
  lines.push(header);
  lines.push("");
  lines.push("Mode: deterministic template (no external calls; no calculations).");
  lines.push("");

  if (action === "explain_screen") {
    lines.push(`Screen: ${current.screenTitle}`);
    lines.push(`Snapshot: ${buildSnapshotDisplayLabel(current.snapshot)}`);
    lines.push("");
    lines.push("What this screen does:");
    lines.push(...explainScreenBody(current.route));
    lines.push("");
    lines.push("Context pack:");
    lines.push(current.contextPackText);
    return lines.join("\n");
  }

  if (action === "what_should_i_check_next") {
    lines.push(`Screen: ${current.screenTitle}`);
    lines.push(`Snapshot: ${buildSnapshotDisplayLabel(current.snapshot)}`);
    lines.push("");
    lines.push("Next checks (read-only):");
    lines.push("- Review summary_text and narrative_text (verbatim).");
    lines.push("- Review metric values (metric_key + value_text).");
    lines.push("- Open Documents & Sources for supporting links.");
    lines.push("- Create / copy an Investor Pack (Export).");
    lines.push("- Use Audit Log for a chronological record of actions.");
    lines.push("");
    lines.push("Context pack:");
    lines.push(current.contextPackText);
    return lines.join("\n");
  }

  if (action === "create_investor_brief") {
    lines.push("Investor brief source: Export Pack builder (verbatim; display-only).");
    lines.push("");
    lines.push(current.exportPackText);
    return lines.join("\n");
  }

  // what_changed_since_last_snapshot
  lines.push("Guardrail note: no deltas, comparisons, or derived metrics are computed here.");
  lines.push("This view shows stored text for the current snapshot and the previous snapshot.");
  lines.push("");

  lines.push("Current snapshot");
  lines.push(...buildSnapshotMetaLines(current.snapshot));
  lines.push("");
  lines.push("Current context pack:");
  lines.push(current.contextPackText);
  lines.push("");

  lines.push("Previous snapshot");
  if (previous) {
    lines.push(...buildSnapshotMetaLines(previous.snapshot));
    lines.push("");
    lines.push("Previous context pack:");
    lines.push(previous.contextPackText);
  } else {
    lines.push("- snapshot_id: —");
    lines.push("- snapshot_id_short: —");
    lines.push("- snapshot_month: —");
    lines.push("- snapshot_kind: —");
    lines.push("- project_key: —");
    lines.push("- created_at: —");
    lines.push("- label: —");
    lines.push("");
    lines.push("Previous context pack:");
    lines.push("—");
  }

  return lines.join("\n");
}

