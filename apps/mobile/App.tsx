import { StatusBar } from "expo-status-bar";
import React from "react";

import { CockpitScreen } from "./src/screens/CockpitScreen";
import { OrbitScreen } from "./src/screens/OrbitScreen";
import { ShellRouteKey, TerminalShell } from "./src/shell/TerminalShell";

export default function App() {
  const [route, setRoute] = React.useState<ShellRouteKey>("orbit");

  return (
    <>
      <StatusBar style="light" />
      <TerminalShell route={route} onRouteChange={setRoute}>
        {route === "orbit" ? <OrbitScreen /> : <CockpitScreen />}
      </TerminalShell>
    </>
  );
}
