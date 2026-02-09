-- Module 8 — Documents & Sources (snapshot-linked, display-only)
-- Guardrails: retrieval-only; no derived metrics; no aggregation/rollups; no finance math.

-- Source documents linked to a snapshot. Rows are written only by service-role scripts.
create table if not exists public.snapshot_sources (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.snapshots(id) on delete cascade,
  source_type text not null,
  title text not null,
  url text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_snapshot_sources_snapshot_id
  on public.snapshot_sources(snapshot_id);

comment on table public.snapshot_sources is
  'Display-only source documents linked to a snapshot. Read-only in app; written only via service-role scripts.';
comment on column public.snapshot_sources.source_type is
  'Display-only source type label (e.g., notion, deck, doc). Do not compute.';
comment on column public.snapshot_sources.title is
  'Display-only title for the source document.';
comment on column public.snapshot_sources.url is
  'Display-only URL for opening the document (optional).';
comment on column public.snapshot_sources.note is
  'Display-only note (verbatim) for the source document (optional).';

-- RLS: enable + owner-only reads via snapshot ownership.
alter table public.snapshot_sources enable row level security;

drop policy if exists "Investors read own snapshot_sources" on public.snapshot_sources;

create policy "Investors read own snapshot_sources"
  on public.snapshot_sources for select
  using (
    exists (
      select 1
      from public.snapshots s
      where s.id = public.snapshot_sources.snapshot_id
        and s.investor_id = auth.uid()
    )
  );

-- No INSERT/UPDATE/DELETE policies for app roles: writes only via server-side scripts using SERVICE ROLE.

-- RPC: list display-only snapshot sources (RLS-respecting).
create or replace function public.rpc_list_snapshot_sources(
  p_snapshot_id uuid
)
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
    ss.title,
    ss.url,
    ss.note
  from public.snapshot_sources ss
  where ss.snapshot_id = p_snapshot_id
  order by ss.created_at desc, ss.title asc;
$$;

comment on function public.rpc_list_snapshot_sources(uuid) is
  'Read-only RPC (security invoker). Returns display-only snapshot_sources for a snapshot; RLS restricts by snapshot owner.';

-- Permissions: callable by authenticated users (RLS still applies).
revoke execute on function public.rpc_list_snapshot_sources(uuid) from public;
grant execute on function public.rpc_list_snapshot_sources(uuid) to authenticated;
grant execute on function public.rpc_list_snapshot_sources(uuid) to service_role;

