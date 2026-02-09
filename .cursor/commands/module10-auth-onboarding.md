# module10-auth-onboarding

Implement **Module 10 — Auth + Investor Onboarding (Read-only)** for Leora Investor OS.

## Goal

Make the app work end-to-end for a real investor login:

1) user can **sign in** (Supabase Auth)
2) app **loads investor context** (owner-only via existing read-only RPCs)
3) app lands into the existing shell with an **active snapshot** selected (or shows an empty state if none exist)

## Hard guardrails (non‑negotiable)

- **No derived metrics / no finance calculations** (render stored strings only, e.g. `value_text`, `summary_text`, `narrative_text`).
- **Read-only Supabase from app**: only `supabase.auth.*` + `supabase.rpc(...)` (SECURITY INVOKER RPCs).
- **No service_role key anywhere**.
- **Respect RLS** everywhere (owner-only visibility via auth session).
- **No copy rewriting**: show verbatim stored fields or `"—"` when missing/empty.

## What changed

- Added `AuthScreen` (email/password, Sign In + Sign Up) using Supabase Auth.
- Added `useSession()` hook to centralize session state via `supabase.auth.onAuthStateChange`.
- Gated `App.tsx` rendering:
  - loading → minimal loading placeholder
  - no session → `AuthScreen`
  - session → bootstrap snapshots via existing `rpc_list_snapshots`
    - none → `EmptyStateScreen`
    - some → set default `selectedSnapshot` to most recent (RPC ordering)
- Added top-bar action to **Sign out** via `supabase.auth.signOut()`.

## Files touched

- `apps/mobile/App.tsx`
- `apps/mobile/src/lib/useSession.ts`
- `apps/mobile/src/screens/AuthScreen.tsx`
- `apps/mobile/src/screens/EmptyStateScreen.tsx`
- `apps/mobile/src/shell/TerminalShell.tsx`

## How to run (Expo)

- From repo root:
  - `cd apps/mobile`
  - `npm install`
  - `npm run start`

## Guardrails self-check (Module 10)

- No derived-metric logic: PASS
- Read-only Supabase (auth + rpc only): PASS
- RLS respected (owner-only): PASS
- No service role usage: PASS
- Copy lock respected: PASS

This command will be available in chat with `/module10-auth-onboarding`.

