-- Module 21 — Schema + seed (read-only Investor OS)
-- Guardrails:
-- - App/client remains read-only (SELECT + RPC only)
-- - RLS owner-only access
-- - No derived math or computed KPIs
-- - Store display-ready values as text

create extension if not exists pgcrypto;

-- A) snapshots
create table if not exists public.snapshots (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null,
  snapshot_kind text not null,
  snapshot_month date not null,
  project_key text null,
  label text null,
  created_at timestamptz not null default now()
);

-- Compatibility for repos that already had Module 0/1 schema.
alter table public.snapshots
  add column if not exists investor_id uuid,
  add column if not exists snapshot_kind text,
  add column if not exists snapshot_month date,
  add column if not exists project_key text,
  add column if not exists label text,
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'snapshots_snapshot_kind_check'
  ) then
    alter table public.snapshots
      add constraint snapshots_snapshot_kind_check
      check (snapshot_kind in ('monthly', 'project'));
  end if;
end
$$;

create index if not exists idx_snapshots_investor_month
  on public.snapshots(investor_id, snapshot_month desc, created_at desc);

-- B) metric_values
create table if not exists public.metric_values (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.snapshots(id) on delete cascade,
  metric_key text not null,
  value_text text not null,
  created_at timestamptz not null default now()
);

-- Compatibility: keep allowlisted source page traceability for existing app contracts.
alter table public.metric_values
  add column if not exists source_page text;

create index if not exists idx_metric_values_snapshot_id
  on public.metric_values(snapshot_id);

create unique index if not exists uq_metric_values_snapshot_metric
  on public.metric_values(snapshot_id, metric_key);

-- C) investor_positions
create table if not exists public.investor_positions (
  investor_id uuid primary key,
  summary_text text null,
  narrative_text text null,
  created_at timestamptz not null default now()
);

-- Compatibility for prior schema.
alter table public.investor_positions
  add column if not exists investor_id uuid,
  add column if not exists summary_text text,
  add column if not exists narrative_text text,
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_investor_positions_investor_id
  on public.investor_positions(investor_id);

-- D) snapshot_sources
create table if not exists public.snapshot_sources (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.snapshots(id) on delete cascade,
  source_type text not null,
  source_ref text not null,
  source_label text null,
  created_at timestamptz not null default now()
);

-- Compatibility for prior schema + mobile display.
alter table public.snapshot_sources
  add column if not exists source_ref text,
  add column if not exists source_label text,
  add column if not exists title text,
  add column if not exists url text,
  add column if not exists note text;

update public.snapshot_sources
set source_ref = coalesce(source_ref, url, title, '—')
where source_ref is null;

create index if not exists idx_snapshot_sources_snapshot_id
  on public.snapshot_sources(snapshot_id);

-- RLS + read-only policies
alter table public.snapshots enable row level security;
alter table public.metric_values enable row level security;
alter table public.investor_positions enable row level security;
alter table public.snapshot_sources enable row level security;

drop policy if exists "Investors read own snapshots" on public.snapshots;
drop policy if exists "Investors read own metric_values" on public.metric_values;
drop policy if exists "Investors read own positions" on public.investor_positions;
drop policy if exists "Investors read own snapshot_sources" on public.snapshot_sources;

create policy "Investors read own snapshots"
  on public.snapshots
  for select
  using (auth.uid() = investor_id);

create policy "Investors read own metric_values"
  on public.metric_values
  for select
  using (
    exists (
      select 1
      from public.snapshots s
      where s.id = public.metric_values.snapshot_id
        and s.investor_id = auth.uid()
    )
  );

create policy "Investors read own positions"
  on public.investor_positions
  for select
  using (auth.uid() = investor_id);

create policy "Investors read own snapshot_sources"
  on public.snapshot_sources
  for select
  using (
    exists (
      select 1
      from public.snapshots s
      where s.id = public.snapshot_sources.snapshot_id
        and s.investor_id = auth.uid()
    )
  );

-- Explicitly keep app roles read-only.
revoke insert, update, delete on table public.snapshots from anon, authenticated;
revoke insert, update, delete on table public.metric_values from anon, authenticated;
revoke insert, update, delete on table public.investor_positions from anon, authenticated;
revoke insert, update, delete on table public.snapshot_sources from anon, authenticated;

