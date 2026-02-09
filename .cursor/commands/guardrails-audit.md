# guardrails-audit

Audit the current branch diff against `.cursorrules` and the canonical guardrail docs.

Requirements:
- Return PASS or FAIL.
- If FAIL: list exact violations with file paths and line numbers, and propose minimal fixes.
- Do not modify code unless explicitly instructed.

Checklist (must verify all):
- No finance calculations / derived metrics anywhere; UI displays only stored snapshot values (`value_text` / display-only fields) per `docs/DATA_CONTRACTS.md`.
- No forbidden operational KPI dashboards/claims: error rate, rework %, design-to-production time, market-beating speed claims, “near-zero errors”.
- Only allowed Notion sources referenced: 06, 07, 08, 09, 10, 11, 18, 19, 21.
- Leo Quant remains retrieval-only: no calculations, no causality, no predictive performance claims.
- Copy lock respected: no rewriting of locked scripts/Q&A; use `docs/LOCKED_COPY.md` verbatim or render `"—"` + TODO.
- Supabase is read-only from the app; RLS enforces `investor_positions` owner-only visibility.



This command will be available in chat with /guardrails-audit
