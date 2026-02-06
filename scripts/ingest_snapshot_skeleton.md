# Snapshot ingest skeleton (Module 1)

This file is a **skeleton** for the future Module 1 service-role ingest scripts.

Hard rules:
- **SERVICE ROLE only**. Never use the service role key in client/app code.
- **No math / no derived metrics**. Scripts must only copy display-ready strings into:
  - `public.metric_values.value_text`
  - `public.investor_positions.summary_text` / `narrative_text`
- **Allowlisted sources only**: `06`, `07`, `08`, `09`, `10`, `11`, `18`, `19`, `21`

## Inputs (suggested shape)

- `label`: optional snapshot label
- `metrics[]`: each row must contain `metric_key`, `value_text`, `source_page`
- Optional `positions[]`: each row must contain `investor_id`, `summary_text`, `narrative_text`

Example (JSON):

```json
{
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
3. Insert a row into `public.snapshots` (capture returned `snapshot_id`).
4. Insert `metrics[]` into `public.metric_values` using `snapshot_id`:
   - `metric_key`, `value_text`, `source_page`
   - Prefer idempotent behavior (upsert by `(snapshot_id, metric_key)`).
5. Optionally upsert `positions[]` into `public.investor_positions` by `(investor_id, snapshot_id)`:
   - Store only display text. Do not rewrite or summarize.

## Non-goals

- No totals, deltas, growth %, margins, runway math, or rollups.
- No derived KPIs (error rate, rework %, design-to-production time, etc.).
