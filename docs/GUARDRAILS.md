# Guardrails

**Canonical source:** root [.cursorrules](../.cursorrules) (LOCKED). Do not rewrite.

## Quick reference

- **Logic lock:** No financial math; only display stored snapshot values (`metric_values.value_text`, `investor_positions.*_text`).
- **Read-only OS:** App SELECT only; writes via server scripts + Supabase SERVICE ROLE.
- **Notion V1 sources:** Pages 06, 07, 08, 09, 10, 11, 18, 19, 21 only.
- **Forbidden KPIs (V1):** Error Rate / Rework %, Design-to-Production Time, “near zero errors,” market-beating claims.
- **Copy lock:** Locked scripts and Q&A are canonical; no narrative rewrite unless V2+ requested.
- **Security:** Anon key for reads; SERVICE ROLE in scripts only; RLS for `investor_positions`.
- **Definition of done:** Every displayed value → metric_key + snapshot_id + source_page; no derived computations.

Every PR must include a brief **Guardrails Check** note.
