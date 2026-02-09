import { StatusBar } from "expo-status-bar";
import React from "react";

import { CockpitScreen } from "./src/screens/CockpitScreen";
import { OrbitScreen } from "./src/screens/OrbitScreen";
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
        ) : route === "cockpit" ? (
          <CockpitScreen snapshot={selectedSnapshot} />
        ) : (
          <ValueMultiSnapshotsScreen
            selectedSnapshot={selectedSnapshot}
            onSelectSnapshot={setSelectedSnapshot}
          />
        )}
      </TerminalShell>
    </>
  );
}
