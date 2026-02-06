-- Module 2 — Read-only RPCs (RLS-respecting)
-- Guardrails: retrieval-only; no derived metrics; no aggregation/rollups; no IRR/MOIC math.

-- RPC: list snapshots (monthly/project) visible under RLS.
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

comment on function public.rpc_list_snapshots(text, date, text, integer) is
  'Read-only RPC (security invoker). Returns raw snapshots; RLS enforces auth.uid() = investor_id.';

-- RPC: list display-only metric values for a snapshot (RLS owner-only via snapshot ownership).
create or replace function public.rpc_list_metric_values(
  p_snapshot_id uuid
)
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
    mv.source_page,
    mv.created_at
  from public.metric_values mv
  where mv.snapshot_id = p_snapshot_id
  order by mv.metric_key asc;
$$;

comment on function public.rpc_list_metric_values(uuid) is
  'Read-only RPC (security invoker). Returns display-only metric_values for a snapshot; RLS restricts by snapshot owner.';

-- Permissions: callable by authenticated users (RLS still applies).
revoke execute on function public.rpc_list_snapshots(text, date, text, integer) from public;
revoke execute on function public.rpc_list_metric_values(uuid) from public;

grant execute on function public.rpc_list_snapshots(text, date, text, integer) to authenticated;
grant execute on function public.rpc_list_metric_values(uuid) to authenticated;

grant execute on function public.rpc_list_snapshots(text, date, text, integer) to service_role;
grant execute on function public.rpc_list_metric_values(uuid) to service_role;

