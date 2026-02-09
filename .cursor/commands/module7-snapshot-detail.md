# module7-snapshot-detail

Implement **Module 7**: Expo screen **“Snapshot Detail”** for the currently active snapshot (`selectedSnapshot`).

## Scope

- Add a new screen that combines:
  1) **My Position** (`summary_text`, `narrative_text` — display-only)
  2) **Value** (`metric_key`, `value_text` — display-only)

## Non‑negotiable constraints (HARD GUARDRAILS)

- **No derived metrics / no finance calculations**: never compute or infer anything (no IRR/MOIC/WACC, deltas, ratios, totals, rollups).
- **Supabase read-only**: client uses **SECURITY INVOKER** RPCs via `supabase.rpc` only (no table writes; no service role key).
- **Copy lock**: do not rewrite narrative/copy. Display verbatim from DB, or `"—"` if missing/empty.
- **No KPI dashboards/tiles**: only list raw `(metric_key, value_text)` strings.

## Required data sources (reuse existing RPCs)

- `rpc_list_metric_values(p_snapshot_id uuid)`
- `rpc_get_investor_position(p_snapshot_id uuid)`
- Do **not** add migrations unless absolutely required.

## UI requirements

- Screen title: **Snapshot Detail**
- Header card: `snapshot_month` + `snapshot_kind` + `project_key` (or `"—"`)
- Section 1: **My Position**
  - render `summary_text` verbatim (or `"—"`)
  - render `narrative_text` verbatim (or `"—"`)
- Section 2: **Value**
  - list `(metric_key, value_text)` with `"—"` fallback
  - if keys contain a simple prefix split (e.g. `value.*`, `cap_table.*`), group by prefix; otherwise show a flat list

## Navigation requirements

- Add shell route: `snapshot_detail`
- Reachable from:
  - Snapshot selector modal button: **Open Snapshot Detail**
  - Value (Multiple Snapshots): tapping a snapshot row sets active snapshot and opens Snapshot Detail

## Guardrails self-check (must PASS before PR)

- No derived metrics / finance math: PASS
- Supabase read-only via `supabase.rpc`: PASS
- Copy lock respected (`summary_text`/`narrative_text` verbatim; `"—"` fallback): PASS
- No operational KPI dashboards/tiles added: PASS

This command will be available in chat with /module7-snapshot-detail

