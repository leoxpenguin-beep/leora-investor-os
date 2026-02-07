-- Module 4 — Investor positions: read-only RPC (RLS-respecting)
-- Guardrails: retrieval-only; display-only text; no derived metrics; no aggregation/rollups/math.

-- RPC: get investor's position text for a snapshot (RLS owner-only via investor_id).
create or replace function public.rpc_get_investor_position(
  p_snapshot_id uuid
)
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
    ip.snapshot_id,
    ip.summary_text,
    ip.narrative_text,
    ip.created_at,
    ip.updated_at
  from public.investor_positions ip
  where ip.snapshot_id = p_snapshot_id
  order by ip.updated_at desc
  limit 1;
$$;

comment on function public.rpc_get_investor_position(uuid) is
  'Read-only RPC (security invoker). Returns display-only investor_positions for a snapshot; RLS restricts to auth.uid() = investor_id.';

-- Permissions: callable by authenticated users (RLS still applies).
revoke execute on function public.rpc_get_investor_position(uuid) from public;
grant execute on function public.rpc_get_investor_position(uuid) to authenticated;
grant execute on function public.rpc_get_investor_position(uuid) to service_role;

