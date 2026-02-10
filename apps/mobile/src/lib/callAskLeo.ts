import { getSupabaseEnvStatus, supabase } from "./supabaseClient";
import type { SnapshotContext } from "./snapshotContext";

// Module 17 — Ask Leo v1 (Edge)
//
// Guardrails:
// - No OpenAI key in the app (Edge Function only)
// - Read-only from the app: invoke edge function; no DB writes

export type AskLeoEdgeActiveSnapshot = {
  snapshot_month?: string | null;
  snapshot_kind?: string | null;
  project_key?: string | null;
  created_at?: string | null;
  label?: string | null;
};

export type AskLeoEdgeEvidence = {
  metrics_used: string[];
  sources_used: Array<{ title: string; url: string }>;
};

export type AskLeoEdgeResponse = {
  answerText: string;
  evidence: AskLeoEdgeEvidence;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter(isNonEmptyString).map((s) => s.trim()) : [];
}

function normalizeSourcesUsed(v: unknown): Array<{ title: string; url: string }> {
  if (!Array.isArray(v)) return [];
  const out: Array<{ title: string; url: string }> = [];
  for (const item of v) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const title = isNonEmptyString(rec.title) ? rec.title.trim() : null;
    if (!title) continue;
    const url = isNonEmptyString(rec.url) ? rec.url.trim() : "—";
    out.push({ title, url });
  }
  return out;
}

export async function callAskLeo(input: {
  question: string;
  snapshotContext: SnapshotContext;
  activeSnapshot?: AskLeoEdgeActiveSnapshot | null;
}): Promise<AskLeoEdgeResponse> {
  const env = getSupabaseEnvStatus();
  if (!supabase || !env.hasUrl || !env.hasAnonKey) {
    throw new Error("Missing env: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY");
  }

  const question = input.question.trim();
  if (!question) {
    return {
      answerText: "—",
      evidence: { metrics_used: [], sources_used: [] },
    };
  }

  const { data, error } = await supabase.functions.invoke("ask-leo-v1", {
    body: {
      question,
      snapshotContext: input.snapshotContext,
      activeSnapshot: input.activeSnapshot ?? null,
    },
  });

  if (error) {
    // Normalize all server-side errors to a single UX message.
    throw new Error("Leo is unavailable. Try again.");
  }

  const rec = (data ?? {}) as Record<string, unknown>;
  const answerText = isNonEmptyString(rec.answerText) ? rec.answerText.trim() : "—";

  const evidenceRec =
    rec.evidence && typeof rec.evidence === "object" ? (rec.evidence as Record<string, unknown>) : {};

  return {
    answerText,
    evidence: {
      metrics_used: asStringArray(evidenceRec.metrics_used),
      sources_used: normalizeSourcesUsed(evidenceRec.sources_used),
    },
  };
}