-- RPCs (security invoker, RLS-respecting)
create or replace function public.rpc_list_snapshots(p_kind text default null)
returns table (
  id uuid,
  investor_id uuid,
  snapshot_kind text,
  snapshot_month date,
  project_key text,
  created_at timestamptz,
  label text
)
language sql
stable
security invoker
as $$
  select
    s.id,
    s.investor_id,
    s.snapshot_kind,
    s.snapshot_month,
    s.project_key,
    s.created_at,
    s.label
  from public.snapshots s
  where (p_kind is null or s.snapshot_kind = p_kind)
  order by s.snapshot_month desc, s.created_at desc;
$$;

-- Compatibility wrapper for existing mobile calls.
create or replace function public.rpc_list_snapshots(
  p_snapshot_kind text default null,
  p_snapshot_month date default null,
  p_project_key text default null,
  p_limit integer default 50
)
returns table (
  id uuid,
  investor_id uuid,
  snapshot_kind text,
  snapshot_month date,
  project_key text,
  created_at timestamptz,
  label text
)
language sql
stable
security invoker
as $$
  select
    s.id,
    s.investor_id,
    s.snapshot_kind,
    s.snapshot_month,
    s.project_key,
    s.created_at,
    s.label
  from public.snapshots s
  where (p_snapshot_kind is null or s.snapshot_kind = p_snapshot_kind)
    and (p_snapshot_month is null or s.snapshot_month = p_snapshot_month)
    and (p_project_key is null or s.project_key = p_project_key)
  order by s.snapshot_month desc, s.created_at desc
  limit coalesce(p_limit, 50);
$$;

create or replace function public.rpc_list_metric_values(p_snapshot_id uuid)
returns table (
  snapshot_id uuid,
  metric_key text,
  value_text text,
  source_page text,
  created_at timestamptz
)
language sql
stable
security invoker
as $$
  select
    mv.snapshot_id,
    mv.metric_key,
    mv.value_text,
    coalesce(mv.source_page, '—') as source_page,
    mv.created_at
  from public.metric_values mv
  where mv.snapshot_id = p_snapshot_id
  order by mv.metric_key asc;
$$;

