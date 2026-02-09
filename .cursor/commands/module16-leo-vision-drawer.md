# module16-leo-vision-drawer

Implement **Module 16 — Leo Vision (Ask Leo Drawer)** for Leora Investor OS.

## Goal

Add an **Ask Leo** experience that feels AI-driven while remaining:

- **Deterministic + template-based** (no external calls)
- **Narrative-only** (display-only strings)
- **Read-only** (no Supabase writes)

## UX

- Top bar action: **Ask Leo** (available across shell routes)
- Opens a bottom drawer/modal titled **Ask Leo**
- Quick actions:
  - Explain this screen
  - What changed since last snapshot?
  - What should I check next?
  - Create Investor Brief (from Export Pack)

## Data inputs (display-only)

Responses are built ONLY from existing snapshot data (verbatim where applicable):

- Selected snapshot fields: `snapshot_month`, `snapshot_kind`, `project_key`, `created_at`, `label`
- Investor position: `summary_text`, `narrative_text` (verbatim)
- Metric values: `metric_key`, `value_text` (display-only)
- Sources: `title`, `url`, `note` (verbatim)
- Export pack text: reuse deterministic Export Pack generator

Missing/empty fields render as `"—"`.

## Architecture

- **Context pack builder**: `buildLeoContextPack(...)` assembles plain-text context (Export Pack + metadata)
- **Templates**: `renderLeoVisionAnswer(...)` returns deterministic responses for each quick action
- **Drawer UI**: `LeoVisionDrawer` shows quick actions + response text

## Files touched

- `apps/mobile/src/shell/routes.ts` (route type + title helper)
- `apps/mobile/src/shell/TerminalShell.tsx` (Ask Leo top-bar action + drawer)
- `apps/mobile/src/components/LeoVisionDrawer.tsx` (drawer modal UI)
- `apps/mobile/src/lib/leoVision.ts` (context pack + deterministic templates)
- `apps/mobile/src/lib/exportPack.ts` (shared Export Pack text generator)
- `apps/mobile/src/screens/ExportSharePackScreen.tsx` (uses shared generator)

## How to run (Expo)

- From repo root:
  - `cd apps/mobile`
  - `npm install`
  - `npm run start`

## Guardrails self-check (Module 16) — PASS

- No derived metrics / no finance calculations / no deltas: PASS
- No Supabase writes (read-only RPCs only): PASS
- No service role usage: PASS
- Copy lock respected (verbatim stored text; only framing labels added): PASS
- Demo Mode continues working (RPC wrappers honor demo mode): PASS
- Works in production builds (template mode only; no external AI calls): PASS

This command will be available in chat with `/module16-leo-vision-drawer`.

