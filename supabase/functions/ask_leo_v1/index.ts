import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Module 17 — Ask Leo (Snapshot-Scoped Intelligence v1)
//
// Guardrails enforced here:
// - Answer ONLY from provided snapshotContext
// - If missing, respond with: "Not available in this snapshot."
// - No derived metrics / no finance calculations / no deltas
// - No predictions, no investment advice
// - Citations are derived only from snapshot_sources passed in snapshotContext

type SnapshotContext = {
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

type AskLeoV1Request = {
  question: string;
  snapshotContext: SnapshotContext;
};

type AskLeoV1ModelJson = {
  answer: string;
  evidence_metric_keys: string[];
  evidence_sources: string[];
  not_available: string[];
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter(isNonEmptyString).map((s) => s.trim()) : [];
}

function normalizeModelJson(raw: unknown): AskLeoV1ModelJson {
  const rec = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const answer = isNonEmptyString(rec.answer)
    ? rec.answer.trim()
    : "Not available in this snapshot.";
  return {
    answer,
    evidence_metric_keys: asStringArray(rec.evidence_metric_keys).slice(0, 50),
    evidence_sources: asStringArray(rec.evidence_sources).slice(0, 50),
    not_available: asStringArray(rec.not_available).slice(0, 50),
  };
}

function buildSystemPrompt(): string {
  return [
    "You are Leo (Leora Investor OS).",
    "",
    "NON-NEGOTIABLE RULES:",
    "- You MUST answer ONLY from the provided snapshotContext.",
    '- If a requested detail is not present in snapshotContext, say exactly: "Not available in this snapshot."',
    "- Do NOT calculate or derive anything (no IRR/MOIC/CAGR, no ratios, no deltas, no growth).",
    "- Do NOT predict or speculate. Do NOT provide investment advice.",
    "- Do NOT rewrite locked narrative text: if you reference summary_text or narrative_text, quote it verbatim.",
    "",
    "OUTPUT FORMAT (JSON ONLY):",
    "{",
    '  "answer": string,',
    '  "evidence_metric_keys": string[],',
    '  "evidence_sources": string[],',
    '  "not_available": string[]',
    "}",
    "",
    "EVIDENCE SELECTION:",
    "- evidence_metric_keys must contain only metric_keys that appear in snapshotContext.metric_values.",
    "- evidence_sources must contain only source titles that appear in snapshotContext.snapshot_sources.",
    "- not_available should list the missing items the user asked for (short phrases).",
    "",
    "STYLE:",
    "- Be concise and factual. Prefer short paragraphs and direct quotes when citing narrative fields.",
  ].join("\n");
}

function buildUserPrompt(input: AskLeoV1Request): string {
  return [
    "User question:",
    input.question,
    "",
    "snapshotContext (authoritative; use only this):",
    JSON.stringify(input.snapshotContext),
  ].join("\n");
}

function mapCitations(snapshotContext: SnapshotContext, evidenceSources: string[]): Array<{ title: string; url: string | null }> {
  const sources = Array.isArray(snapshotContext.snapshot_sources)
    ? snapshotContext.snapshot_sources
    : [];

  const out: Array<{ title: string; url: string | null }> = [];
  const seen = new Set<string>();

  for (const rawTitle of evidenceSources) {
    const t = rawTitle.trim().toLowerCase();
    if (!t || seen.has(t)) continue;
    seen.add(t);

    const match = sources.find((s) => (s?.title ?? "").trim().toLowerCase() === t);
    if (!match) continue;

    const title = isNonEmptyString(match.title) ? match.title.trim() : rawTitle.trim();
    const url =
      isNonEmptyString(match.url) && match.url.trim() !== "—" ? match.url.trim() : null;

    out.push({ title, url });
  }

  return out;
}

async function callOpenAiChatJson(input: AskLeoV1Request): Promise<AskLeoV1ModelJson> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return {
      answer: "Not available in this snapshot.",
      evidence_metric_keys: [],
      evidence_sources: [],
      not_available: ["OPENAI_API_KEY"],
    };
  }

  const model = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPrompt(input) },
      ],
    }),
  });

  if (!resp.ok) {
    return {
      answer: "Not available in this snapshot.",
      evidence_metric_keys: [],
      evidence_sources: [],
      not_available: ["openai_error"],
    };
  }

  const data = (await resp.json()) as Record<string, unknown>;
  const content = (data.choices as any)?.[0]?.message?.content;
  if (!isNonEmptyString(content)) {
    return {
      answer: "Not available in this snapshot.",
      evidence_metric_keys: [],
      evidence_sources: [],
      not_available: ["model_output"],
    };
  }

  try {
    return normalizeModelJson(JSON.parse(content));
  } catch {
    return {
      answer: "Not available in this snapshot.",
      evidence_metric_keys: [],
      evidence_sources: [],
      not_available: ["model_json_parse"],
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  let payload: AskLeoV1Request | null = null;
  try {
    payload = (await req.json()) as AskLeoV1Request;
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const question = isNonEmptyString(payload?.question) ? payload!.question.trim() : "";
  const snapshotContext = (payload?.snapshotContext ?? null) as SnapshotContext | null;

  if (!question) return json(400, { error: "Missing question" });
  if (!snapshotContext) return json(400, { error: "Missing snapshotContext" });

  const modelJson = await callOpenAiChatJson({ question, snapshotContext });

  const citations = mapCitations(snapshotContext, modelJson.evidence_sources);

  // Merge evidence into a single list (metric keys + source titles).
  const evidenceUsed = Array.from(
    new Set<string>([
      ...modelJson.evidence_metric_keys.map((k) => k.trim()).filter(Boolean),
      ...citations.map((c) => c.title.trim()).filter(Boolean),
    ])
  );

  return json(200, {
    answerText: modelJson.answer,
    citations,
    evidenceUsed,
    notAvailable: modelJson.not_available,
  });
});

