# Snapshot ingest skeleton (Module 1)

This file is a **skeleton** for the future Module 1 service-role ingest scripts.

Hard rules:
- **SERVICE ROLE only**. Never use the service role key in client/app code.
- **No math / no derived metrics**. Scripts must only copy display-ready strings into:
  - `public.metric_values.value_text`
  - `public.investor_positions.summary_text` / `narrative_text`
- **Allowlisted sources only**: `06`, `07`, `08`, `09`, `10`, `11`, `18`, `19`, `21`

## Inputs (suggested shape)

- `investor_id`: owner (`auth.users.id`) — required
- `snapshot_kind`: `"monthly"` or `"project"` — required
- `snapshot_month`: month bucket (use first day of month convention) — required
- `project_key`: required only when `snapshot_kind = "project"`
- `label`: optional snapshot label
- `metrics[]`: each row must contain `metric_key`, `value_text`, `source_page`
- Optional `positions[]`: each row must contain `investor_id`, `summary_text`, `narrative_text`

Example (JSON):

```json
{
  "investor_id": "00000000-0000-0000-0000-000000000000",
  "snapshot_kind": "monthly",
  "snapshot_month": "2025-12-01",
  "label": "Dec 2025",
  "metrics": [
    { "metric_key": "revenue", "value_text": "—", "source_page": "06" }
  ],
  "positions": [
    {
      "investor_id": "00000000-0000-0000-0000-000000000000",
      "summary_text": "—",
      "narrative_text": "—"
    }
  ]
}
```

## Algorithm (copy-only)

1. Validate env:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. Validate inputs:
   - `source_page` is one of: `06, 07, 08, 09, 10, 11, 18, 19, 21`
   - `value_text` is present (string)
   - No numeric parsing/conversion is performed.
3. Insert a row into `public.snapshots` (capture returned `snapshot_id`):
   - `investor_id`, `snapshot_kind`, `snapshot_month`, `project_key` (if applicable), `label`
4. Insert `metrics[]` into `public.metric_values` using `snapshot_id`:
   - `metric_key`, `value_text`, `source_page`
   - Prefer idempotent behavior (upsert by `(snapshot_id, metric_key)`).
5. Optionally upsert `positions[]` into `public.investor_positions` by `(investor_id, snapshot_id)`:
   - Store only display text. Do not rewrite or summarize.

## Non-goals

- No totals, deltas, growth %, margins, runway math, or rollups.
- No IRR/MOIC math (store snapshot strings as `value_text` if present).
- No derived KPIs (error rate, rework %, design-to-production time, etc.).
