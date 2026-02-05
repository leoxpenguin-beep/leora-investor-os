# Data Contracts

Canonical schema and usage for Leora Investor OS. All displayed values are stored only (no derived computations).

## Tables

### `public.snapshots`
| Column      | Type      | Description                    |
|------------|-----------|--------------------------------|
| `id`       | uuid (PK) | Snapshot identifier            |
| `created_at` | timestamptz | When the snapshot was created |
| `label`    | text      | Optional label                 |

### `public.metric_values`
| Column       | Type      | Description                          |
|-------------|-----------|--------------------------------------|
| `id`        | uuid (PK) | Row id                               |
| `snapshot_id` | uuid (FK) | References `snapshots.id`          |
| `metric_key`  | text     | Metric identifier (e.g. `revenue`, `runway`) |
| `value_text`  | text     | **Display-only** stored value        |
| `source_page` | text     | Notion source page (06, 07, 08, 09, 10, 11, 18, 19, 21 only) |
| `created_at`  | timestamptz | Set on insert                    |

- Unique on `(snapshot_id, metric_key)`.
- **Definition of done:** Every displayed value traces to `metric_key` + `snapshot_id` + `source_page`.

### `public.investor_positions`
| Column         | Type      | Description                          |
|----------------|-----------|--------------------------------------|
| `id`           | uuid (PK) | Row id                               |
| `investor_id`  | uuid (FK) | References `auth.users.id`           |
| `snapshot_id`  | uuid (FK) | References `snapshots.id`            |
| `summary_text` | text      | **Display-only** summary             |
| `narrative_text` | text    | **Display-only** narrative           |
| `created_at`   | timestamptz | Set on insert                     |
| `updated_at`   | timestamptz | Set on insert/update               |

- Unique on `(investor_id, snapshot_id)`.
- **RLS:** `SELECT` only where `auth.uid() = investor_id`. No INSERT/UPDATE/DELETE from app; writes via server scripts with SERVICE ROLE.

## Access

- **App (reads):** Supabase **anon** key. SELECT only on `snapshots`, `metric_values`, and (via RLS) own rows in `investor_positions`.
- **Writes:** **SERVICE ROLE** key only in server-side scripts (e.g. snapshot ingest, position upsert). Never expose service role to the client.

## Notion source pages (V1)

Allowed `source_page` values: `06`, `07`, `08`, `09`, `10`, `11`, `18`, `19`, `21`. No other sources.
