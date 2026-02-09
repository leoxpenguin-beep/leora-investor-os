# module8-documents-sources

Implement **Module 8 — Documents & Sources** for Leora Investor OS.

## Goal

Create a new Expo screen **“Documents & Sources”** that shows snapshot-linked source documents for the currently active snapshot (`selectedSnapshot`).

## Hard guardrails (non‑negotiable)

- **No derived metrics / no finance calculations** (no IRR/MOIC/WACC, deltas, ratios, totals, rollups).
- **Supabase read-only**: use **SECURITY INVOKER** RPCs via `supabase.rpc` only. No writes, no service role key in client.
- **Copy lock**: do not rewrite notes/copy. Display verbatim from DB, or `"—"` when missing/empty.
- **No KPI dashboards/tiles**: this screen shows only display-only document metadata.
- **No ingestion or mutation paths**: no uploads, no edits, no write APIs.

## Data contract

- Use existing RPC if present; otherwise add **SECURITY INVOKER** RPC:
  - `rpc_list_snapshot_sources(p_snapshot_id uuid)`
- Returned fields must be display-only:
  - `source_type`
  - `title`
  - `url`
  - `note` (verbatim; fallback `"—"`)

## UI requirements

- New screen component: `DocumentsSourcesScreen`
- Render a list of source cards showing:
  - title
  - source_type badge
  - optional note (or `"—"`)
  - “Open” external link/button (disabled if missing url)

## Navigation

- Uses existing active snapshot state (`selectedSnapshot`).
- Accessible from **Snapshot Detail** via a “Documents & Sources” action.

## Guardrails self-check (must PASS before PR)

- No calculations / derived metrics: PASS
- supabase.rpc only (SECURITY INVOKER; no writes; no service role in client): PASS
- Copy lock respected (note verbatim or `"—"`): PASS
- No ingestion/mutation UI or APIs: PASS

This command will be available in chat with /module8-documents-sources

