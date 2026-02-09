import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { GravityCard } from "../components/GravityCard";
import { GravityDot } from "../components/GravityDot";
import { rpcListSnapshots, SnapshotRow } from "../lib/rpc";
import { getSupabaseEnvStatus } from "../lib/supabaseClient";
import { theme } from "../theme/theme";

export function SnapshotNoticesScreen({
  selectedSnapshot,
  onSelectSnapshot,
  onOpenSnapshotDetail,
}: {
  selectedSnapshot: SnapshotRow | null;
  onSelectSnapshot: (snapshot: SnapshotRow) => void;
  onOpenSnapshotDetail: () => void;
}) {
  const env = getSupabaseEnvStatus();

  const [snapshots, setSnapshots] = React.useState<SnapshotRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [errorText, setErrorText] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setErrorText(null);
      try {
        const data = await rpcListSnapshots({ p_limit: 200 });
        if (!alive) return;
        setSnapshots(
          [...data].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
        );
      } catch (err) {
        if (!alive) return;
        setSnapshots([]);
        setErrorText("—");
        // TODO: Add locked copy for notices load error states to docs/LOCKED_COPY.md.
      } finally {
        if (alive) setLoading(false);
      }
    }

    if (env.hasUrl && env.hasAnonKey) {
      void run();
    } else {
      setSnapshots([]);
    }

    return () => {
      alive = false;
    };
  }, [env.hasUrl, env.hasAnonKey]);

  return (
    <View style={styles.root}>
      <GravityCard>
        <View style={styles.header}>
          <GravityDot size={10} />
          {/* TODO: Use locked copy for this title in docs/LOCKED_COPY.md. */}
          <Text style={styles.title}>Notices</Text>
        </View>
        {/* TODO: Use locked copy for this subtitle in docs/LOCKED_COPY.md. */}
        <Text style={styles.subtitle}>Snapshot change notices (awareness only)</Text>

        {!env.hasUrl || !env.hasAnonKey ? (
          <Text style={styles.meta}>
            Missing env: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
          </Text>
        ) : loading ? (
          <Text style={styles.meta}>Loading…</Text>
        ) : errorText ? (
          <Text style={styles.meta}>{errorText}</Text>
        ) : snapshots.length === 0 ? (
          // TODO: Use locked copy for this empty state in docs/LOCKED_COPY.md.
          <Text style={styles.meta}>No updates yet.</Text>
        ) : (
          <Text style={styles.meta}>Tap a notice to open Snapshot Detail.</Text>
        )}
      </GravityCard>

      <FlatList
        data={snapshots}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isActive = item.id === selectedSnapshot?.id;
          return (
            <NoticeCard
              snapshot={item}
              active={isActive}
              onPress={() => {
                onSelectSnapshot(item);
                onOpenSnapshotDetail();
              }}
            />
          );
        }}
      />
    </View>
  );
}

function NoticeCard({
  snapshot,
  active,
  onPress,
}: {
  snapshot: SnapshotRow;
  active: boolean;
  onPress: () => void;
}) {
  const month = snapshot.snapshot_month || "—";
  const kind = snapshot.snapshot_kind || "—";
  const projectKey = snapshot.project_key?.trim() ? snapshot.project_key : null;

  const timestamp = formatTimestamp(snapshot.created_at);

  // Guardrail: display-only text. Using the only snapshot-level optional text currently returned
  // by `rpc_list_snapshots` (`snapshots.label`). If other snapshot narrative fields are added later,
  // prefer displaying them verbatim here without summarization.
  const whatChanged = snapshot.label?.trim() ? snapshot.label : "—";
  const contextText = "—";
  // TODO: If a display-only `summary_text` (or similar) becomes available in `rpc_list_snapshots`,
  // show it verbatim here. Until then, render "—" (do not infer).

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open snapshot detail"
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.rowPressed]}
    >
      <GravityCard style={[styles.noticeCard, active && styles.noticeCardActive]}>
        <View style={styles.topRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{kind}</Text>
          </View>
          <Text style={styles.timestamp}>{timestamp}</Text>
        </View>

        <Text style={styles.snapshotLabel}>
          {month} · {kind}
          {projectKey ? ` · ${projectKey}` : ""}
        </Text>

        <View style={styles.block}>
          {/* TODO: Use locked copy for this block title in docs/LOCKED_COPY.md. */}
          <Text style={styles.blockTitle}>What changed</Text>
          <Text style={styles.blockBody}>{whatChanged}</Text>
        </View>

        <View style={styles.block}>
          {/* TODO: Use locked copy for this block title in docs/LOCKED_COPY.md. */}
          <Text style={styles.blockTitle}>Context</Text>
          <Text style={styles.blockBody}>{contextText}</Text>
        </View>
      </GravityCard>
    </Pressable>
  );
}

function formatTimestamp(createdAt: string | null | undefined): string {
  if (!createdAt) return "—";
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return createdAt;
  }
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
  subtitle: {
    color: theme.colors.muted,
    fontSize: 12,
    marginTop: theme.spacing.sm,
    lineHeight: 16,
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
  rowPressed: {
    opacity: 0.9,
  },
  noticeCard: {
    paddingVertical: theme.spacing.sm,
  },
  noticeCardActive: {
    borderColor: theme.colors.accentSoft,
    backgroundColor: theme.colors.panelElevated,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
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
    fontWeight: "900",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  timestamp: {
    color: theme.colors.subtle,
    fontSize: 12,
    fontWeight: "700",
  },
  snapshotLabel: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "800",
    marginTop: theme.spacing.xs,
  },
  block: {
    marginTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
  },
  blockTitle: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  blockBody: {
    color: theme.colors.subtle,
    fontSize: 12,
    lineHeight: 16,
    marginTop: theme.spacing.xs,
  },
});

