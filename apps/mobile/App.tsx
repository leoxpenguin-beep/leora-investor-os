import { StatusBar } from "expo-status-bar";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { GravityCard } from "./src/components/GravityCard";
import { demoSnapshotIdSet, getMostRecentDemoSnapshot } from "./src/demo/demoData";
import { useDemoMode } from "./src/demo/demoMode";
import { CockpitScreen } from "./src/screens/CockpitScreen";
import { AccountScreen } from "./src/screens/AccountScreen";
import { AuthScreen } from "./src/screens/AuthScreen";
import { DocumentsSourcesScreen } from "./src/screens/DocumentsSourcesScreen";
import { ExportSharePackScreen } from "./src/screens/ExportSharePackScreen";
import { OrbitScreen } from "./src/screens/OrbitScreen";
import { SnapshotDetailScreen } from "./src/screens/SnapshotDetailScreen";
import { SnapshotTimelineScreen } from "./src/screens/SnapshotTimelineScreen";
import { ValueMultiSnapshotsScreen } from "./src/screens/ValueMultiSnapshotsScreen";
import { useSession } from "./src/lib/useSession";
import { ShellRouteKey, TerminalShell } from "./src/shell/TerminalShell";
import { SnapshotRow } from "./src/lib/rpc";
import { theme } from "./src/theme/theme";

export default function App() {
  const { session, user, loading } = useSession();
  const { demoModeEnabled } = useDemoMode();

  const [route, setRoute] = React.useState<ShellRouteKey>("orbit");
  const [selectedSnapshot, setSelectedSnapshot] = React.useState<SnapshotRow | null>(
    null
  );

  const lastRealSnapshotRef = React.useRef<SnapshotRow | null>(null);

  React.useEffect(() => {
    if (!demoModeEnabled) {
      // If we are leaving demo mode and the active snapshot is demo-only, restore the last real
      // selection (if any); otherwise clear it.
      setSelectedSnapshot((prev) => {
        if (prev && demoSnapshotIdSet.has(prev.id)) {
          return lastRealSnapshotRef.current;
        }
        return prev;
      });
      return;
    }

    // Demo Mode enabled: force active snapshot to most recent demo snapshot.
    setSelectedSnapshot((prev) => {
      if (prev && !demoSnapshotIdSet.has(prev.id)) {
        lastRealSnapshotRef.current = prev;
      }
      return getMostRecentDemoSnapshot();
    });
  }, [demoModeEnabled]);

  if (loading) {
    return (
      <>
        <StatusBar style="light" />
        <View style={styles.loadingRoot}>
          <GravityCard>
            <Text style={styles.loadingText}>Loading…</Text>
          </GravityCard>
        </View>
      </>
    );
  }

  if (!session && !demoModeEnabled) {
    return (
      <>
        <StatusBar style="light" />
        <AuthScreen />
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
        demoModeEnabled={demoModeEnabled}
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
            onOpenExportPack={() => setRoute("export_pack")}
          />
        ) : route === "export_pack" ? (
          <ExportSharePackScreen snapshot={selectedSnapshot} onBack={() => setRoute("snapshot_detail")} />
        ) : route === "account" ? (
          <AccountScreen
            email={user?.email ?? null}
            userId={user?.id ?? null}
            selectedSnapshot={selectedSnapshot}
            onOpenDocumentsSources={() => setRoute("documents_sources")}
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
  loadingRoot: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    padding: theme.spacing.md,
    justifyContent: "center",
  },
  loadingText: {
    color: theme.colors.subtle,
    fontSize: 12,
    lineHeight: 16,
  },
});
