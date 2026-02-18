-- Module 21 helper seed (manual/local use)
-- Usage: replace :USER_ID with a real auth.users.id UUID.
-- This script writes demo-safe placeholder rows only.

with seed_snapshot as (
  insert into public.snapshots (investor_id, snapshot_kind, snapshot_month, project_key, label)
  values (:USER_ID::uuid, 'monthly', date '2026-02-01', null, 'Demo placeholder snapshot seeded manually')
  returning id
),
resolved_snapshot as (
  select id from seed_snapshot
  union all
  select s.id
  from public.snapshots s
  where s.investor_id = :USER_ID::uuid
    and s.snapshot_kind = 'monthly'
    and s.snapshot_month = date '2026-02-01'
  order by id
  limit 1
)
insert into public.metric_values (snapshot_id, metric_key, value_text, source_page)
select
  rs.id,
  v.metric_key,
  v.value_text,
  '10'
from resolved_snapshot rs
cross join (
  values
    ('current_valuation', '₹—'),
    ('share_price', '₹—'),
    ('runway_months', '12 months'),
    ('revenue_ytd', '₹—'),
    ('mom_growth', '—'),
    ('aov', '₹—'),
    ('gross_margin_pct', '—'),
    ('overhead_ratio', '—')
) as v(metric_key, value_text)
on conflict (snapshot_id, metric_key) do update
set value_text = excluded.value_text,
    source_page = excluded.source_page;
