# module13-account-profile

Implement **Module 13 — Account / Investor Profile (Read-only)** for Leora Investor OS.

## Goal

Add a dedicated **Account** screen that:

- Shows signed-in investor identity (email)
- Shows app version/build
- Provides **sign out**
- Shows a privacy/read-only notice
- Provides quick support links

This module remains **read-only** (except Supabase Auth sign-out).

## Hard guardrails (non‑negotiable)

- **No finance calculations / no derived metrics**
- **No editing investor data / no Supabase table writes**
- Supabase usage limited to:
  - `supabase.auth.*` (session/user + `signOut`)
  - optional `supabase.rpc(...)` only if display-only profile fields are needed (not required here)
- **Copy lock respected**: no rewriting narrative text; only minimal UI microcopy for this screen

## What changed

- New `AccountScreen`:
  - Profile (email + short user id + signed-in indicator)
  - Security (Sign out)
  - App Info (name + version/build via `expo-constants`)
  - Privacy & Access callout (microcopy only)
  - Support actions:
    - “Report an issue” (opens GitHub issues)
    - “View Sources” shortcut (navigates to Documents & Sources when an active snapshot is selected)
- Adds `account` route to shell navigation (left rail + bottom nav)
- Adds minimal session wiring to support Account + sign-out behavior:
  - `useSession()` hook (subscribes to `supabase.auth.onAuthStateChange`)
  - `AuthScreen` for email/password sign-in + sign-up
  - `App.tsx` gates the shell behind an active session

## Files touched

- `apps/mobile/src/lib/useSession.ts`
- `apps/mobile/src/screens/AuthScreen.tsx`
- `apps/mobile/src/screens/AccountScreen.tsx`
- `apps/mobile/src/shell/TerminalShell.tsx`
- `apps/mobile/App.tsx`
- `apps/mobile/package.json`
- `apps/mobile/package-lock.json`
- `.cursor/commands/module13-account-profile.md`

## How to run (Expo)

- From repo root:
  - `cd apps/mobile`
  - `npm install`
  - `npm run start`

## Guardrails self-check (Module 13)

- No derived metrics or calculations: PASS
- No Supabase table writes (read-only app): PASS
- Supabase usage limited to auth + RPC reads: PASS
- Copy lock respected (microcopy only): PASS

This command will be available in chat with `/module13-account-profile`.