create or replace function public.rpc_get_investor_position(p_snapshot_id uuid)
returns table (
  investor_id uuid,
  snapshot_id uuid,
  summary_text text,
  narrative_text text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security invoker
as $$
  select
    ip.investor_id,
    p_snapshot_id as snapshot_id,
    ip.summary_text,
    ip.narrative_text,
    ip.created_at,
    ip.created_at as updated_at
  from public.investor_positions ip
  where ip.investor_id = auth.uid()
  limit 1;
$$;

create or replace function public.rpc_list_snapshot_sources(p_snapshot_id uuid)
returns table (
  source_type text,
  title text,
  url text,
  note text
)
language sql
stable
security invoker
as $$
  select
    ss.source_type,
    coalesce(ss.source_label, ss.title, ss.source_ref, '—') as title,
    coalesce(ss.source_ref, ss.url, '—') as url,
    coalesce(ss.note, '—') as note
  from public.snapshot_sources ss
  where ss.snapshot_id = p_snapshot_id
  order by ss.created_at desc;
$$;

revoke execute on function public.rpc_list_snapshots(text) from public;
revoke execute on function public.rpc_list_snapshots(text, date, text, integer) from public;
revoke execute on function public.rpc_list_metric_values(uuid) from public;
revoke execute on function public.rpc_get_investor_position(uuid) from public;
revoke execute on function public.rpc_list_snapshot_sources(uuid) from public;

grant execute on function public.rpc_list_snapshots(text) to authenticated;
grant execute on function public.rpc_list_snapshots(text, date, text, integer) to authenticated;
grant execute on function public.rpc_list_metric_values(uuid) to authenticated;
grant execute on function public.rpc_get_investor_position(uuid) to authenticated;
grant execute on function public.rpc_list_snapshot_sources(uuid) to authenticated;

grant execute on function public.rpc_list_snapshots(text) to service_role;
grant execute on function public.rpc_list_snapshots(text, date, text, integer) to service_role;
grant execute on function public.rpc_list_metric_values(uuid) to service_role;
grant execute on function public.rpc_get_investor_position(uuid) to service_role;
grant execute on function public.rpc_list_snapshot_sources(uuid) to service_role;

-- Seed (demo-safe placeholders)
-- If a strict FK to auth.users exists, this seeds first available user.
-- Otherwise, it uses a fixed demo UUID.
do $$
declare
  v_seed_user_id uuid;
  v_snapshot_id uuid;
  v_has_fk boolean;
begin
  select exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'snapshots'
      and c.conname = 'snapshots_investor_id_fkey'
  ) into v_has_fk;

  if v_has_fk then
    select u.id into v_seed_user_id
    from auth.users u
    order by u.created_at asc
    limit 1;
  else
    v_seed_user_id := '11111111-1111-4111-8111-111111111111'::uuid;
  end if;

  if v_seed_user_id is null then
    raise notice 'Module 21 seed skipped: no auth user found. Use scripts/module21_seed_for_user.sql.';
    return;
  end if;

  insert into public.snapshots (investor_id, snapshot_kind, snapshot_month, project_key, label)
  values (
    v_seed_user_id,
    'monthly',
    date '2026-02-01',
    null,
    'Demo placeholder snapshot seeded by Module 21'
  )
  on conflict do nothing;

  select s.id into v_snapshot_id
  from public.snapshots s
  where s.investor_id = v_seed_user_id
    and s.snapshot_kind = 'monthly'
    and s.snapshot_month = date '2026-02-01'
  order by s.created_at desc
  limit 1;

  if v_snapshot_id is null then
    return;
  end if;

  insert into public.metric_values (snapshot_id, metric_key, value_text, source_page)
  values
    (v_snapshot_id, 'current_valuation', '₹—', '10'),
    (v_snapshot_id, 'share_price', '₹—', '10'),
    (v_snapshot_id, 'runway_months', '12 months', '10'),
    (v_snapshot_id, 'revenue_ytd', '₹—', '10'),
    (v_snapshot_id, 'mom_growth', '—', '10'),
    (v_snapshot_id, 'aov', '₹—', '10'),
    (v_snapshot_id, 'gross_margin_pct', '—', '10'),
    (v_snapshot_id, 'overhead_ratio', '—', '10')
  on conflict (snapshot_id, metric_key) do update
    set value_text = excluded.value_text,
        source_page = excluded.source_page;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'investor_positions'
      and column_name = 'snapshot_id'
  ) then
    execute format(
      $q$
        insert into public.investor_positions (investor_id, snapshot_id, summary_text, narrative_text, created_at)
        select %L::uuid, %L::uuid,
          'Demo summary placeholder for Investor OS.',
          'Demo narrative placeholder. This is display-only seeded text.',
          now()
        where not exists (
          select 1
          from public.investor_positions ip
          where ip.investor_id = %L::uuid
            and ip.snapshot_id = %L::uuid
        )
      $q$,
      v_seed_user_id::text, v_snapshot_id::text, v_seed_user_id::text, v_snapshot_id::text
    );
  else
    insert into public.investor_positions (investor_id, summary_text, narrative_text, created_at)
    select
      v_seed_user_id,
      'Demo summary placeholder for Investor OS.',
      'Demo narrative placeholder. This is display-only seeded text.',
      now()
    where not exists (
      select 1
      from public.investor_positions ip
      where ip.investor_id = v_seed_user_id
    );
  end if;

  insert into public.snapshot_sources (
    snapshot_id,
    source_type,
    source_ref,
    source_label,
    title,
    url,
    note,
    created_at
  )
  values
    (v_snapshot_id, 'notion_page', 'Page 10', 'Page 10 — Investor Dashboard', 'Page 10 — Investor Dashboard', 'Page 10', 'Demo placeholder source', now()),
    (v_snapshot_id, 'notion_page', 'Page 11', 'Page 11 — Financial Summary', 'Page 11 — Financial Summary', 'Page 11', 'Demo placeholder source', now())
  on conflict do nothing;
end
$$;
