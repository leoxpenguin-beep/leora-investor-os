# module19-agent-router

Implement **Module 19 — Agent Router + Agent Registry (Intelligence Layer foundation)**.

## Goal

Add a first-class multi-agent routing layer in the mobile app (wiring + UX only), while keeping all guardrails:

- Snapshot-scoped only
- Read-only
- No finance math / derived metrics / predictions / advice
- If an agent is disabled: return EXACT **"Not available in this snapshot."**
- Demo Mode must not call the network

## Branch (PowerShell)

```powershell
git checkout develop
git pull origin develop
git checkout -b feat/module19-agent-router
```

## What changed

### Agent Registry

- New registry: `apps/mobile/src/lib/agentRegistry.ts`
- Agents:
  - `vision` (**enabled**)
  - `quant` (locked)
  - `strategist` (locked)
  - `auditor` (locked)

### New routes + screens

- Route keys:
  - `agents`
  - `ask_agent` (uses an in-app `activeAgentId` param)
- Screens:
  - `AgentsScreen`: 4 agent cards; locked agents show **Locked** badge; tapping locked agents shows **"Not available in this snapshot."**
  - `AskAgentScreen`: Ask Leo v2–style structured response UI; shows agent name at top
    - If agent disabled → **"Not available in this snapshot."** and **no network**
    - If Demo Mode → deterministic templates, **no network**
    - Else → calls `ask_leo_v2` edge function with payload including `agent_id`

### TerminalShell navigation

- Adds **Agents** to left rail + bottom nav.

### Edge function invoke payload (client)

- `ask_leo_v2` invoke now includes:

```ts
{ question, snapshotContext, activeSnapshot, agent_id }
```

No backend/schema changes are required for this module; extra fields are safe for the edge function to ignore if not used yet.

## Run (Expo)

```bash
cd apps/mobile
npm install
npm run start
```

## Guardrails self-check (Module 19) — PASS

- No derived metrics / finance math / predictions / advice: PASS
- No Supabase writes: PASS
- Snapshot-scoped context only (uses existing `buildSnapshotContext`): PASS
- Disabled agent and missing/invalid → EXACT "Not available in this snapshot.": PASS
- Demo Mode: no network calls: PASS

