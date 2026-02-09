-- Module 9 — Snapshot Timeline (display-only)
-- Guardrails: retrieval-only; no derived metrics; no aggregation/rollups; no finance math.

-- Timeline events linked to a snapshot. Rows are written only by service-role scripts.
create table if not exists public.snapshot_timeline_events (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.snapshots(id) on delete cascade,
  event_key text not null,
  event_date date,
  title text,
  detail text,
  source_page text not null,
  created_at timestamptz not null default now(),
  unique(snapshot_id, event_key)
);

create index if not exists idx_snapshot_timeline_events_snapshot_id
  on public.snapshot_timeline_events(snapshot_id);

alter table public.snapshot_timeline_events
  add constraint snapshot_timeline_source_page_allowlist_check
    check (source_page in ('06','07','08','09','10','11','18','19','21'));

comment on table public.snapshot_timeline_events is
  'Display-only timeline events linked to a snapshot. Read-only in app; written only via service-role scripts.';
comment on column public.snapshot_timeline_events.event_key is
  'Display-only event identifier for stable ordering and idempotent writes.';
comment on column public.snapshot_timeline_events.event_date is
  'Display-only event date (optional). Stored as date; do not compute.';
comment on column public.snapshot_timeline_events.title is
  'Display-only event title (optional).';
comment on column public.snapshot_timeline_events.detail is
  'Display-only event detail (verbatim; optional).';
comment on column public.snapshot_timeline_events.source_page is
  'Notion source page id (allowlist only).';

-- RLS: enable + owner-only reads via snapshot ownership.
alter table public.snapshot_timeline_events enable row level security;

drop policy if exists "Investors read own snapshot_timeline_events" on public.snapshot_timeline_events;

create policy "Investors read own snapshot_timeline_events"
  on public.snapshot_timeline_events for select
  using (
    exists (
      select 1
      from public.snapshots s
      where s.id = public.snapshot_timeline_events.snapshot_id
        and s.investor_id = auth.uid()
    )
  );

-- No INSERT/UPDATE/DELETE policies for app roles: writes only via server-side scripts using SERVICE ROLE.

-- RPC: list display-only snapshot timeline events (RLS-respecting).
create or replace function public.rpc_list_snapshot_timeline_events(
  p_snapshot_id uuid
)
returns table (
  event_key text,
  event_date date,
  title text,
  detail text,
  source_page text,
  created_at timestamptz
)
language sql
stable
security invoker
as $$
  select
    ste.event_key,
    ste.event_date,
    ste.title,
    ste.detail,
    ste.source_page,
    ste.created_at
  from public.snapshot_timeline_events ste
  where ste.snapshot_id = p_snapshot_id
  order by ste.event_date desc nulls last, ste.created_at desc, ste.event_key asc;
$$;

comment on function public.rpc_list_snapshot_timeline_events(uuid) is
  'Read-only RPC (security invoker). Returns display-only snapshot_timeline_events for a snapshot; RLS restricts by snapshot owner.';

-- Permissions: callable by authenticated users (RLS still applies).
revoke execute on function public.rpc_list_snapshot_timeline_events(uuid) from public;
grant execute on function public.rpc_list_snapshot_timeline_events(uuid) to authenticated;
grant execute on function public.rpc_list_snapshot_timeline_events(uuid) to service_role;
