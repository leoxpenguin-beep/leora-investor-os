import { getSupabaseEnvStatus, supabase } from "./supabaseClient";
import type { SnapshotContext } from "./snapshotContext";

// Module 17 — Ask Leo (Snapshot-Scoped Intelligence v1)
//
// Guardrails:
// - Client is read-only: calls Supabase Edge Function; no DB writes
// - Payload is snapshot-scoped (context is provided by client)

export type AskLeoCitation = {
  title: string;
  url: string | null;
};

export type AskLeoV1Response = {
  answerText: string;
  citations: AskLeoCitation[];
  evidenceUsed?: string[];
  notAvailable?: string[];
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter(isNonEmptyString) : [];
}

function normalizeCitation(v: unknown): AskLeoCitation | null {
  if (!v || typeof v !== "object") return null;
  const rec = v as Record<string, unknown>;
  const title = isNonEmptyString(rec.title) ? rec.title.trim() : null;
  if (!title) return null;
  const url = isNonEmptyString(rec.url) ? rec.url.trim() : null;
  return { title, url };
}

export async function askLeoV1(input: {
  question: string;
  snapshotContext: SnapshotContext;
}): Promise<AskLeoV1Response> {
  const env = getSupabaseEnvStatus();
  if (!supabase || !env.hasUrl || !env.hasAnonKey) {
    throw new Error("Missing env: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY");
  }

  const question = input.question.trim();
  if (!question) {
    return { answerText: "—", citations: [], evidenceUsed: [], notAvailable: ["question"] };
  }

  const { data, error } = await supabase.functions.invoke("ask_leo_v1", {
    body: { question, snapshotContext: input.snapshotContext },
  });

  if (error) throw error;

  const rec = (data ?? {}) as Record<string, unknown>;
  const answerText = isNonEmptyString(rec.answerText) ? rec.answerText : "—";

  const citations = Array.isArray(rec.citations)
    ? rec.citations
        .map(normalizeCitation)
        .filter((c): c is AskLeoCitation => Boolean(c))
    : [];

  return {
    answerText,
    citations,
    evidenceUsed: asStringArray(rec.evidenceUsed),
    notAvailable: asStringArray(rec.notAvailable),
  };
}

