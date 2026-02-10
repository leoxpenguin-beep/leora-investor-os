import { getSupabaseEnvStatus, supabase } from "./supabaseClient";
import type { SnapshotContext } from "./snapshotContext";

// Module 18 — Leo Vision v2 UI (read-only)
//
// Guardrails:
// - Edge Function only: supabase.functions.invoke("ask_leo_v2")
// - No derived metrics / no predictions / no writes from the app
// - If missing/invalid response: "Not available in this snapshot."

export const NOT_AVAILABLE_IN_SNAPSHOT = "Not available in this snapshot." as const;

export type AskLeoV2Citation = {
  title: string;
  type: string; // display-only
  date: string; // display-only
  url: string;
};

export type AskLeoV2Sections = {
  summary: string;
  what_changed: string;
  context: string;
  citations: AskLeoV2Citation[];
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function normalizeCitation(v: unknown): AskLeoV2Citation | null {
  if (!v || typeof v !== "object") return null;
  const rec = v as Record<string, unknown>;

  const title = isNonEmptyString(rec.title) ? rec.title.trim() : null;
  if (!title) return null;

  const type = isNonEmptyString(rec.type) ? rec.type.trim() : "—";
  const date = isNonEmptyString(rec.date) ? rec.date.trim() : "—";
  const url = isNonEmptyString(rec.url) ? rec.url.trim() : "—";

  return { title, type, date, url };
}

function normalizeSectionsFromUnknown(data: unknown): AskLeoV2Sections {
  const rec = data && typeof data === "object" ? (data as Record<string, unknown>) : {};

  // Allow a couple of possible envelopes:
  // - { summary, what_changed, context, citations }
  // - { response: { summary, what_changed, context, citations } }
  // - { answerText, citations }  (treated as summary-only)
  const inner =
    rec.response && typeof rec.response === "object" ? (rec.response as Record<string, unknown>) : rec;

  const summary =
    isNonEmptyString(inner.summary)
      ? inner.summary.trim()
      : isNonEmptyString(inner.answerText)
        ? inner.answerText.trim()
        : "";

  const what_changed = isNonEmptyString(inner.what_changed)
    ? inner.what_changed.trim()
    : isNonEmptyString(inner.whatChanged)
      ? String(inner.whatChanged).trim()
      : "";

  const context = isNonEmptyString(inner.context)
    ? inner.context.trim()
    : isNonEmptyString(inner.context_text)
      ? inner.context_text.trim()
      : "";

  const citationsRaw = Array.isArray(inner.citations) ? inner.citations : [];
  const citations = citationsRaw
    .map(normalizeCitation)
    .filter((c): c is AskLeoV2Citation => Boolean(c));

  const hasAny =
    summary.length > 0 ||
    what_changed.length > 0 ||
    context.length > 0 ||
    citations.length > 0;

  if (!hasAny) {
    return {
      summary: NOT_AVAILABLE_IN_SNAPSHOT,
      what_changed: "",
      context: "",
      citations: [],
    };
  }

  // If the model explicitly returned the fallback phrase, keep it exact and empty everything else.
  if (summary === NOT_AVAILABLE_IN_SNAPSHOT) {
    return { summary, what_changed: "", context: "", citations: [] };
  }

  return { summary, what_changed, context, citations };
}

export async function askLeoV2(input: {
  question: string;
  snapshotContext: SnapshotContext;
  activeSnapshot?: {
    snapshot_month?: string | null;
    snapshot_kind?: string | null;
    project_key?: string | null;
    created_at?: string | null;
    label?: string | null;
  } | null;
}): Promise<AskLeoV2Sections> {
  const env = getSupabaseEnvStatus();
  if (!supabase || !env.hasUrl || !env.hasAnonKey) {
    throw new Error("Missing env: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY");
  }

  const question = input.question.trim();
  if (!question) {
    return {
      summary: NOT_AVAILABLE_IN_SNAPSHOT,
      what_changed: "",
      context: "",
      citations: [],
    };
  }

  const { data, error } = await supabase.functions.invoke("ask_leo_v2", {
    body: {
      question,
      snapshotContext: input.snapshotContext,
      activeSnapshot: input.activeSnapshot ?? null,
    },
  });

  if (error) {
    // Contract: invalid/missing → show the exact phrase.
    return {
      summary: NOT_AVAILABLE_IN_SNAPSHOT,
      what_changed: "",
      context: "",
      citations: [],
    };
  }

  return normalizeSectionsFromUnknown(data);
}

