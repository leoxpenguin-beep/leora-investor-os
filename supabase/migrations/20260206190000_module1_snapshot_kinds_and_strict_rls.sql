-- Module 1 — Snapshots: monthly + project kinds + strict owner-only RLS
-- Guardrails: display-only values; no derived metrics; no IRR/MOIC math here.

-- 1) Snapshot metadata: add investor ownership + kind semantics
alter table public.snapshots
  add column if not exists investor_id uuid references auth.users(id) on delete cascade,
  add column if not exists snapshot_kind text,
  add column if not exists snapshot_month date,
  add column if not exists project_key text;

-- Enforce required ownership + snapshot shape (strict RLS assumes investor_id is always set).
alter table public.snapshots
  alter column investor_id set not null,
  alter column snapshot_kind set not null,
  alter column snapshot_month set not null;

alter table public.snapshots
  add constraint snapshots_snapshot_kind_check
    check (snapshot_kind in ('monthly', 'project'));

alter table public.snapshots
  add constraint snapshots_project_key_shape_check
    check (
      (snapshot_kind = 'monthly' and project_key is null)
      or
      (snapshot_kind = 'project' and project_key is not null)
    );

-- Uniqueness: one monthly snapshot per investor+month; one project snapshot per investor+project+month.
create unique index if not exists uq_snapshots_monthly_per_investor_month
  on public.snapshots(investor_id, snapshot_month)
  where snapshot_kind = 'monthly';

create unique index if not exists uq_snapshots_project_per_investor_project_month
  on public.snapshots(investor_id, project_key, snapshot_month)
  where snapshot_kind = 'project';

create index if not exists idx_snapshots_investor_id on public.snapshots(investor_id);
create index if not exists idx_snapshots_investor_month on public.snapshots(investor_id, snapshot_month);

comment on column public.snapshots.investor_id is 'Owner of the snapshot; RLS restricts reads to auth.uid() = investor_id.';
comment on column public.snapshots.snapshot_kind is 'monthly | project (monthly portfolio snapshot vs per-project snapshot).';
comment on column public.snapshots.snapshot_month is 'Month bucket (date). Use first day of month convention.';
comment on column public.snapshots.project_key is 'Required for project snapshots; stable identifier for the project/company.';

-- 2) Metric values: enforce allowlisted source pages at the database level (display-only).
alter table public.metric_values
  add constraint metric_values_source_page_allowlist_check
    check (source_page in ('06','07','08','09','10','11','18','19','21'));

-- 3) RLS: strict owner-only reads
-- Replace open-read policies with owner-only policies.
drop policy if exists "Allow read snapshots" on public.snapshots;
drop policy if exists "Allow read metric_values" on public.metric_values;
drop policy if exists "Investors read own positions" on public.investor_positions;

create policy "Investors read own snapshots"
  on public.snapshots for select
  using (auth.uid() = investor_id);

create policy "Investors read own metric_values"
  on public.metric_values for select
  using (
    exists (
      select 1
      from public.snapshots s
      where s.id = public.metric_values.snapshot_id
        and s.investor_id = auth.uid()
    )
  );

create policy "Investors read own positions"
  on public.investor_positions for select
  using (auth.uid() = investor_id);

-- No INSERT/UPDATE/DELETE policies for app roles: writes only via server-side scripts using SERVICE ROLE.

