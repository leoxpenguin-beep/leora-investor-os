import React from "react";

import type { SnapshotRow } from "./rpc";

// Module 15 — Client-side Audit Log (read-only)
//
// Guardrails:
// - No analytics, scoring, or inference
// - No derived metrics/counts displayed
// - Local-only (no network calls, no Supabase writes)

export type AuditEvent = {
  id: string;
  event_type: string;
  snapshot_id: string | null;
  snapshot_label: string | null;
  occurred_at: string; // ISO timestamp
  note: string | null;
};

type Listener = (events: AuditEvent[]) => void;

let actorKey: string | null = null;
let events: AuditEvent[] = [];
let seq = 0;
const listeners = new Set<Listener>();

function notify() {
  const snapshot = events;
  for (const l of Array.from(listeners)) {
    try {
      l(snapshot);
    } catch {
      // ignore listener errors
    }
  }
}

export function setAuditActor(nextActorKey: string | null) {
  const normalized = nextActorKey?.trim() ? nextActorKey.trim() : null;
  if (actorKey === normalized) return;
  actorKey = normalized;
  events = [];
  seq = 0;
  notify();
}

export function getAuditEvents(): AuditEvent[] {
  return events;
}

export function subscribeAuditEvents(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function snapshotToLabel(snapshot: SnapshotRow | null | undefined): string | null {
  if (!snapshot) return null;
  const month = snapshot.snapshot_month?.trim() ? snapshot.snapshot_month : "—";
  const kind = snapshot.snapshot_kind?.trim() ? snapshot.snapshot_kind : "—";
  const projectKey = snapshot.project_key?.trim() ? snapshot.project_key : null;
  return projectKey ? `${month} · ${kind} · ${projectKey}` : `${month} · ${kind}`;
}

export function logAuditEvent(input: {
  event_type: string;
  occurred_at?: string;
  snapshot?: SnapshotRow | null;
  snapshot_id?: string | null;
  snapshot_label?: string | null;
  note?: string | null;
}): AuditEvent {
  const occurredAt = input.occurred_at ?? new Date().toISOString();
  const snapshotId =
    input.snapshot?.id ?? (input.snapshot_id?.trim() ? input.snapshot_id.trim() : null);
  const snapshotLabel =
    snapshotToLabel(input.snapshot) ??
    (input.snapshot_label?.trim() ? input.snapshot_label.trim() : null);

  const eventType = input.event_type?.trim() ? input.event_type.trim() : "—";
  const note = input.note?.trim() ? input.note.trim() : null;

  const ev: AuditEvent = {
    id: `${occurredAt}:${seq++}`,
    event_type: eventType,
    snapshot_id: snapshotId,
    snapshot_label: snapshotLabel,
    occurred_at: occurredAt,
    note,
  };

  // Keep newest-first insertion order; UI still sorts by occurred_at for truth.
  events = [ev, ...events].slice(0, 300);
  notify();
  return ev;
}

export function useAuditEvents(): AuditEvent[] {
  const [state, setState] = React.useState<AuditEvent[]>(getAuditEvents());

  React.useEffect(() => {
    return subscribeAuditEvents((next) => setState(next));
  }, []);

  return state;
}

