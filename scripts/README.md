# Server scripts (SERVICE ROLE only)

All **writes** to Supabase (snapshot ingest, investor position upsert, etc.) must run in server-side scripts using the **SERVICE ROLE** key. The app never writes; it only SELECTs with the anon key.

## Usage

- Do **not** use the service role key in the frontend or in client-side code.
- Run these scripts from a secure environment (CI, cron, or trusted backend).
- Example env for scripts: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

## Placeholder

Scripts (e.g. `ingest_snapshot.js` or `sync_notion_metrics.ts`) will be added here in a later module. Each script must:

1. Use only the SERVICE ROLE key for Supabase client.
2. Write only to `snapshots`, `metric_values`, `investor_positions` per DATA_CONTRACTS.
3. Populate `metric_key`, `value_text`, `source_page` (and `snapshot_id`) for every metric row.

See `scripts/ingest_snapshot_skeleton.md` for a copy-only ingest skeleton (no math, allowlisted sources only).

## Module 21 helper

- `scripts/module21_seed_for_user.sql`: optional manual seed helper for local/testing environments where migration-time `auth.uid()` is unknown.
