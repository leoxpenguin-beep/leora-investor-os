# module15-audit-log

Implement **Module 15 — Read-Only Audit Log (Investor Activity)** for Leora Investor OS.

## Goal

Add a **read-only, institutional-grade Audit Log** that answers:

- What actions occurred?
- When did they occur?
- On which snapshot?

This module is **chronological truth only** — no analytics, no inference.

## Architecture decision

**Option A — Client-side Audit Log (recommended)**:

- Local-only, in-memory audit events
- No backend writes
- No network calls
- Events are reset on actor change (sign-out / different user / demo mode) to avoid cross-user leakage

## Event model (display-only)

Each event is a simple text record:

- `event_type` (string)
- `snapshot_id` (optional)
- `snapshot_label` (optional month/kind/project label)
- `occurred_at` (ISO timestamp)
- `note` (optional verbatim text)

No aggregation, grouping, filters, or counters.

## Event types captured (current)

- `VIEW_SNAPSHOT`
  - Trigger: `SnapshotDetailScreen` opens for a snapshot
- `OPEN_SOURCES`
  - Trigger: `DocumentsSourcesScreen` opens for a snapshot
- `OPEN_DOCUMENT`
  - Trigger: user taps **Open** on a source document
- `EXPORT_PACK`
  - Trigger: `ExportSharePackScreen` opens (`note: "Open"`)
  - Trigger: user taps **Copy Pack** (`note: "Copy Pack"`)
  - Trigger: user taps **Share** (`note: "Share"`)

## Navigation

- New route key: `audit`
- Label: **Audit Log**
- Wired into **Left rail** and **Bottom nav** (near Account)

## Files touched

- `apps/mobile/src/lib/auditLog.ts`
- `apps/mobile/src/screens/AuditLogScreen.tsx`
- `apps/mobile/src/shell/TerminalShell.tsx`
- `apps/mobile/App.tsx`
- `apps/mobile/src/screens/SnapshotDetailScreen.tsx`
- `apps/mobile/src/screens/ExportSharePackScreen.tsx`
- `apps/mobile/src/screens/DocumentsSourcesScreen.tsx`

## How to run (Expo)

- From repo root:
  - `cd apps/mobile`
  - `npm install`
  - `npm run start`

## Guardrails self-check (Module 15) — PASS

- No derived metrics / no counts / no charts: PASS
- No inference or scoring: PASS
- No Supabase writes from the app: PASS
- Read-only display; fallbacks render `"—"`: PASS
- Owner-scoped visibility: PASS (local-only; events reset on actor change)

This command will be available in chat with `/module15-audit-log`.

