# module18-leo-vision-v2-ui

Implement **Module 18 — Leo Vision v2 UI Polish (Option A, read-only)**.

## Goal

Upgrade the Ask Leo v2 experience so it feels like an AI-driven system (structured response), while remaining:

- Snapshot-scoped
- Read-only (no Supabase writes)
- No derived metrics / no finance math / no predictions
- Demo Mode safe (no network calls)

## What changed

### Leo Vision Drawer

- Adds a **Leo Vision v2** tab in the existing Ask Leo drawer.
- Replaces chat-style rendering with a structured **Leo Response** layout (accordion sections).

### Structured “Leo Response” layout

- **Snapshot Context Preview** card:
  - `snapshot_month · snapshot_kind · project_key`
  - Sources count (from `citations.length`)
  - `created_at` (fallback `"—"`)
- **Accordion sections**:
  - Summary
  - What changed
  - Context
  - Sources
- Any empty section renders `"—"`.

### Sources section

- Citations render as tappable cards:
  - title
  - type
  - date
  - url
- If url exists → opens via `Linking.openURL`
- If missing → shows alert: **"No link available"**

### Transparency panel

If:

- The response is exactly **"Not available in this snapshot."**, OR
- Any section is missing

Then show **“Why Leo can’t answer”** with:

- reason: “This snapshot doesn’t contain the requested field.”
- 3–5 safe, snapshot-scoped example queries

## Edge function usage

- Mobile calls **only**: `supabase.functions.invoke("ask_leo_v2", { body })`
- OpenAI keys must remain server-side (Supabase secrets), not in the app.

## Files touched

- `apps/mobile/src/components/LeoVisionDrawer.tsx`
- `apps/mobile/src/screens/AskLeoV2Screen.tsx`
- `apps/mobile/src/lib/askLeoV2.ts`

## How to run (Expo)

- `cd apps/mobile`
- `npm install`
- `npm run start`

## Guardrails self-check (Module 18) — PASS

- No derived metrics / finance math / predictions: PASS
- No Supabase writes (`insert/update/delete`): PASS
- Edge function calls: `ask_leo_v2` only (for v2): PASS
- Snapshot-scoped context only; missing/invalid → **"Not available in this snapshot."**: PASS
- Demo Mode: no network calls: PASS

