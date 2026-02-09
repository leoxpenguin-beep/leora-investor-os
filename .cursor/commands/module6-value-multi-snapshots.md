# module6-value-multi-snapshots

Implement **Module 6**: Expo screen **“Value (Multiple Snapshots)”**.

Requirements:
- Read-only Supabase calls only (client uses **anon** key + `supabase.rpc`; no service role).
- Use `rpc_list_snapshots` to list snapshots.
- For each snapshot, render:
  - `snapshot_month`
  - `snapshot_kind`
  - optional `project_key`
- Optional: expand a snapshot row to load `rpc_list_metric_values(snapshot_id)` and render:
  - `metric_key`
  - `value_text` exactly as stored (use `"—"` when missing)
- Reuse the existing **active snapshot** state; selecting a row sets it active.
- Do not compute/derive any metrics; no deltas, ratios, totals, or rollups.

This command will be available in chat with /module6-value-multi-snapshots

