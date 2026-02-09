-- Leora Investor OS — Initial schema (read-only investor app)
-- All displayed values are stored only; no derived computations.
-- Writes: server scripts with SERVICE ROLE only. App: anon key, SELECT only.

-- Snapshot: point-in-time container for metrics and positions
create table if not exists public.snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  label text
);

-- Metric values: display-only, one row per (snapshot, metric_key). source_page = Notion page (06,07,08,09,10,11,18,19,21).
create table if not exists public.metric_values (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.snapshots(id) on delete cascade,
  metric_key text not null,
  value_text text not null,
  source_page text not null,
  created_at timestamptz not null default now(),
  unique(snapshot_id, metric_key)
);

create index if not exists idx_metric_values_snapshot_id on public.metric_values(snapshot_id);
create index if not exists idx_metric_values_metric_key on public.metric_values(metric_key);

-- Investor positions: per-investor, per-snapshot. *_text columns are display-only. RLS restricts to own rows.
create table if not exists public.investor_positions (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null references auth.users(id) on delete cascade,
  snapshot_id uuid not null references public.snapshots(id) on delete cascade,
  summary_text text,
  narrative_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(investor_id, snapshot_id)
);

create index if not exists idx_investor_positions_investor_id on public.investor_positions(investor_id);
create index if not exists idx_investor_positions_snapshot_id on public.investor_positions(snapshot_id);

-- RLS: enable
alter table public.snapshots enable row level security;
alter table public.metric_values enable row level security;
alter table public.investor_positions enable row level security;

-- Snapshots: readable by authenticated (anon can read if you prefer; adjust policy as needed)
create policy "Allow read snapshots"
  on public.snapshots for select
  using (true);

-- Metric values: readable by all (anon key can SELECT)
create policy "Allow read metric_values"
  on public.metric_values for select
  using (true);

-- Investor positions: investors can only read their own rows
create policy "Investors read own positions"
  on public.investor_positions for select
  using (auth.uid() = investor_id);

-- No INSERT/UPDATE/DELETE policies for app role: writes only via service role in server scripts.
-- Optional: revoke direct write from anon/authenticated if you use a single role; service role bypasses RLS.

comment on table public.snapshots is 'Point-in-time snapshot for metrics and positions; read-only in app.';
comment on table public.metric_values is 'Display-only metric values: metric_key, value_text, source_page (Notion page id).';
comment on table public.investor_positions is 'Per-investor display text; RLS restricts SELECT to auth.uid() = investor_id.';
