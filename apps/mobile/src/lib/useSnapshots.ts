import React from "react";

import { rpcListSnapshots, SnapshotRow } from "./rpc";

type DisabledBehavior = "none" | "clear" | "reset";

type UseSnapshotsOptions = {
  enabled: boolean;
  limit?: number;
  disabledBehavior?: DisabledBehavior;
};

export function useSnapshots({
  enabled,
  limit = 50,
  disabledBehavior = "clear",
}: UseSnapshotsOptions) {
  const [snapshots, setSnapshots] = React.useState<SnapshotRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [errorText, setErrorText] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setErrorText(null);
      try {
        const data = await rpcListSnapshots({ p_limit: limit });
        if (!alive) return;
        setSnapshots(data);
      } catch (err) {
        if (!alive) return;
        setSnapshots([]);
        setErrorText("—");
        // TODO: Add locked copy for snapshot list error states to docs/LOCKED_COPY.md.
      } finally {
        if (alive) setLoading(false);
      }
    }

    if (enabled) {
      void run();
    } else if (disabledBehavior === "reset") {
      setSnapshots([]);
      setLoading(false);
      setErrorText(null);
    } else if (disabledBehavior === "clear") {
      setSnapshots([]);
    }

    return () => {
      alive = false;
    };
  }, [disabledBehavior, enabled, limit]);

  return { snapshots, loading, errorText };
}
