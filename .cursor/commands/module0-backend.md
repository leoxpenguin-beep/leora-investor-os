# module0-backend

Implement Module 0 backend on branch `feat/module0-backend-supabase`.

Scope:
- Supabase schema (snapshots, metric_values, investor_positions)
- RLS policies (read-only app; owner-only `investor_positions`)
- Typed read contracts / helpers (SELECT-only)
- Snapshot ingestion skeleton pattern (SERVICE ROLE only; no math)

Constraints:
- Follow `.cursorrules` strictly
- No finance calculations in UI or LLM outputs (store display-ready `value_text`)
- Notion sources allowlist only: 06, 07, 08, 09, 10, 11, 18, 19, 21
- No UI work in this command

End with a guardrails self-check summary (pass/fail against `.cursorrules`).

This command will be available in chat with /module0-backend
