# module11-snapshot-notices

Implement **Module 11 — Snapshot Change Notices (Read-only)** for Leora Investor OS.

## Goal

Give investors clear, non-analytical visibility into:

- When a **new snapshot** was added
- What **changed** (display-only, text-based; no calculations)
- Why it changed (only if stored narrative text exists; otherwise `"—"`)

This module is **awareness**, not analysis.

## Hard guardrails (non‑negotiable)

- **No derived metrics / no finance calculations** (no deltas, %, trends, IRR/MOIC, charts).
- **Display-only**: render stored text fields verbatim (or `"—"` when missing).
- **Read-only Supabase**: `supabase.rpc(...)` only for data reads.
- **RLS respected** (owner-only).
- **Copy lock**: do not rewrite narrative/copy; show verbatim or `"—"`.
- **No KPI dashboards/tiles**.

## Data source

- Uses existing read-only RPC: `rpc_list_snapshots(...)` via `rpcListSnapshots()` wrapper.
- Current snapshot RPC shape includes only one optional snapshot-level text field: `snapshots.label`.
  - Module 11 displays `snapshots.label` verbatim in the “What changed” block (fallback `"—"`).
  - “Context” falls back to `"—"` until an explicit stored field is available via the RPC (no inference).

## UI / UX

- New screen: `SnapshotNoticesScreen`
  - Loads snapshots via `rpc_list_snapshots`
  - Sorts by `created_at` DESC (string order; display-only)
  - Renders a vertical feed of notice cards with:
    - snapshot_month + snapshot_kind (+ project_key if present)
    - created_at timestamp (formatted)
    - “What changed” (label or `"—"`)
    - “Context” (`"—"` unless a stored field exists in the RPC)
- Empty state text: “No updates yet.”
- Tap notice:
  - sets active snapshot
  - navigates to `Snapshot Detail`

## Navigation

- Adds a top-level route: `notices` (label: **Notices**)
- Wired into left rail + bottom nav (same pattern as Orbit/Value/Detail/Cockpit)

## Files touched

- `apps/mobile/src/screens/SnapshotNoticesScreen.tsx`
- `apps/mobile/src/shell/TerminalShell.tsx`
- `apps/mobile/App.tsx`
- `.cursor/commands/module11-snapshot-notices.md`

## How to run (Expo)

- From repo root:
  - `cd apps/mobile`
  - `npm install`
  - `npm run start`

## Guardrails self-check (Module 11)

- No derived metrics or calculations: PASS
- Read-only Supabase (RPC only): PASS
- RLS respected: PASS
- No copy rewriting: PASS
- Awareness-only (no analysis): PASS

This command will be available in chat with `/module11-snapshot-notices`.

