# module14-demo-mode

Implement **Module 14 — Demo Mode + Seed Fallback (Dev-only)** for Leora Investor OS.

## Goal

Make the app **demo-safe** in development even when Supabase:

- has no snapshot data
- is unreachable / not configured

Demo Mode provides **local seed snapshots** and display-only strings for UI testing.

## Hard guardrails (non‑negotiable)

- **No finance calculations / no derived metrics**
- Seed data is **display-only strings** (`value_text`, `summary_text`, `narrative_text`, etc.)
- **Read-only app**: demo mode is local-only and does not write to Supabase
- **Production safety**:
  - Demo Mode is **DEV-only** (gated by `__DEV__`)
  - Demo Mode is **disabled by default**
  - No silent fallback in production builds

## How to enable Demo Mode (DEV only)

Two dev-only entry points:

1) **Auth screen** (when signed out)
   - Tap **Enable Demo Mode**
2) **Account screen**
   - Toggle **Demo Mode** (On/Off)

When enabled:

- The app forces the active snapshot to the **most recent demo snapshot**
- A banner appears in the top bar: **DEMO MODE**

## Where the demo data lives

- `apps/mobile/src/demo/demoData.ts`
  - `demoSnapshots` (matches `rpc_list_snapshots` shape)
  - `demoMetricValuesBySnapshotId`
  - `demoInvestorPositionBySnapshotId`
  - `demoSourcesBySnapshotId`

## Fallback strategy (DEV-only)

RPC wrappers in `apps/mobile/src/lib/rpc.ts` check Demo Mode first:

- If **Demo Mode is enabled** → return demo seed data immediately
- Otherwise → call real `supabase.rpc(...)` (read-only)

This ensures demo seeds never appear in production because `Demo Mode` is gated by `__DEV__`.

## UI hardening

- When Demo Mode is **OFF** and snapshots are empty, the app shows a clearer empty state
  (`EmptyStateScreen`) instead of only `"—"` placeholders.

## Files touched

- `apps/mobile/src/demo/demoData.ts`
- `apps/mobile/src/demo/demoMode.ts`
- `apps/mobile/src/lib/rpc.ts`
- `apps/mobile/App.tsx`
- `apps/mobile/src/screens/AuthScreen.tsx`
- `apps/mobile/src/screens/AccountScreen.tsx`
- `apps/mobile/src/screens/EmptyStateScreen.tsx`
- (plus minor demo-aware gating in snapshot-driven screens)

## How to run (Expo)

- From repo root:
  - `cd apps/mobile`
  - `npm install`
  - `npm run start`

## Guardrails self-check (Module 14) — PASS

- No derived metrics or calculations: PASS
- Demo data is display-only strings: PASS
- No Supabase writes; demo mode is local-only: PASS
- Demo Mode is DEV-only and disabled by default: PASS
- No silent fallback in production builds: PASS

This command will be available in chat with `/module14-demo-mode`.

