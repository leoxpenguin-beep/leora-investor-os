import React from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { GravityCard } from "../components/GravityCard";
import { getSupabaseEnvStatus } from "../lib/supabaseClient";
import { rpcListSnapshots, SnapshotRow } from "../lib/rpc";
import { theme } from "../theme/theme";

type SnapshotSelectorProps = {
  selectedSnapshot: SnapshotRow | null;
  onSelectSnapshot: (snapshot: SnapshotRow) => void;
  onOpenSnapshotDetail?: () => void;
};

export function SnapshotSelector({
  selectedSnapshot,
  onSelectSnapshot,
  onOpenSnapshotDetail,
}: SnapshotSelectorProps) {
  const env = getSupabaseEnvStatus();
  const isEnabled = env.hasUrl && env.hasAnonKey;

  const [open, setOpen] = React.useState(false);
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
      } catch (err) {
        if (!alive) return;
        setSnapshots([]);
        setErrorText("—");
        // TODO: Add locked copy for snapshot selector error states to docs/LOCKED_COPY.md.
      } finally {
        if (alive) setLoading(false);
      }
    }

    if (open && isEnabled) {
      void run();
    } else if (!open) {
      setSnapshots([]);
      setLoading(false);
      setErrorText(null);
    }

    return () => {
      alive = false;
    };
  }, [open, isEnabled]);

  const selectedLabel = selectedSnapshot ? selectedSnapshot.snapshot_month : "—";

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Snapshot selector"
        disabled={!isEnabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          !isEnabled && styles.triggerDisabled,
          pressed && styles.triggerPressed,
        ]}
      >
        <Text style={styles.triggerText}>{selectedLabel}</Text>
        <Text style={styles.triggerChevron}>▾</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.backdrop}
            accessibilityRole="button"
            accessibilityLabel="Close snapshot selector"
            onPress={() => setOpen(false)}
          />

          <GravityCard style={styles.modalCard}>
            <View style={styles.modalHeader}>
              {/* TODO: Use locked copy for the selector title in docs/LOCKED_COPY.md. */}
              <Text style={styles.modalTitle}>Select snapshot</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={() => setOpen(false)}
                style={({ pressed }) => [pressed && styles.closePressed]}
              >
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open Snapshot Detail"
                disabled={!selectedSnapshot || !onOpenSnapshotDetail}
                onPress={() => {
                  if (!selectedSnapshot || !onOpenSnapshotDetail) return;
                  setOpen(false);
                  onOpenSnapshotDetail();
                }}
                style={({ pressed }) => [
                  styles.actionButton,
                  (!selectedSnapshot || !onOpenSnapshotDetail) && styles.actionButtonDisabled,
                  pressed && styles.actionButtonPressed,
                ]}
              >
                <Text style={styles.actionButtonText}>Open Snapshot Detail</Text>
              </Pressable>
            </View>

            {!isEnabled ? (
              <Text style={styles.modalMeta}>
                Missing env: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
              </Text>
            ) : loading ? (
              <Text style={styles.modalMeta}>Loading…</Text>
            ) : errorText ? (
              <Text style={styles.modalMeta}>{errorText}</Text>
            ) : snapshots.length === 0 ? (
              <Text style={styles.modalMeta}>—</Text>
            ) : (
              <FlatList
                data={snapshots}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => {
                  const isSelected = item.id === selectedSnapshot?.id;
                  const right =
                    item.snapshot_kind === "project"
                      ? item.project_key ?? "—"
                      : item.snapshot_kind;

                  return (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        onSelectSnapshot(item);
                        setOpen(false);
                      }}
                      style={({ pressed }) => [
                        styles.row,
                        isSelected && styles.rowSelected,
                        pressed && styles.rowPressed,
                      ]}
                    >
                      <View style={styles.rowTop}>
                        <Text style={styles.rowLabel}>{item.snapshot_month}</Text>
                        <View style={styles.rowRight}>
                          {isSelected ? (
                            <Text style={styles.rowCheck}>✓</Text>
                          ) : null}
                          <Text style={styles.rowValue}>{right}</Text>
                        </View>
                      </View>
                      <Text style={styles.rowMeta}>{item.label ?? "—"}</Text>
                    </Pressable>
                  );
                }}
              />
            )}
          </GravityCard>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.panel,
  },
  triggerDisabled: {
    opacity: 0.6,
  },
  triggerPressed: {
    opacity: 0.9,
  },
  triggerText: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  triggerChevron: {
    color: theme.colors.subtle,
    fontSize: 12,
    marginTop: -1,
  },

  modalRoot: {
    flex: 1,
    justifyContent: "center",
    padding: theme.spacing.md,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  modalCard: {
    maxHeight: 520,
    paddingVertical: theme.spacing.md,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalActions: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  actionButton: {
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.panel,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    alignItems: "center",
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonPressed: {
    opacity: 0.9,
  },
  actionButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  closeText: {
    color: theme.colors.muted,
    fontSize: 22,
    lineHeight: 22,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  closePressed: {
    opacity: 0.8,
  },
  modalMeta: {
    color: theme.colors.subtle,
    fontSize: 12,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },

  list: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  row: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.panel,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
  },
  rowSelected: {
    borderColor: theme.colors.accentSoft,
    backgroundColor: theme.colors.panelElevated,
  },
  rowPressed: {
    opacity: 0.9,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  rowLabel: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  rowCheck: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: "800",
  },
  rowValue: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  rowMeta: {
    color: theme.colors.subtle,
    fontSize: 12,
    marginTop: theme.spacing.xs,
  },
});

