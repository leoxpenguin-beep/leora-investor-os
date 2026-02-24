import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type SnapshotContext = {
  snapshot_id?: unknown;
  snapshot_sources?: Array<{
    title?: unknown;
    url?: unknown;
  }>;
  [key: string]: unknown;
};

type AskLeoV2Request = {
  question?: unknown;
  snapshot_id?: unknown;
  snapshotContext?: unknown;
  activeSnapshot?: unknown;
};

type AskLeoModelJson = {
  answer: string;
  evidence_metric_keys: string[];
  evidence_sources: string[];
  not_available: string[];
};

const NOT_AVAILABLE = "Not available in this snapshot.";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter(isNonEmptyString).map((s) => s.trim()) : [];
}

function hasAuthHeader(req: Request): boolean {
  const auth = req.headers.get("authorization") ?? req.headers.get("Authorization");
  return isNonEmptyString(auth) && auth.trim().toLowerCase().startsWith("bearer ");
}

function hasApiKeyHeader(req: Request): boolean {
  const apiKey = req.headers.get("apikey");
  return isNonEmptyString(apiKey);
}

function validatePayload(payload: AskLeoV2Request): string[] {
  const errors: string[] = [];

  if (!isNonEmptyString(payload.question)) {
    errors.push("missing question");
  }

  if (!isNonEmptyString(payload.snapshot_id)) {
    errors.push("missing snapshot_id");
  }

  const snapshotContext = payload.snapshotContext;
  if (!snapshotContext || typeof snapshotContext !== "object" || Array.isArray(snapshotContext)) {
    errors.push("invalid snapshotContext: expected object");
    return errors;
  }

  const contextRecord = snapshotContext as SnapshotContext;
  if (!isNonEmptyString(contextRecord.snapshot_id)) {
    errors.push("invalid snapshotContext.snapshot_id");
  }

  return errors;
}

function normalizeModelJson(raw: unknown): AskLeoModelJson {
  const rec = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const answer = isNonEmptyString(rec.answer) ? rec.answer.trim() : NOT_AVAILABLE;
  return {
    answer,
    evidence_metric_keys: asStringArray(rec.evidence_metric_keys).slice(0, 50),
    evidence_sources: asStringArray(rec.evidence_sources).slice(0, 50),
    not_available: asStringArray(rec.not_available).slice(0, 50),
  };
}

function buildSystemPrompt(): string {
  return [
    "You are Leo Vision v2 in Leora Investor OS.",
    "",
    "HARD RULES:",
    "- Use only snapshotContext data provided in input.",
    `- If data is missing, answer exactly: "${NOT_AVAILABLE}"`,
    "- No calculations, no derived metrics, no predictions, no advice.",
    "",
    "Return JSON only:",
    "{",
    '  "answer": string,',
    '  "evidence_metric_keys": string[],',
    '  "evidence_sources": string[],',
    '  "not_available": string[]',
    "}",
  ].join("\n");
}

function buildUserPrompt(question: string, snapshotContext: SnapshotContext): string {
  return [
    "question:",
    question,
    "",
    "snapshotContext:",
    JSON.stringify(snapshotContext),
  ].join("\n");
}

function mapCitations(
  snapshotContext: SnapshotContext,
  evidenceSources: string[]
): Array<{ title: string; url: string | null }> {
  const rawSources = Array.isArray(snapshotContext.snapshot_sources)
    ? snapshotContext.snapshot_sources
    : [];

  const out: Array<{ title: string; url: string | null }> = [];
  const seen = new Set<string>();

  for (const rawTitle of evidenceSources) {
    const titleKey = rawTitle.trim().toLowerCase();
    if (!titleKey || seen.has(titleKey)) continue;
    seen.add(titleKey);

    const match = rawSources.find((s) => {
      const t = s && typeof s === "object" ? (s.title as unknown) : "";
      return isNonEmptyString(t) && t.trim().toLowerCase() === titleKey;
    });
    if (!match) continue;

    const title = isNonEmptyString(match.title) ? match.title.trim() : rawTitle.trim();
    const url = isNonEmptyString(match.url) && match.url.trim() !== "—" ? match.url.trim() : null;
    out.push({ title, url });
  }

  return out;
}

async function callOpenAiChatJson(question: string, snapshotContext: SnapshotContext): Promise<AskLeoModelJson> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return {
      answer: NOT_AVAILABLE,
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
        { role: "user", content: buildUserPrompt(question, snapshotContext) },
      ],
    }),
  });

  if (!resp.ok) {
    return {
      answer: NOT_AVAILABLE,
      evidence_metric_keys: [],
      evidence_sources: [],
      not_available: ["openai_error"],
    };
  }

  const data = (await resp.json()) as Record<string, unknown>;
  const content = (data.choices as any)?.[0]?.message?.content;
  if (!isNonEmptyString(content)) {
    return {
      answer: NOT_AVAILABLE,
      evidence_metric_keys: [],
      evidence_sources: [],
      not_available: ["model_output"],
    };
  }

  try {
    return normalizeModelJson(JSON.parse(content));
  } catch {
    return {
      answer: NOT_AVAILABLE,
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

  if (!hasAuthHeader(req) && !hasApiKeyHeader(req)) {
    return json(401, {
      error: "Unauthorized: provide Authorization Bearer token or apikey header",
    });
  }

  let payload: AskLeoV2Request | null = null;
  try {
    payload = (await req.json()) as AskLeoV2Request;
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const validationErrors = validatePayload(payload ?? {});
  if (validationErrors.length > 0) {
    return json(400, {
      error: "Invalid request payload",
      details: validationErrors,
    });
  }

  const question = (payload!.question as string).trim();
  const snapshotContext = payload!.snapshotContext as SnapshotContext;

  const modelJson = await callOpenAiChatJson(question, snapshotContext);
  const citations = mapCitations(snapshotContext, modelJson.evidence_sources);
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
