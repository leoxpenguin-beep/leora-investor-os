# Data Contracts

Canonical schema and usage for Leora Investor OS. All displayed values are stored only (no derived computations).

Explicitly forbidden in code/SQL/UI/LLM outputs:
- Any derived metric math (ratios, deltas, growth %, totals/averages/rollups)
- Any IRR/MOIC calculations (store snapshot values as `value_text` if needed; never compute)

## Tables

### `public.snapshots`

Snapshot rows are **monthly** or **project** snapshots (no derived metrics).

| Column          | Type           | Description |
|----------------|----------------|-------------|
| `id`           | uuid (PK)      | Snapshot identifier |
| `investor_id`  | uuid (FK)      | Owner (`auth.users.id`). **RLS:** `SELECT` only where `auth.uid() = investor_id` |
| `snapshot_kind` | text          | `monthly` \| `project` |
| `snapshot_month` | date         | Month bucket (use first day of month convention) |
| `project_key`  | text           | Required when `snapshot_kind = 'project'` (stable project/company identifier) |
| `created_at`   | timestamptz    | When the snapshot was created |
| `label`        | text           | Optional label |

- **Uniqueness**:
  - One monthly snapshot per `(investor_id, snapshot_month)`
  - One project snapshot per `(investor_id, project_key, snapshot_month)`

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
- **RLS:** `SELECT` only when the owning snapshot is visible to the user (owner-only via `snapshots.investor_id`).
- **Source allowlist:** `source_page` is constrained to `06, 07, 08, 09, 10, 11, 18, 19, 21`.

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

### `public.snapshot_sources`
| Column         | Type      | Description                          |
|----------------|-----------|--------------------------------------|
| `id`           | uuid (PK) | Row id                               |
| `snapshot_id`  | uuid (FK) | References `snapshots.id`            |
| `source_type`  | text      | **Display-only** source type label   |
| `title`        | text      | **Display-only** document title      |
| `url`          | text      | **Display-only** URL (optional)      |
| `note`         | text      | **Display-only** note (verbatim; optional) |
| `created_at`   | timestamptz | Set on insert                     |

- **RLS:** `SELECT` only when the owning snapshot is visible to the user (owner-only via `snapshots.investor_id`).
- No INSERT/UPDATE/DELETE from app; writes via server scripts with SERVICE ROLE.

### `public.snapshot_timeline_events`
| Column         | Type      | Description                          |
|----------------|-----------|--------------------------------------|
| `id`           | uuid (PK) | Row id                               |
| `snapshot_id`  | uuid (FK) | References `snapshots.id`            |
| `event_key`    | text      | Display-only event identifier        |
| `event_date`   | date      | Display-only event date (optional)   |
| `title`        | text      | Display-only event title             |
| `detail`       | text      | Display-only event detail (verbatim) |
| `source_page`  | text      | Notion source page (allowlist only)  |
| `created_at`   | timestamptz | Set on insert                     |

- Unique on `(snapshot_id, event_key)`.
- **RLS:** `SELECT` only when the owning snapshot is visible to the user (owner-only via `snapshots.investor_id`).
- **Source allowlist:** `source_page` is constrained to `06, 07, 08, 09, 10, 11, 18, 19, 21`.
- No INSERT/UPDATE/DELETE from app; writes via server scripts with SERVICE ROLE.

## Access

- **App (reads):** Supabase **anon** key + authenticated user session. All reads are **SELECT-only** and subject to RLS:
  - `snapshots`: owner-only (`auth.uid() = investor_id`)
  - `metric_values`: owner-only via snapshot ownership
  - `investor_positions`: owner-only (`auth.uid() = investor_id`)
  - `snapshot_sources`: owner-only via snapshot ownership
  - `snapshot_timeline_events`: owner-only via snapshot ownership
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

export type SnapshotKind = "monthly" | "project";

