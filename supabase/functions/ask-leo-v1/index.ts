import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Module 17 — Ask Leo v1 (Supabase Edge Function)
//
// Non‑negotiable guardrails enforced here:
// - Require authenticated user (JWT via Authorization header)
// - Best‑effort in‑memory per‑user rate limiting (10 req / 60s)
// - Answer ONLY from provided snapshotContext (no DB reads/writes)
// - No derived-metric math, no predictions, no investment advice
// - If missing: "Not available in this snapshot."

type AskLeoV1Request = {
  question: string;
  snapshotContext: unknown;
  activeSnapshot?: unknown;
};

type AskLeoV1Response = {
  answerText: string;
  evidence: {
    metrics_used: string[];
    sources_used: Array<{ title: string; url: string }>;
  };
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

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function getBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const m = authHeader.match(/^\s*Bearer\s+(.+)\s*$/i);
  return m?.[1]?.trim() ? m[1].trim() : null;
}

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateLimitByUserId = new Map<string, number[]>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const prev = rateLimitByUserId.get(userId) ?? [];
  const next = prev.filter((t) => t > windowStart);
  if (next.length >= RATE_LIMIT_MAX) {
    rateLimitByUserId.set(userId, next);
    return false;
  }
  next.push(now);
  rateLimitByUserId.set(userId, next);
  return true;
}

async function requireUserId(req: Request): Promise<{ userId: string } | { error: Response }> {
  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
  const token = getBearerToken(authHeader);
  if (!token) return { error: json(401, { error: "Unauthorized" }) };

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: json(500, { error: "Missing Supabase env" }) };
  }

  // Validate JWT via Supabase Auth. We do NOT trust any client-supplied user/investor claims.
  const resp = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
    },
  });

  if (!resp.ok) return { error: json(401, { error: "Unauthorized" }) };

  const data = (await resp.json()) as Record<string, unknown>;
  const id = data?.id;
  if (!isNonEmptyString(id)) return { error: json(401, { error: "Unauthorized" }) };
  return { userId: id.trim() };
}

function buildSystemPrompt(): string {
  return [
    "You are Leo Vision.",
    "",
    "You must answer using ONLY the provided snapshotContext.",
    "- Do not calculate any financial metrics (no IRR/MOIC/CAGR/valuation math).",
    "- Do not estimate, forecast, or predict.",
    "- Do not provide investment advice (no “should invest”, no recommendations).",
    '- If the user asks for something not in snapshotContext, respond: "Not available in this snapshot."',
    "- When referencing values, quote them verbatim from snapshotContext (value_text / narrative_text / sources).",
    '- Provide a short "Evidence used" list (metric_keys and/or source titles).',
    "",
    "Important:",
    "- Do not use outside knowledge.",
    "- When referencing any metric value, include the metric_key exactly as it appears in snapshotContext.",
    "- If nothing supports an answer, respond with the not-available sentence only.",
  ].join("\n");
}

function buildUserPrompt(input: {
  question: string;
  snapshotContext: unknown;
  activeSnapshot: unknown | null;
}): string {
  const parts = [
    "Question:",
    input.question,
    "",
    "activeSnapshot (optional):",
    JSON.stringify(input.activeSnapshot ?? null),
    "",
    "snapshotContext (authoritative; use only this):",
    JSON.stringify(input.snapshotContext ?? null),
  ];
  return parts.join("\n");
}

async function callOpenAiAnswerText(userPrompt: string): Promise<string> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

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
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!resp.ok) {
    const msg = `OpenAI error: ${resp.status}`;
    throw new Error(msg);
  }

  const data = (await resp.json()) as Record<string, unknown>;
  const content = (data.choices as any)?.[0]?.message?.content;
  if (!isNonEmptyString(content)) {
    throw new Error("Model output missing");
  }

  return content.trim();
}

function listMetricKeys(snapshotContext: unknown): string[] {
  const rec = asRecord(snapshotContext);
  const arr =
    (rec?.metric_values ?? rec?.metrics ?? rec?.metricValues ?? null) as unknown;
  if (!Array.isArray(arr)) return [];

  const out: string[] = [];
  for (const item of arr) {
    const r = asRecord(item);
    const key = r?.metric_key ?? r?.metricKey ?? null;
    if (isNonEmptyString(key)) out.push(key.trim());
  }

  return Array.from(new Set(out));
}

function listSources(snapshotContext: unknown): Array<{ title: string; url: string }> {
  const rec = asRecord(snapshotContext);
  const arr =
    (rec?.snapshot_sources ?? rec?.sources ?? rec?.snapshotSources ?? null) as unknown;
  if (!Array.isArray(arr)) return [];

  const out: Array<{ title: string; url: string }> = [];
  const seen = new Set<string>();

  for (const item of arr) {
    const r = asRecord(item);
    const rawTitle = r?.title ?? null;
    if (!isNonEmptyString(rawTitle)) continue;
    const title = rawTitle.trim();
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const rawUrl = r?.url ?? null;
    const url = isNonEmptyString(rawUrl) ? rawUrl.trim() : "—";
    out.push({ title, url });
  }

  return out;
}

function extractEvidence(answerText: string, snapshotContext: unknown): AskLeoV1Response["evidence"] {
  const hay = answerText.toLowerCase();

  const metricKeys = listMetricKeys(snapshotContext);
  const metrics_used = metricKeys
    .filter((k) => k.trim().length > 0 && hay.includes(k.toLowerCase()))
    .slice(0, 50);

  const sources = listSources(snapshotContext);
  const sources_used = sources
    .filter((s) => {
      const t = s.title.trim().toLowerCase();
      if (t && hay.includes(t)) return true;
      const u = s.url.trim().toLowerCase();
      return u && u !== "—" && hay.includes(u);
    })
    .slice(0, 50);

  return { metrics_used, sources_used };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const auth = await requireUserId(req);
  if ("error" in auth) return auth.error;

  if (!checkRateLimit(auth.userId)) {
    return json(429, { error: "Rate limit exceeded" });
  }

  let payload: AskLeoV1Request | null = null;
  try {
    payload = (await req.json()) as AskLeoV1Request;
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const question = isNonEmptyString(payload?.question) ? payload!.question.trim() : "";
  const snapshotContext = payload?.snapshotContext ?? null;
  const activeSnapshot = payload?.activeSnapshot ?? null;

  if (!question) return json(400, { error: "Missing question" });
  if (!snapshotContext || typeof snapshotContext !== "object") {
    return json(400, { error: "Missing snapshotContext" });
  }

  try {
    const userPrompt = buildUserPrompt({ question, snapshotContext, activeSnapshot });
    const answerText = await callOpenAiAnswerText(userPrompt);
    const evidence = extractEvidence(answerText, snapshotContext);

    const out: AskLeoV1Response = { answerText, evidence };
    return json(200, out);
  } catch {
    // Don't leak internal errors; mobile shows a generic message.
    return json(500, { error: "Leo is unavailable. Try again." });
  }
});

