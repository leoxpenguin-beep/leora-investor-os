# Module 22 QA - Remote Mode Wiring

## Goal
Verify that when Demo Mode is OFF, investor screens use Supabase RPC paths and render snapshot-scoped data (or explicit empty state).

## Preconditions
- App is running in dev.
- `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set.
- User is authenticated.
- Demo Mode toggle is OFF.

## Screen Checks
- `Orbit` -> `rpc_list_snapshots`
- `Snapshot Detail` -> `rpc_get_investor_position`, `rpc_list_metric_values`
- `Cockpit` -> `rpc_list_metric_values`
- `Value (Multiple Snapshots)` -> `rpc_list_snapshots`, `rpc_list_metric_values`
- `Documents & Sources` -> `rpc_list_snapshot_sources`
- `Snapshot Timeline` -> `rpc_list_snapshot_timeline_events`

Each screen must show the data source pill:
- `Data Source: REMOTE` when Demo Mode is OFF
- `Data Source: DEMO` when Demo Mode is ON

## Expected Results (Demo OFF)
- Screen renders remote rows from snapshot-scoped RPCs.
- If RPC returns no rows, UI shows `No data for this snapshot.`.
- If RPC errors, UI shows sanitized text `Unable to load data.`.
- Dev logs include smoke entries:
  - `[Remote] screen=<name> snapshotId=<uuid|-> rpc=<name> status=success|empty|error`

## Expected Results (Demo ON)
- Screen shows `Data Source: DEMO`.
- Screens use demo path through `rpc.ts` demo branches.
- `Snapshot Timeline` does not call remote RPC in Demo Mode and returns local empty list.

## Failure Modes and Checks
- Missing env:
  - UI shows missing env message on non-demo paths.
  - Ensure `.env` includes Supabase URL and anon key.
- Auth/RLS issues:
  - UI shows `Unable to load data.` with dev smoke status `error`.
  - Check authenticated session and snapshot ownership policies.
- No seeded rows for selected snapshot:
  - UI shows `No data for this snapshot.` with smoke status `empty`.
  - Confirm selected snapshot has matching rows in `metric_values`, `snapshot_sources`, and timeline events.

## Notes
- Guardrails preserved: read-only app behavior, snapshot-scoped access, no derived calculations.
