export type ShellRouteKey =
  | "orbit"
  | "value_multi"
  | "snapshot_detail"
  | "agents"
  | "ask_agent"
  | "audit"
  | "account"
  | "export_pack"
  | "snapshot_timeline"
  | "documents_sources"
  | "cockpit";

export function getShellRouteTitle(route: ShellRouteKey): string {
  return route === "orbit"
    ? "Orbit"
    : route === "value_multi"
      ? "Value"
      : route === "snapshot_detail"
        ? "Snapshot Detail"
        : route === "agents"
          ? "Agents"
          : route === "ask_agent"
            ? "Ask Agent"
        : route === "audit"
          ? "Audit Log"
          : route === "account"
            ? "Account"
            : route === "export_pack"
              ? "Export"
              : route === "snapshot_timeline"
                ? "Snapshot Timeline"
                : route === "documents_sources"
                  ? "Documents & Sources"
                  : "Cockpit";
}

