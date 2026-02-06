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

## Read API contract (SELECT-only)

This project’s read layer is **retrieval-only**. Clients must not compute, infer, or derive any new metric values. All UI rendering must display stored snapshot strings (`value_text` / display-only text fields), or render `"—"` with a TODO if missing.

### Type shapes (TypeScript-style)

```ts
export type SourcePage =
  | "06"
  | "07"
  | "08"
  | "09"
  | "10"
  | "11"
  | "18"
  | "19"
  | "21";

export type Snapshot = {
  id: string;
  created_at: string; // timestamptz ISO string
  label: string | null;
};

export type MetricValue = {
  snapshot_id: string;
  metric_key: string;
  value_text: string;
  source_page: SourcePage;
  created_at: string; // timestamptz ISO string
};

export type InvestorPosition = {
  investor_id: string;
  snapshot_id: string;
  summary_text: string | null;
  narrative_text: string | null;
  created_at: string; // timestamptz ISO string
  updated_at: string; // timestamptz ISO string
};
```

### Read operations (minimum set)

- **List snapshots**
  - Input: `limit` (default 50)
  - Output: `Snapshot[]` (ordered by `created_at desc`)
  - SQL:

```sql
select id, created_at, label
from public.snapshots
order by created_at desc
limit 50;
```

- **Get metrics for a snapshot**
  - Input: `snapshot_id`
  - Output: `MetricValue[]` (recommended ordering: `metric_key asc`)
  - SQL:

```sql
select snapshot_id, metric_key, value_text, source_page, created_at
from public.metric_values
where snapshot_id = :snapshot_id
order by metric_key asc;
```

- **Get investor’s position text for a snapshot (RLS owner-only)**
  - Input: `snapshot_id`
  - Output: `InvestorPosition | null`
  - Notes:
    - App/client must use the authenticated user’s session (RLS enforces `auth.uid() = investor_id`).
    - Do not “summarize” or rewrite these fields in code; display verbatim.
  - SQL:

```sql
select investor_id, snapshot_id, summary_text, narrative_text, created_at, updated_at
from public.investor_positions
where snapshot_id = :snapshot_id;
```
