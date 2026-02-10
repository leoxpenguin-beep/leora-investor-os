# module17-ask-leo-v1-edge

Implement **Module 17 — Ask Leo v1 (Supabase Edge Function)** for Leora Investor OS.

## Goal

Provide a snapshot-scoped Ask Leo chat that:

- Uses **read-only snapshot fields only** (strings from RPCs)
- Performs **no finance math / no derived metrics / no predictions**
- Calls OpenAI via a **Supabase Edge Function** (`ask-leo-v1`)
- Works in **Demo Mode** without network calls (templates only)

## Architecture

### Client-side snapshot context (read-only)

- `buildSnapshotContext(snapshotId)` fetches (RPC-only):
  - `rpc_list_metric_values(p_snapshot_id)`
  - `rpc_get_investor_position(p_snapshot_id)`
  - `rpc_list_snapshot_sources(p_snapshot_id)`
- Returns a **strings-only** structured context object (`SnapshotContext`).

### Ask Leo drawer (mobile)

- Chat tab supports:
  - Text input + Send
  - Chat bubbles (user + Leo)
  - Loading indicator
  - Error handling: **“Leo is unavailable. Try again.”**
- **Demo Mode**:
  - Does **not** call the edge function
  - Uses deterministic template replies (Module 16 behavior)

### Edge Function: `ask-leo-v1`

- Endpoint: `POST` JSON:
  - `{ question, snapshotContext, activeSnapshot? }`
- Auth:
  - Requires a valid user JWT (`Authorization: Bearer <token>`)
  - Missing/invalid → `401`
- Rate limit:
  - Best-effort in-memory throttle per `user_id`: **10 requests / minute**
  - Exceeded → `429`
- OpenAI:
  - Uses Supabase function secret `OPENAI_API_KEY`
  - Optional `OPENAI_MODEL` (defaults inside function)
- Returns:
  - `{ answerText, evidence: { metrics_used, sources_used } }`
- Guardrails:
  - Answer only from `snapshotContext`
  - Missing info → **"Not available in this snapshot."**
  - No calculations, no predictions, no advice
  - No DB writes

## Files touched

- `apps/mobile/src/lib/snapshotContext.ts`
- `apps/mobile/src/lib/callAskLeo.ts`
- `apps/mobile/src/components/LeoVisionDrawer.tsx`
- `supabase/functions/ask-leo-v1/index.ts`
- `supabase/functions/ask-leo-v1/deno.json`
- `docs/DATA_CONTRACTS.md`

## Supabase secrets (required)

Set in Supabase Dashboard or CLI:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional)

## Deploy edge function

From repo root:

- `supabase functions deploy ask-leo-v1`
- `supabase secrets set OPENAI_API_KEY=...`

## Guardrails self-check (Module 17) — PASS

- No derived metrics / finance math: PASS
- No predictions / advice: PASS
- Read-only Supabase from mobile (RPC only) and edge (no DB writes): PASS
- Grounded answers only from provided `snapshotContext`; missing → "Not available in this snapshot.": PASS
- Demo Mode: templates only, no edge calls: PASS

