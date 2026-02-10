import { StatusBar } from "expo-status-bar";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { GravityCard } from "./src/components/GravityCard";
import { demoSnapshotIdSet, getMostRecentDemoSnapshot } from "./src/demo/demoData";
import { useDemoMode } from "./src/demo/demoMode";
import { setAuditActor } from "./src/lib/auditLog";
import { CockpitScreen } from "./src/screens/CockpitScreen";
import { AccountScreen } from "./src/screens/AccountScreen";
import { AuditLogScreen } from "./src/screens/AuditLogScreen";
import { AuthScreen } from "./src/screens/AuthScreen";
import { AgentsScreen } from "./src/screens/AgentsScreen";
import { DocumentsSourcesScreen } from "./src/screens/DocumentsSourcesScreen";
import { ExportSharePackScreen } from "./src/screens/ExportSharePackScreen";
import { OrbitScreen } from "./src/screens/OrbitScreen";
import { AskAgentScreen } from "./src/screens/AskAgentScreen";
import { SnapshotDetailScreen } from "./src/screens/SnapshotDetailScreen";
import { SnapshotTimelineScreen } from "./src/screens/SnapshotTimelineScreen";
import { ValueMultiSnapshotsScreen } from "./src/screens/ValueMultiSnapshotsScreen";
import { useSession } from "./src/lib/useSession";
import { TerminalShell } from "./src/shell/TerminalShell";
import { ShellRouteKey } from "./src/shell/routes";
import {
  rpcGetInvestorPosition,
  rpcListMetricValues,
  rpcListSnapshotSources,
  SnapshotRow,
} from "./src/lib/rpc";
import { theme } from "./src/theme/theme";
import type { AgentId } from "./src/lib/agentRegistry";

export default function App() {
  const { session, user, loading } = useSession();
  const { demoModeEnabled } = useDemoMode();

  const [route, setRoute] = React.useState<ShellRouteKey>("orbit");
  const [selectedSnapshot, setSelectedSnapshot] = React.useState<SnapshotRow | null>(
    null
  );
  const [activeAgentId, setActiveAgentId] = React.useState<AgentId>("vision");

  const lastRealSnapshotRef = React.useRef<SnapshotRow | null>(null);

  React.useEffect(() => {
    // Option A (client-side log): keep audit events scoped to a single actor within the session.
    // Clears events when actor changes (e.g., sign-out, different user, or demo mode).
    const actor = demoModeEnabled ? "demo" : user?.id ?? null;
    setAuditActor(actor);
  }, [demoModeEnabled, user?.id]);

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
        ) : route === "audit" ? (
          <AuditLogScreen />
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
        ) : route === "agents" ? (
          <AgentsScreen
            onOpenAgent={(agentId) => {
              setActiveAgentId(agentId);
              setRoute("ask_agent");
            }}
          />
        ) : route === "ask_agent" ? (
          <AskAgentScreen
            agentId={activeAgentId}
            snapshot={selectedSnapshot}
            screenTitle={route === "ask_agent" ? "Ask Agent" : "—"}
            route={route}
            getCurrentLoaded={async () => {
              if (!selectedSnapshot?.id) return null;
              const [posRes, metricsRes, sourcesRes] = await Promise.allSettled([
                rpcGetInvestorPosition(selectedSnapshot.id),
                rpcListMetricValues(selectedSnapshot.id),
                rpcListSnapshotSources(selectedSnapshot.id),
              ]);

              return {
                position: posRes.status === "fulfilled" ? posRes.value : null,
                metrics: metricsRes.status === "fulfilled" ? metricsRes.value : [],
                sources: sourcesRes.status === "fulfilled" ? sourcesRes.value : [],
              };
            }}
            onBack={() => setRoute("agents")}
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
