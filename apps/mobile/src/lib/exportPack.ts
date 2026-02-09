import type { MetricValueRow, SnapshotSourceRow } from "./rpc";

// Module 12 — Export / Share Pack (read-only)
//
// Guardrails:
// - No derived metrics / no finance calculations
// - Display-only: use stored strings (`value_text`, `summary_text`, `narrative_text`)
// - Deterministic formatting (plain text)

export function buildInvestorPackText(input: {
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