export type Snapshot = {
  id: string;
  investor_id: string;
  snapshot_kind: SnapshotKind;
  snapshot_month: string; // date ISO string (YYYY-MM-DD)
  project_key: string | null;
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

export type SnapshotSource = {
  source_type: string;
  title: string;
  url: string | null;
  note: string | null;
};

export type SnapshotTimelineEvent = {
  event_key: string;
  event_date: string | null; // date ISO string (YYYY-MM-DD) or null
  title: string | null;
  detail: string | null;
  source_page: SourcePage;
  created_at: string; // timestamptz ISO string
};
```

### Read operations (minimum set)

- **List snapshots**
  - Input: `limit` (default 50)
  - Output: `Snapshot[]` (ordered by `created_at desc`)
  - SQL:

```sql
select id, investor_id, snapshot_kind, snapshot_month, project_key, created_at, label
from public.snapshots
order by snapshot_month desc, created_at desc
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

- **List snapshot sources (documents)**
  - Input: `snapshot_id`
  - Output: `SnapshotSource[]` (display-only rows)
  - SQL:

```sql
select source_type, title, url, note
from public.snapshot_sources
where snapshot_id = :snapshot_id
order by created_at desc, title asc;
```

- **List snapshot timeline events**
  - Input: `snapshot_id`
  - Output: `SnapshotTimelineEvent[]` (display-only rows)
  - SQL:

```sql
select event_key, event_date, title, detail, source_page, created_at
from public.snapshot_timeline_events
where snapshot_id = :snapshot_id
order by event_date desc nulls last, created_at desc, event_key asc;
```

### Supabase RPCs (preferred, RLS-respecting)

These RPCs are **read-only** and **SECURITY INVOKER** (they do not bypass RLS). They return raw rows and display-only strings — no aggregation, rollups, or math.

- **`rpc_list_snapshots` → `Snapshot[]`**
  - Inputs: `p_snapshot_kind?`, `p_snapshot_month?`, `p_project_key?`, `p_limit?`
  - Returns: raw snapshot rows visible under RLS.

- **`rpc_list_metric_values` → `MetricValue[]`**
  - Input: `p_snapshot_id`
  - Returns: `metric_key` + display-only `value_text` rows for that snapshot (visible under RLS).

- **`rpc_get_investor_position` → `InvestorPosition[]`**
  - Input: `p_snapshot_id`
  - Returns: 0–1 display-only position rows for the **current user** (`auth.uid()`), including `summary_text` and `narrative_text` (visible under RLS).

- **`rpc_list_snapshot_sources` → `SnapshotSource[]`**
  - Input: `p_snapshot_id`
  - Returns: display-only `source_type`, `title`, `url`, `note` rows for that snapshot (visible under RLS).

- **`rpc_list_snapshot_timeline_events` → `SnapshotTimelineEvent[]`**
  - Input: `p_snapshot_id`
  - Returns: display-only `event_key`, `event_date`, `title`, `detail`, `source_page` rows for that snapshot (visible under RLS).

Example (Supabase JS):

```ts
// List monthly snapshots (owner-only via RLS)
const { data: snapshots } = await supabase.rpc("rpc_list_snapshots", {
  p_snapshot_kind: "monthly",
  p_limit: 50,
});

// List metric values for a snapshot (owner-only via RLS)
const { data: metricValues } = await supabase.rpc("rpc_list_metric_values", {
  p_snapshot_id: snapshots?.[0]?.id,
});

// Get the current investor's position text for a snapshot (owner-only via RLS)
const { data: investorPositionRows } = await supabase.rpc("rpc_get_investor_position", {
  p_snapshot_id: snapshots?.[0]?.id,
});

// List snapshot sources/documents for a snapshot (owner-only via RLS)
const { data: snapshotSources } = await supabase.rpc("rpc_list_snapshot_sources", {
  p_snapshot_id: snapshots?.[0]?.id,
});
```

## Edge Functions (read-only)

### `ask_leo_v1` — Ask Leo (Snapshot-Scoped Intelligence v1)

This edge function is **grounded retrieval + formatting only**. It must never compute derived metrics or provide investment advice.

- **Invocation**: `supabase.functions.invoke("ask_leo_v1", { body })`
- **Auth**: should require a valid user JWT (owner-scoped app usage)
- **Inputs**:
  - `question` (string)
  - `snapshotContext` (strings-only; built client-side from read-only RPCs)

`snapshotContext` should be assembled using:
- `rpc_list_metric_values(p_snapshot_id)`
- `rpc_get_investor_position(p_snapshot_id)`
- `rpc_list_snapshot_sources(p_snapshot_id)`

#### Request (TypeScript-style)

```ts
export type AskLeoV1Request = {
  question: string;
  snapshotContext: {
    snapshot_id: string;
    snapshot_month: string;
    snapshot_kind: string;
    project_key: string;
    created_at: string;
    label: string;
    investor_position: { summary_text: string; narrative_text: string };
    metric_values: Array<{ metric_key: string; value_text: string; source_page: string; created_at: string }>;
    snapshot_sources: Array<{ source_type: string; title: string; url: string; note: string }>;
  };
};
```

#### Response (TypeScript-style)

```ts
export type AskLeoV1Response = {
  answerText: string;
  citations: Array<{ title: string; url: string | null }>;
  evidenceUsed: string[];
  notAvailable: string[];
};
```

#### Guardrails (function-level)

- Answer **only** from `snapshotContext`
- If missing: return **"Not available in this snapshot."**
- No calculations / derived metrics / deltas / projections
- No predictions or investment advice

### `ask-leo-v1` — Ask Leo v1 (Edge, JWT + rate limit)

This edge function is **grounded retrieval + formatting only**. It must never compute derived metrics or provide investment advice.

- **Invocation**: `supabase.functions.invoke("ask-leo-v1", { body })`
- **Auth**: **requires** a valid user JWT via `Authorization: Bearer <token>`
  - Missing/invalid → `401`
- **Rate limit**: best-effort in-memory throttle (per function instance)
  - Exceeded → `429`
- **Inputs**:
  - `question` (string)
  - `snapshotContext` (strings-only; built client-side from read-only RPCs)
  - `activeSnapshot` (optional snapshot metadata; display-only)

`snapshotContext` should be assembled using:
- `rpc_list_metric_values(p_snapshot_id)`
- `rpc_get_investor_position(p_snapshot_id)`
- `rpc_list_snapshot_sources(p_snapshot_id)`

#### Request (TypeScript-style)

```ts
export type AskLeoEdgeRequest = {
  question: string;
  snapshotContext: {
    snapshot_id: string;
    snapshot_month: string;
    snapshot_kind: string;
    project_key: string;
    created_at: string;
    label: string;
    investor_position: { summary_text: string; narrative_text: string };
    metric_values: Array<{ metric_key: string; value_text: string }>;
    snapshot_sources: Array<{ source_type: string; title: string; url: string; note: string }>;
  };
  activeSnapshot?: {
    snapshot_month?: string | null;
    snapshot_kind?: string | null;
    project_key?: string | null;
    created_at?: string | null;
    label?: string | null;
  };
};
```

#### Response (TypeScript-style)

```ts
export type AskLeoEdgeResponse = {
  answerText: string;
  evidence: {
    metrics_used: string[];
    sources_used: Array<{ title: string; url: string }>;
  };
};
```

#### Example invoke (Supabase JS)

```ts
const { data, error } = await supabase.functions.invoke("ask-leo-v1", {
  body: {
    question,
    snapshotContext,
    activeSnapshot: {
      snapshot_month: selectedSnapshot?.snapshot_month ?? null,
      snapshot_kind: selectedSnapshot?.snapshot_kind ?? null,
      project_key: selectedSnapshot?.project_key ?? null,
      created_at: selectedSnapshot?.created_at ?? null,
      label: selectedSnapshot?.label ?? null,
    },
  },
});
```

#### Guardrails (function-level)

- Answer **only** from `snapshotContext`
- If missing: return **"Not available in this snapshot."**
- No calculations / derived metrics / deltas / projections
- No predictions or investment advice
- No DB writes

