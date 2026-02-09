import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { GravityCard } from "../components/GravityCard";
import { GravityDot } from "../components/GravityDot";
import { AuditEvent, useAuditEvents } from "../lib/auditLog";
import { theme } from "../theme/theme";

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso || !iso.trim()) return "—";
  try {
    const d = new Date(iso);
    // If invalid date, fall back to raw ISO string.
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function eventTypeToLabel(eventType: string): string {
  const t = eventType?.trim() ? eventType.trim() : "—";
  if (t === "VIEW_SNAPSHOT") return "View snapshot";
  if (t === "EXPORT_PACK") return "Export pack";
  if (t === "OPEN_SOURCES") return "View documents & sources";
  if (t === "OPEN_DOCUMENT") return "Open document";
  return t;
}

export function AuditLogScreen() {
  const events = useAuditEvents();

  const sorted = React.useMemo(() => {
    return [...events].sort((a, b) => {
      // ISO strings sort lexicographically; newest first.
      return (b.occurred_at ?? "").localeCompare(a.occurred_at ?? "");
    });
  }, [events]);

  return (
    <View style={styles.root}>
      <GravityCard>
        <View style={styles.header}>
          <GravityDot size={10} />
          <Text style={styles.title}>Audit Log</Text>
        </View>
        <Text style={styles.meta}>Read-only activity records (local)</Text>
        {sorted.length === 0 ? (
          <Text style={styles.meta}>No activity recorded yet.</Text>
        ) : null}
      </GravityCard>

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <AuditEventCard item={item} />}
      />
    </View>
  );
}

function AuditEventCard({ item }: { item: AuditEvent }) {
  const ts = formatTimestamp(item.occurred_at);
  const label = eventTypeToLabel(item.event_type);
  const snapshotRef = item.snapshot_label?.trim() ? item.snapshot_label : "—";
  const shortId =
    item.snapshot_id && item.snapshot_id.trim().length >= 6
      ? item.snapshot_id.trim().slice(-6)
      : null;
  const note = item.note?.trim() ? item.note : null;

  return (
    <GravityCard style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.timestamp}>{ts}</Text>
        <Text style={styles.eventType}>{label}</Text>
      </View>

      <Text style={styles.snapshotRef}>
        Snapshot: {snapshotRef}
        {shortId ? ` · …${shortId}` : ""}
      </Text>

      {note ? (
        <>
          <View style={styles.divider} />
          <Text style={styles.note}>{note}</Text>
        </>
      ) : null}
    </GravityCard>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: theme.spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  title: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  meta: {
    color: theme.colors.subtle,
    fontSize: 12,
    marginTop: theme.spacing.xs,
    lineHeight: 16,
  },
  list: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
  },
  card: {
    paddingVertical: theme.spacing.sm,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  timestamp: {
    color: theme.colors.subtle,
    fontSize: 12,
    lineHeight: 16,
  },
  eventType: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  snapshotRef: {
    marginTop: theme.spacing.xs,
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  note: {
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 16,
  },
});

