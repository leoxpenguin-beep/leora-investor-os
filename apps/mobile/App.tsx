import { StatusBar } from "expo-status-bar";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { AuthScreen } from "./src/screens/AuthScreen";
import { CockpitScreen } from "./src/screens/CockpitScreen";
import { DocumentsSourcesScreen } from "./src/screens/DocumentsSourcesScreen";
import { EmptyStateScreen } from "./src/screens/EmptyStateScreen";
import { OrbitScreen } from "./src/screens/OrbitScreen";
import { SnapshotDetailScreen } from "./src/screens/SnapshotDetailScreen";
import { SnapshotTimelineScreen } from "./src/screens/SnapshotTimelineScreen";
import { ValueMultiSnapshotsScreen } from "./src/screens/ValueMultiSnapshotsScreen";
import { ShellRouteKey, TerminalShell } from "./src/shell/TerminalShell";
import { rpcListSnapshots, SnapshotRow } from "./src/lib/rpc";
import { supabase } from "./src/lib/supabaseClient";
import { useSession } from "./src/lib/useSession";
import { theme } from "./src/theme/theme";

export default function App() {
  const [route, setRoute] = React.useState<ShellRouteKey>("orbit");
  const [selectedSnapshot, setSelectedSnapshot] = React.useState<SnapshotRow | null>(
    null
  );

  const { session, loading: sessionLoading } = useSession();

  const [bootstrapState, setBootstrapState] = React.useState<
    "idle" | "loading" | "ready" | "empty" | "error"
  >("idle");
  const [bootstrapErrorText, setBootstrapErrorText] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!session) {
      setSelectedSnapshot(null);
      setRoute("orbit");
      setBootstrapState("idle");
      setBootstrapErrorText(null);
    }
  }, [session]);

  React.useEffect(() => {
    let alive = true;

    async function run() {
      if (!session || !supabase) return;

      setBootstrapState("loading");
      setBootstrapErrorText(null);
      try {
        const snapshots = await rpcListSnapshots({ p_limit: 50 });
        if (!alive) return;

        if (snapshots.length === 0) {
          setBootstrapState("empty");
          setSelectedSnapshot(null);
          return;
        }

        setBootstrapState("ready");
        setSelectedSnapshot((prev) => prev ?? snapshots[0]);
      } catch (err) {
        if (!alive) return;
        setBootstrapState("error");
        setBootstrapErrorText("—");
        // TODO: Add locked copy for bootstrap error states to docs/LOCKED_COPY.md.
        setSelectedSnapshot(null);
      }
    }

    void run();
    return () => {
      alive = false;
    };
  }, [session?.user?.id]);

  async function handleSignOut() {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
  }

  if (sessionLoading) {
    return (
      <>
        <StatusBar style="light" />
        <View style={styles.center}>
          <Text style={styles.centerText}>Loading…</Text>
        </View>
      </>
    );
  }

  if (!session) {
    return (
      <>
        <StatusBar style="light" />
        <AuthScreen />
      </>
    );
  }

  if (bootstrapState === "loading" || bootstrapState === "idle") {
    return (
      <>
        <StatusBar style="light" />
        <View style={styles.center}>
          <Text style={styles.centerText}>Loading…</Text>
        </View>
      </>
    );
  }

  if (bootstrapState === "empty") {
    return (
      <>
        <StatusBar style="light" />
        <EmptyStateScreen onSignOut={() => void handleSignOut()} />
      </>
    );
  }

  if (bootstrapState === "error") {
    return (
      <>
        <StatusBar style="light" />
        <View style={styles.center}>
          <Text style={styles.centerText}>{bootstrapErrorText ?? "—"}</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <TerminalShell
        route={route}
        onRouteChange={setRoute}
        selectedSnapshot={selectedSnapshot}
        onSelectSnapshot={setSelectedSnapshot}
        onSignOut={() => void handleSignOut()}
      >
        {route === "orbit" ? (
          <OrbitScreen
            onSelectSnapshot={(snapshot) => {
              setSelectedSnapshot(snapshot);
              setRoute("cockpit");
            }}
          />
        ) : route === "value_multi" ? (
          <ValueMultiSnapshotsScreen
            selectedSnapshot={selectedSnapshot}
            onSelectSnapshot={setSelectedSnapshot}
            onOpenSnapshotDetail={() => setRoute("snapshot_detail")}
          />
        ) : route === "snapshot_detail" ? (
          <SnapshotDetailScreen
            snapshot={selectedSnapshot}
            onOpenDocumentsSources={() => setRoute("documents_sources")}
            onOpenSnapshotTimeline={() => setRoute("snapshot_timeline")}
          />
        ) : route === "documents_sources" ? (
          <DocumentsSourcesScreen
            snapshot={selectedSnapshot}
            onBack={() => setRoute("snapshot_detail")}
          />
        ) : route === "snapshot_timeline" ? (
          <SnapshotTimelineScreen
            snapshot={selectedSnapshot}
            onBack={() => setRoute("snapshot_detail")}
          />
        ) : (
          <CockpitScreen snapshot={selectedSnapshot} />
        )}
      </TerminalShell>
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bg,
  },
  centerText: {
    color: theme.colors.subtle,
    fontSize: 12,
    lineHeight: 16,
  },
});
