-- Module 7 — Read-only RPC: investor position (RLS-respecting)
-- Guardrails: retrieval-only; no derived metrics; no aggregation/rollups; no IRR/MOIC math.

-- RPC: get the current investor's display-only position text for a snapshot.
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
    and ip.investor_id = auth.uid()
  limit 1;
$$;

comment on function public.rpc_get_investor_position(uuid) is
  'Read-only RPC (security invoker). Returns display-only investor_positions row for auth.uid() for a snapshot; no math, no aggregation.';

-- Permissions: callable by authenticated users (RLS still applies; function also filters to auth.uid()).
revoke execute on function public.rpc_get_investor_position(uuid) from public;
grant execute on function public.rpc_get_investor_position(uuid) to authenticated;
grant execute on function public.rpc_get_investor_position(uuid) to service_role;

