# Guardrails

These are **non-negotiables** for Leora Investor OS. PRs that violate these must be blocked.

Canonical contracts live in `docs/DATA_CONTRACTS.md`. Build sequencing lives in `docs/MASTER_BUILD_PLAN.md`.

## Logic Lock (no derived metrics, no finance calculations)

- **Do not compute** any financial metrics/KPIs anywhere (UI, backend, scripts, docs, tests, or AI outputs).
- **Display-only**:
  - Use `public.metric_values.value_text` for metrics (display-only stored value).
  - Use `public.investor_positions.summary_text` / `narrative_text` for narratives (display-only stored text).
- **Missing values**:
  - Render `"—"` and add a TODO nearby. Never invent numbers.

Examples that must be **blocked** (non-exhaustive):
- Ratios, deltas, growth %, margins, run-rate math, runway math
- Totals/averages/rollups computed from multiple stored values
- “Helpful” normalization or conversions that change meaning (even if “just formatting”)

Allowed:
- Fetching, selecting, and rendering stored `value_text`
- Sorting/filtering data without computing new numeric results
- UI formatting that does not change the value (e.g., truncation, wrapping)

## Read-only app (Supabase)

- **Client/app**:
  - Uses Supabase **anon** key.
  - **SELECT only**.
  - No INSERT/UPDATE/UPSERT/DELETE and no mutating RPC calls.
- **Writes**:
  - Only via **server-side scripts** using the **SERVICE ROLE** key.
  - Service role key must never be exposed/imported/bundled into client code.
- RLS expectations and table access are defined in `docs/DATA_CONTRACTS.md`.

## Notion sources (allowlist only)

Allowed `source_page` values (V1): **06, 07, 08, 09, 10, 11, 18, 19, 21**.

- Block any ingestion or schema changes that introduce other sources.
- Any new metric/value must trace to:
  - `metric_key`
  - `value_text`
  - allowlisted `source_page`

## Locked copy

- Do not rewrite narratives/Q&A/copy.
- Only use exact text from `docs/LOCKED_COPY.md`.
- If needed copy is missing, use `"—"` and add a TODO to request adding it to `docs/LOCKED_COPY.md`.

## No unsupported operational KPI dashboards (Option A)

Block dashboards/tiles for unsupported operational KPIs, including (non-exhaustive):
- error rate
- design speed
- rework %
- design-to-production time

Also block any market-beating delivery claims or “performance scoreboards” that are not backed by stored display-only values under the contract.

## LeoX (structural narrative only)

“LeoX” is allowed only as **structure** (section framing / narrative scaffolding).

- Block any attempt to turn LeoX into:
  - a KPI set
  - a scorecard
  - computed summaries
  - operational performance claims

## PR review gate (copy/paste into reviews)

- No derived metrics / finance calculations anywhere.
- Client uses anon key and is SELECT-only.
- Writes exist only in service-role scripts (not imported by client).
- Display values are `value_text` / display-only fields; missing values render `"—"` + TODO.
- `source_page` is allowlisted (06,07,08,09,10,11,18,19,21).
- No unsupported operational KPI dashboards/tiles; LeoX narrative-only.
- Work matches the next module in `docs/MASTER_BUILD_PLAN.md`.
