import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { GravityCard } from "../components/GravityCard";
import { GravityDot } from "../components/GravityDot";
import { useDemoMode } from "../demo/demoMode";
import {
  rpcListSnapshotTimelineEvents,
  SnapshotRow,
  SnapshotTimelineEventRow,
} from "../lib/rpc";
import { getSupabaseEnvStatus } from "../lib/supabaseClient";
import { theme } from "../theme/theme";

export function SnapshotTimelineScreen({
  snapshot,
  onBack,
}: {
  snapshot: SnapshotRow | null;
  onBack?: () => void;
}) {
  const env = getSupabaseEnvStatus();
  const { demoModeEnabled } = useDemoMode();
  const isEnabled = demoModeEnabled || (env.hasUrl && env.hasAnonKey);

  const [events, setEvents] = React.useState<SnapshotTimelineEventRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [errorText, setErrorText] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;

    async function run(snapshotId: string) {
      setLoading(true);
      setErrorText(null);
      try {
        const data = await rpcListSnapshotTimelineEvents(snapshotId);
        if (!alive) return;
        setEvents(data);
      } catch (err) {
        if (!alive) return;
        setEvents([]);
        setErrorText("—");
        // TODO: Add locked copy for timeline error states to docs/LOCKED_COPY.md.
      } finally {
        if (alive) setLoading(false);
      }
    }

    if (!snapshot?.id) {
      setEvents([]);
      setLoading(false);
      setErrorText(null);
      return () => {
        alive = false;
      };
    }

    // Allow demo mode to run even without Supabase env.
    if (isEnabled) {
      void run(snapshot.id);
    } else {
      setEvents([]);
    }

    return () => {
      alive = false;
    };
  }, [env.hasUrl, env.hasAnonKey, isEnabled, snapshot?.id]);

  const projectKey = snapshot?.project_key ?? "—";
  const month = snapshot?.snapshot_month ?? "—";
  const kind = snapshot?.snapshot_kind ?? "—";

  return (
    <View style={styles.root}>
      <GravityCard>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <GravityDot size={10} />
            {/* TODO: Use locked copy for this screen title in docs/LOCKED_COPY.md. */}
            <Text style={styles.title}>Snapshot Timeline</Text>
          </View>
          {onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={onBack}
              style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
            >
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.meta}>
          {month} · {kind} · {projectKey}
        </Text>

        {!snapshot ? (
          <Text style={styles.meta}>—</Text>
        ) : demoModeEnabled ? (
          <Text style={styles.meta}>Demo Mode: timeline events may be empty.</Text>
        ) : !env.hasUrl || !env.hasAnonKey ? (
          <Text style={styles.meta}>
            Missing env: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
          </Text>
        ) : loading ? (
          <Text style={styles.meta}>Loading…</Text>
        ) : errorText ? (
          <Text style={styles.meta}>{errorText}</Text>
        ) : events.length === 0 ? (
          <Text style={styles.meta}>—</Text>
        ) : (
          <Text style={styles.meta}>Snapshot-linked timeline events (display-only)</Text>
        )}
      </GravityCard>

      <FlatList
        data={events}
        keyExtractor={(item) => `${item.event_key}:${item.event_date ?? ""}`}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <TimelineEventCard item={item} />}
      />
    </View>
  );
}

function TimelineEventCard({ item }: { item: SnapshotTimelineEventRow }) {
  const eventDate = item.event_date?.trim() ? item.event_date : "—";
  const title = item.title?.trim() ? item.title : "—";
  const detail = item.detail?.trim() ? item.detail : "—";
  const sourcePage = item.source_page?.trim() ? item.source_page : "—";

  return (
    <GravityCard style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardDate}>{eventDate}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{sourcePage}</Text>
        </View>
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDetail}>{detail}</Text>
    </GravityCard>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: theme.spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  headerLeft: {
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
  backButton: {
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.panel,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  backButtonPressed: {
    opacity: 0.9,
  },
  backText: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "800",
  },

  list: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
  },
  card: {
    paddingVertical: theme.spacing.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  cardDate: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  badge: {
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.accentSoft,
    backgroundColor: theme.colors.panelElevated,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  badgeText: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "800",
    marginTop: theme.spacing.xs,
  },
  cardDetail: {
    color: theme.colors.subtle,
    fontSize: 12,
    lineHeight: 16,
    marginTop: theme.spacing.xs,
  },
});
