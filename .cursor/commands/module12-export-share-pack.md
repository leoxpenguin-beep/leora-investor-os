# module12-export-share-pack

Implement **Module 12 — Export / Share Pack (Read-only)** for Leora Investor OS.

## Goal

Add a screen that generates a shareable, read-only plain-text **Investor Pack** for the currently active snapshot.

- Display / packaging only
- No math
- No summarization / rewrite

## Hard guardrails (non‑negotiable)

- **No derived metrics / no finance calculations / no deltas**
- **No summarization / no copy rewriting** of stored text (render verbatim or `"—"`)
- **Read-only Supabase**: `supabase.rpc(...)` only
- **RLS respected** (owner-only)
- **Use existing RPCs** (add a SECURITY INVOKER RPC only if a required read path is missing)

## Data sources (existing RPCs)

- `rpc_get_investor_position(p_snapshot_id uuid)` → `summary_text`, `narrative_text`
- `rpc_list_metric_values(p_snapshot_id uuid)` → `metric_key`, `value_text`
- `rpc_list_snapshot_sources(p_snapshot_id uuid)` → `source_type`, `title`, `url`, `note`

## What changed

- New screen `ExportSharePackScreen`:
  - Loads investor position, metric values, and snapshot sources via RPC wrappers (read-only)
  - Renders sections:
    - Header (snapshot metadata)
    - My Position
    - Value
    - Documents & Sources
    - Pack preview (plain text)
  - Adds actions:
    - **Copy Pack** (clipboard) — uses `expo-clipboard`
    - **Share** — uses React Native `Share.share` with the same plain text
- Navigation:
  - Adds new route key: `export_pack`
  - Adds “Export Pack” action button on `SnapshotDetailScreen` to open the export screen
- Docs:
  - Updates `docs/DATA_CONTRACTS.md` to document `rpc_get_investor_position` (RPC list + example call)

## Files touched

- `apps/mobile/src/screens/ExportSharePackScreen.tsx`
- `apps/mobile/src/screens/SnapshotDetailScreen.tsx`
- `apps/mobile/src/shell/TerminalShell.tsx`
- `apps/mobile/App.tsx`
- `apps/mobile/package.json`
- `apps/mobile/package-lock.json`
- `docs/DATA_CONTRACTS.md`
- `.cursor/commands/module12-export-share-pack.md`

## How to run (Expo)

- From repo root:
  - `cd apps/mobile`
  - `npm install`
  - `npm run start`

## Guardrails self-check (Module 12)

- No derived metrics or calculations: PASS
- Read-only Supabase (RPC only): PASS
- RLS respected: PASS
- No copy rewriting / summarization: PASS
- Deterministic plain-text pack (no computed numbers): PASS

This command will be available in chat with `/module12-export-share-pack`.

