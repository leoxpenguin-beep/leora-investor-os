import React from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { GravityCard } from "../components/GravityCard";
import { DataSourcePill } from "../components/DataSourcePill";
import { GravityDot } from "../components/GravityDot";
import { useDemoMode } from "../demo/demoMode";
import { getSupabaseEnvStatus } from "../lib/supabaseClient";
import { logRemoteSmokeEvent, rpcListSnapshots, SnapshotRow } from "../lib/rpc";
import { theme } from "../theme/theme";
import { EmptyStateScreen } from "./EmptyStateScreen";

export function OrbitScreen({
  onSelectSnapshot,
}: {
  onSelectSnapshot: (snapshot: SnapshotRow) => void;
}) {
  const env = getSupabaseEnvStatus();
  const { demoModeEnabled } = useDemoMode();
  const isEnabled = demoModeEnabled || (env.hasUrl && env.hasAnonKey);
  const [snapshots, setSnapshots] = React.useState<SnapshotRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [errorText, setErrorText] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setErrorText(null);
      try {
        const data = await rpcListSnapshots({ p_limit: 50 });
        if (!alive) return;
        setSnapshots(data);
        logRemoteSmokeEvent({
          screen: "OrbitScreen",
          snapshotId: null,
          rpc: "rpc_list_snapshots",
          status: data.length > 0 ? "success" : "empty",
        });
      } catch (err) {
        if (!alive) return;
        setSnapshots([]);
        setErrorText("Unable to load data.");
        logRemoteSmokeEvent({
          screen: "OrbitScreen",
          snapshotId: null,
          rpc: "rpc_list_snapshots",
          status: "error",
        });
        // TODO: Add locked copy for error states to docs/LOCKED_COPY.md.
      } finally {
        if (alive) setLoading(false);
      }
    }

    // Allow demo mode to run even without Supabase env.
    if (isEnabled) {
      void run();
    } else {
      setSnapshots([]);
    }

    return () => {
      alive = false;
    };
  }, [env.hasUrl, env.hasAnonKey, isEnabled]);

  const showEmptyState =
    !demoModeEnabled &&
    env.hasUrl &&
    env.hasAnonKey &&
    !loading &&
    !errorText &&
    snapshots.length === 0;

  return (
    <View style={styles.root}>
      <GravityCard>
        <View style={styles.header}>
          <GravityDot size={10} />
          <Text style={styles.title}>Orbit</Text>
        </View>
        <DataSourcePill demoModeEnabled={demoModeEnabled} />
        <Text style={styles.subtitle}>Snapshots (read-only)</Text>
        {demoModeEnabled ? (
          <Text style={styles.meta}>Demo Mode: local seed snapshots.</Text>
        ) : !env.hasUrl || !env.hasAnonKey ? (
          <Text style={styles.meta}>
            Missing env: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
          </Text>
        ) : loading ? (
          <Text style={styles.meta}>Loading…</Text>
        ) : errorText ? (
          <Text style={styles.meta}>{errorText}</Text>
        ) : null}
      </GravityCard>

      {showEmptyState ? (
        <EmptyStateScreen
          title="No data for this snapshot."
          detail="No snapshots are available from the remote source."
        />
      ) : (
        <FlatList
          data={snapshots}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <OrbitRow snapshot={item} onPress={() => onSelectSnapshot(item)} />
          )}
        />
      )}
    </View>
  );
}

function OrbitRow({
  snapshot,
  onPress,
}: {
  snapshot: SnapshotRow;
  onPress: () => void;
}) {
  const right =
    snapshot.snapshot_kind === "project"
      ? snapshot.project_key ?? "—"
      : snapshot.snapshot_kind;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [pressed && styles.rowPressed]}
    >
      <GravityCard style={styles.rowCard}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{snapshot.snapshot_month}</Text>
          <Text style={styles.rowValue}>{right}</Text>
        </View>
        <Text style={styles.rowMeta}>
          {snapshot.label ?? "—"}
          {/* TODO: Use locked copy for snapshot row meta if needed. */}
        </Text>
      </GravityCard>
    </Pressable>
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
  },
  list: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
  },
  rowCard: {
    paddingVertical: theme.spacing.sm,
  },
  rowPressed: {
    opacity: 0.9,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  rowLabel: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  rowValue: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  rowMeta: {
    color: theme.colors.subtle,
    fontSize: 12,
    marginTop: theme.spacing.xs,
  },
});
