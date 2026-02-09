import { StatusBar } from "expo-status-bar";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { GravityCard } from "./src/components/GravityCard";
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

  const [route, setRoute] = React.useState<ShellRouteKey>("orbit");
  const [selectedSnapshot, setSelectedSnapshot] = React.useState<SnapshotRow | null>(
    null
  );

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

  if (!session) {
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
