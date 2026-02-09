# Master Build Plan

Source of truth for **module ordering** and scope boundaries. The Architecture Lead blocks work that skips modules or violates global constraints.

## Global constraints (apply to every module)

- **Logic Lock (no finance calculations)**: never compute/derive/infer any financial metrics or KPIs in UI, code, docs, tests, or AI outputs. Display only stored `value_text` / display-only text fields per `docs/DATA_CONTRACTS.md`.
- **Read-only app**: client/app code is **Supabase SELECT-only** using the **anon** key. Writes are allowed only via **service-role server scripts**.
- **Allowed Notion sources**: pages **06, 07, 08, 09, 10, 11, 18, 19, 21** only (see `docs/DATA_CONTRACTS.md`).
- **Locked copy**: UI copy must be verbatim from `docs/LOCKED_COPY.md`. If missing, render `"—"` + add a TODO (do not invent).
- **Option A (product integrity)**:
  - Remove/reject unsupported operational KPI dashboards/tiles (error rate, design speed, rework %, design-to-production time, etc.).
  - “LeoX” is **structural narrative only** (section framing). No scorecards, KPIs, computed values, or operational performance claims.

## Modular build order (V1)

### Module 0 — Backend foundation (Supabase schema + RLS + contracts)

- **Goal**: establish a snapshot-based, read-only data model and security posture.
- **Primary artifacts**: `supabase/migrations/*`, `docs/DATA_CONTRACTS.md`, `.env.example`.
- **Definition of done**:
  - Tables and RLS exist for `snapshots`, `metric_values`, `investor_positions`.
  - App-facing policies are SELECT-only; no app write paths are introduced.
  - Data contract clearly states `metric_key` + `value_text` + `source_page` allowlist.

### Module 1 — Service-role ingest scripts (writes live here, nowhere else)

- **Goal**: create the only permitted write path: secure server scripts that populate snapshots and display-only values.
- **Primary artifacts**: `scripts/*` (SERVICE ROLE only), `scripts/README.md`.
- **Requirements**:
  - Validate `source_page` against the allowlist (06,07,08,09,10,11,18,19,21).
  - Store values as `value_text` / display-only text fields; do not compute.
  - Scripts are idempotent and safe to re-run (upsert by `(snapshot_id, metric_key)` where applicable).
- **Definition of done**:
  - A script can create a new snapshot and populate `metric_values` (and optional `investor_positions`) without any client involvement.

### Module 2 — Read-only data access layer (client/app)

- **Goal**: provide a small, auditable read layer that the app uses for all SELECTs.
- **Primary artifacts**: app/client folder (to be introduced), plus a tiny query library (e.g., `lib/supabase/*`).
- **Requirements**:
  - SELECT-only queries for `snapshots`, `metric_values`, and user-scoped `investor_positions`.
  - No mutating calls, no service role key usage, no derived metrics.
- **Definition of done**:
  - App can list snapshots and read `value_text` and narrative fields with strict contracts.

### Module 3 — App shell (Orbit + Cockpit) + navigation primitives

- **Goal**: build the “Cursor IDE style” shell and navigation without depending on computed metrics.
- **Primary artifacts**: UI app code (framework chosen per project conventions).
- **Requirements**:
  - Any missing data displays as `"—"` with a TODO (no invented values).
  - Copy is pulled verbatim from `docs/LOCKED_COPY.md` (or `"—"` + TODO).
- **Definition of done**:
  - Shell renders, navigation works, and data can be displayed in a contract-compliant way.

### Module 4 — Investor narrative views + LeoX structure (no KPIs)

- **Goal**: render investor positions and narratives as display-only text.
- **Primary artifacts**: UI screens for `investor_positions` and narrative sections.
- **Requirements**:
  - LeoX is structure/section framing only; no scorecards/tiles/KPIs.
  - No operational KPI dashboards/tiles are introduced.
- **Definition of done**:
  - Investor can view `summary_text` / `narrative_text` for a snapshot under RLS.

### Module 5 — Hardening (security, performance, release gates)

- **Goal**: lock integrity: enforce guardrails in code review and CI where possible.
- **Primary artifacts**: linting/test gates, docs, and deployment/security checklists.
- **Definition of done**:
  - Clear PR review gates exist for: no derived metrics, read-only client, allowlisted sources, locked copy, and no unsupported operational KPIs.

### Module 6 — Value (Multiple Snapshots)

- **Goal**: show multiple snapshots side-by-side as display-only rows (no calculations).
- **Primary artifacts**: `ValueMultiSnapshotsScreen`, `rpc_list_snapshots`, `rpc_list_metric_values`.
- **Requirements**:
  - List snapshots (owner-only via RLS) and allow selecting the active snapshot.
  - Optional expand to view `metric_key` + `value_text` (display-only).
  - No deltas, totals, ratios, or rollups.
- **Definition of done**:
  - Investors can browse snapshots and view stored `value_text` strings without computation.

### Module 7 — Snapshot Detail

- **Goal**: provide a single snapshot view that combines `investor_positions` + `metric_values`.
- **Primary artifacts**: `SnapshotDetailScreen`, `rpc_get_investor_position`, `rpc_list_metric_values`.
- **Requirements**:
  - Display `summary_text` / `narrative_text` verbatim (or `"—"`).
  - Display `metric_key` + `value_text` only; group by prefix if present.
- **Definition of done**:
  - Snapshot detail renders position + value sections with display-only data.

### Module 8 — Documents & Sources

- **Goal**: show snapshot-linked source documents as display-only rows.
- **Primary artifacts**: `snapshot_sources` table, `rpc_list_snapshot_sources`, `DocumentsSourcesScreen`.
- **Requirements**:
  - Display `source_type`, `title`, `note`, and optional `url` (no edits/uploads).
  - Strict owner-only reads via RLS; no app writes.
- **Definition of done**:
  - Investors can open a snapshot’s sources list (read-only).

### Module 9 — Snapshot Timeline

- **Goal**: show a display-only timeline of events linked to a snapshot.
- **Primary artifacts**: `snapshot_timeline_events` table, `rpc_list_snapshot_timeline_events`, `SnapshotTimelineScreen`.
- **Requirements**:
  - Display `event_date`, `title`, `detail`, and `source_page` verbatim (or `"—"`).
  - No derived metrics or calculations; owner-only reads via RLS.
- **Definition of done**:
  - Timeline renders for the active snapshot and is reachable from Snapshot Detail.

## Explicitly out of scope (BLOCK)

- Any finance calculations / derived metrics in UI or AI outputs.
- Any client-side Supabase writes (INSERT/UPDATE/UPSERT/DELETE) or mutating RPC usage.
- Any new metric without `metric_key` + `value_text` + allowlisted `source_page`.
- Unsupported operational KPI dashboards/tiles; LeoX turning into a scorecard system.
