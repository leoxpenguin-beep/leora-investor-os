import { StatusBar } from "expo-status-bar";
import React from "react";

import { CockpitScreen } from "./src/screens/CockpitScreen";
import { DocumentsSourcesScreen } from "./src/screens/DocumentsSourcesScreen";
import { ExportSharePackScreen } from "./src/screens/ExportSharePackScreen";
import { OrbitScreen } from "./src/screens/OrbitScreen";
import { SnapshotDetailScreen } from "./src/screens/SnapshotDetailScreen";
import { SnapshotTimelineScreen } from "./src/screens/SnapshotTimelineScreen";
import { ValueMultiSnapshotsScreen } from "./src/screens/ValueMultiSnapshotsScreen";
import { ShellRouteKey, TerminalShell } from "./src/shell/TerminalShell";
import { SnapshotRow } from "./src/lib/rpc";

export default function App() {
  const [route, setRoute] = React.useState<ShellRouteKey>("orbit");
  const [selectedSnapshot, setSelectedSnapshot] = React.useState<SnapshotRow | null>(
    null
  );

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
