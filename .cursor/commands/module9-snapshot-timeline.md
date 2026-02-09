# module9-snapshot-timeline

Implement **Module 9 — Snapshot Timeline** for Leora Investor OS.

## Goal

Create a new Expo screen **“Snapshot Timeline”** that shows display-only timeline events for the currently active snapshot (`selectedSnapshot`).

## Hard guardrails (non‑negotiable)

- **No derived metrics / no finance calculations** (no IRR/MOIC/WACC, deltas, ratios, totals, rollups).
- **Supabase read-only**: use **SECURITY INVOKER** RPCs via `supabase.rpc` only. No writes, no service role key in client.
- **Copy lock**: do not rewrite notes/copy. Display verbatim from DB, or `"—"` when missing/empty.
- **No KPI dashboards/tiles**: this screen shows only display-only timeline events.

## Data contract

- Use existing RPC if present; otherwise add **SECURITY INVOKER** RPC:
  - `rpc_list_snapshot_timeline_events(p_snapshot_id uuid)`
- Returned fields must be display-only:
  - `event_key`
  - `event_date`
  - `title`
  - `detail`
  - `source_page`

## UI requirements

- New screen component: `SnapshotTimelineScreen`
- Render a list of timeline event cards showing:
  - `event_date`
  - `title`
  - `detail`
  - `source_page` badge
- Fallback to `"—"` for missing/empty strings.

## Navigation

- Uses existing active snapshot state (`selectedSnapshot`).
- Accessible from **Snapshot Detail** via a “Snapshot Timeline” action.

## Guardrails self-check (must PASS before PR)

- No calculations / derived metrics: PASS
- supabase.rpc only (SECURITY INVOKER; no writes; no service role in client): PASS
- Copy lock respected (verbatim or `"—"` fallback): PASS
- No KPI dashboards/tiles added: PASS

This command will be available in chat with /module9-snapshot-timeline
