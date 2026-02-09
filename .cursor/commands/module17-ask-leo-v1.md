# module17-ask-leo-v1

Implement **Module 17 — Ask Leo (Snapshot-Scoped Intelligence v1)** for Leora Investor OS.

## Goal

Add a grounded, snapshot-scoped Ask Leo experience that:

- Uses **read-only snapshot fields only** (`value_text`, `summary_text`, `narrative_text`, `snapshot_sources`)
- Performs **no finance math / no derived metrics / no predictions**
- Calls OpenAI via a **Supabase Edge Function** (`ask_leo_v1`)

## Architecture

### Client-side snapshot context (read-only)

- `buildSnapshotContext(snapshotId)` fetches (RPC-only):
  - `rpc_list_metric_values(snapshotId)`
  - `rpc_get_investor_position(snapshotId)`
  - `rpc_list_snapshot_sources(snapshotId)`
- Returns a **strings-only** structured context object.

### Ask Leo UI (in Ask Leo drawer)

- Uses the existing **Ask Leo** entrypoint (top-bar button).
- Adds an **Ask Leo v1** chat tab with:
  - Text input + Send
  - Chat bubbles
  - Assistant output sections:
    - **Answer**
    - **Evidence used**
    - **Not available**

### Edge Function: `ask_leo_v1`

- Accepts POST JSON: `{ question, snapshotContext }`
- Calls OpenAI with a strict grounding prompt:
  - answer only from `snapshotContext`
  - missing → **"Not available in this snapshot."**
  - no calculations / no advice / no predictions
- Returns JSON: `{ answerText, citations[], evidenceUsed[], notAvailable[] }`
- `citations[]` is built from `snapshotContext.snapshot_sources` titles/urls.

## Files touched

- `apps/mobile/src/components/LeoVisionDrawer.tsx`
- `apps/mobile/src/lib/snapshotContext.ts`
- `apps/mobile/src/lib/askLeoV1.ts`
- `supabase/functions/ask_leo_v1/index.ts`
- `docs/DATA_CONTRACTS.md`

## How to run (Expo)

- `cd apps/mobile`
- `npm install`
- `npm run start`

## Edge Function notes

- Requires Supabase secret: `OPENAI_API_KEY`
- Optional: `OPENAI_MODEL` (defaults inside function)

## Guardrails self-check (Module 17) — PASS

- No derived metrics / finance math / deltas: PASS
- No predictions or “what will happen”: PASS
- Read-only Supabase: RPC-only reads; no writes; no service role: PASS
- Answers grounded in snapshotContext only; missing → "Not available in this snapshot.": PASS
- Copy lock respected (verbatim narrative fields when referenced; no rewriting stored content): PASS

This command will be available in chat with `/module17-ask-leo-v1`.

