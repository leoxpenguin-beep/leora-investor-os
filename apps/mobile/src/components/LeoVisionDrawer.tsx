import * as Clipboard from "expo-clipboard";
import React from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { GravityCard } from "./GravityCard";
import { GravityDot } from "./GravityDot";
import { buildLeoContextPack, LeoVisionQuickActionKey, renderLeoVisionAnswer } from "../lib/leoVision";
import {
  InvestorPositionRow,
  MetricValueRow,
  rpcGetInvestorPosition,
  rpcListMetricValues,
  rpcListSnapshotSources,
  rpcListSnapshots,
  SnapshotRow,
  SnapshotSourceRow,
} from "../lib/rpc";
import { AskLeoV2Screen } from "../screens/AskLeoV2Screen";
import type { ShellRouteKey } from "../shell/routes";
import { theme } from "../theme/theme";

type LeoVisionDrawerProps = {
  visible: boolean;
  onClose: () => void;
  route: ShellRouteKey;
  screenTitle: string;
  snapshot: SnapshotRow | null;
};

type LoadedSnapshotData = {
  snapshotId: string;
  position: InvestorPositionRow | null;
  metrics: MetricValueRow[];
  sources: SnapshotSourceRow[];
};

type DrawerTabKey = "vision" | "v2";

function actionLabel(action: LeoVisionQuickActionKey): string {
  return action === "explain_screen"
    ? "Explain this screen"
    : action === "what_changed_since_last_snapshot"
      ? "What changed since last snapshot?"
      : action === "what_should_i_check_next"
        ? "What should I check next?"
        : "Create Investor Brief (from Export Pack)";
}

async function loadSnapshotData(snapshot: SnapshotRow | null): Promise<LoadedSnapshotData | null> {
  if (!snapshot?.id) return null;

  const [posRes, metricsRes, sourcesRes] = await Promise.allSettled([
    rpcGetInvestorPosition(snapshot.id),
    rpcListMetricValues(snapshot.id),
    rpcListSnapshotSources(snapshot.id),
  ]);

  return {
    snapshotId: snapshot.id,
    position: posRes.status === "fulfilled" ? posRes.value : null,
    metrics: metricsRes.status === "fulfilled" ? metricsRes.value : [],
    sources: sourcesRes.status === "fulfilled" ? sourcesRes.value : [],
  };
}

async function findPreviousSnapshot(current: SnapshotRow): Promise<SnapshotRow | null> {
  try {
    const list = await rpcListSnapshots({
      p_snapshot_kind: current.snapshot_kind ?? null,
      p_project_key: current.project_key ?? null,
      p_limit: 50,
    });

    const sorted = [...list].sort((a, b) => {
      const monthCmp = (b.snapshot_month ?? "").localeCompare(a.snapshot_month ?? "");
      if (monthCmp !== 0) return monthCmp;
      return (b.created_at ?? "").localeCompare(a.created_at ?? "");
    });

    const idx = sorted.findIndex((s) => s.id === current.id);
    return idx >= 0 ? sorted[idx + 1] ?? null : null;
  } catch {
    return null;
  }
}

export function LeoVisionDrawer({ visible, onClose, route, screenTitle, snapshot }: LeoVisionDrawerProps) {
  const [tab, setTab] = React.useState<DrawerTabKey>("v2");

  const [activeAction, setActiveAction] = React.useState<LeoVisionQuickActionKey | null>(null);
  const [answerText, setAnswerText] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [copyMeta, setCopyMeta] = React.useState<string | null>(null);

  const [currentLoaded, setCurrentLoaded] = React.useState<LoadedSnapshotData | null>(null);

  React.useEffect(() => {
    if (!visible) return;
    // Reset transient UI when opening.
    setCopyMeta(null);
    setLoading(false);
  }, [visible]);

  React.useEffect(() => {
    // If the active snapshot changes, invalidate cached snapshot data.
    setCurrentLoaded((prev) => {
      if (!snapshot?.id) return null;
      if (!prev) return null;
      return prev.snapshotId === snapshot.id ? prev : null;
    });
  }, [snapshot?.id]);

  async function ensureCurrentLoaded(): Promise<LoadedSnapshotData | null> {
    if (!snapshot?.id) return null;
    if (currentLoaded?.snapshotId === snapshot.id) return currentLoaded;
    const next = await loadSnapshotData(snapshot);
    setCurrentLoaded(next);
    return next;
  }

  async function getCurrentForV2(): Promise<{
    position: InvestorPositionRow | null;
    metrics: MetricValueRow[];
    sources: SnapshotSourceRow[];
  } | null> {
    const loaded = await ensureCurrentLoaded();
    if (!loaded) return null;
    return { position: loaded.position, metrics: loaded.metrics, sources: loaded.sources };
  }

  async function runAction(action: LeoVisionQuickActionKey) {
    setActiveAction(action);
    setCopyMeta(null);
    setLoading(true);

    try {
      const curLoaded = await ensureCurrentLoaded();
      const curPack = buildLeoContextPack({
        screenTitle,
        route,
        snapshot,
        position: curLoaded?.position ?? null,
        metrics: curLoaded?.metrics ?? [],
        sources: curLoaded?.sources ?? [],
      });

      if (action === "what_changed_since_last_snapshot" && snapshot?.id) {
        const prevSnapshot = await findPreviousSnapshot(snapshot);
        const prevLoaded = await loadSnapshotData(prevSnapshot);
        const prevPack = prevSnapshot
          ? buildLeoContextPack({
              screenTitle,
              route,
              snapshot: prevSnapshot,
              position: prevLoaded?.position ?? null,
              metrics: prevLoaded?.metrics ?? [],
              sources: prevLoaded?.sources ?? [],
            })
          : null;

        setAnswerText(
          renderLeoVisionAnswer({
            action,
            current: curPack,
            previous: prevPack,
          })
        );
        return;
      }

      setAnswerText(
        renderLeoVisionAnswer({
          action,
          current: curPack,
          previous: null,
        })
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyResponse() {
    if (!answerText) return;
    setCopyMeta(null);
    try {
      await Clipboard.setStringAsync(answerText);
      setCopyMeta("Copied.");
    } catch {
      setCopyMeta("—");
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable
          style={styles.backdrop}
          accessibilityRole="button"
          accessibilityLabel="Close Ask Leo"
          onPress={onClose}
        />

        <KeyboardAvoidingView
          style={styles.sheet}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHeaderLeft}>
              <GravityDot size={10} />
              <Text style={styles.sheetTitle}>Ask Leo</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={({ pressed }) => [pressed && styles.closePressed]}
            >
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <View style={styles.sheetMetaRow}>
            <Text style={styles.sheetMeta}>
              Snapshot-scoped. Read-only data only. No calculations or predictions.
            </Text>
          </View>

          <View style={styles.tabRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Leo Vision tab"
              onPress={() => setTab("vision")}
              style={({ pressed }) => [
                styles.tabButton,
                tab === "vision" && styles.tabButtonActive,
                pressed && styles.tabButtonPressed,
              ]}
            >
              <Text style={[styles.tabText, tab === "vision" && styles.tabTextActive]}>
                Leo Vision
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Leo Vision v2 tab"
              onPress={() => setTab("v2")}
              style={({ pressed }) => [
                styles.tabButton,
                tab === "v2" && styles.tabButtonActive,
                pressed && styles.tabButtonPressed,
              ]}
            >
              <Text style={[styles.tabText, tab === "v2" && styles.tabTextActive]}>
                Leo Vision v2
              </Text>
            </Pressable>
          </View>

          {tab === "vision" ? (
            <>
              <Text style={styles.legacyNote}>Quick actions are now in v2.</Text>
              <View style={styles.actions}>
                {(
                  [
                    "explain_screen",
                    "what_changed_since_last_snapshot",
                    "what_should_i_check_next",
                    "create_investor_brief",
                  ] as const
                ).map((key) => {
                  const isActive = activeAction === key;
                  return (
                    <Pressable
                      key={key}
                      accessibilityRole="button"
                      accessibilityLabel={actionLabel(key)}
                      disabled={loading}
                      onPress={() => void runAction(key)}
                      style={({ pressed }) => [
                        styles.actionButton,
                        isActive && styles.actionButtonActive,
                        loading && styles.actionButtonDisabled,
                        pressed && styles.actionButtonPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.actionButtonText,
                          isActive && styles.actionButtonTextActive,
                        ]}
                      >
                        {actionLabel(key)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <GravityCard style={styles.responseCard}>
                <View style={styles.responseHeader}>
                  <Text style={styles.responseTitle}>
                    {activeAction ? actionLabel(activeAction) : "Response"}
                  </Text>
                  {answerText ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Copy response"
                      onPress={() => void handleCopyResponse()}
                      style={({ pressed }) => [styles.copyButton, pressed && styles.copyButtonPressed]}
                    >
                      <Text style={styles.copyButtonText}>Copy</Text>
                    </Pressable>
                  ) : null}
                </View>

                {loading ? (
                  <Text style={styles.responseMeta}>Loading…</Text>
                ) : answerText ? (
                  <ScrollView
                    style={styles.responseScroll}
                    contentContainerStyle={styles.responseScrollContent}
                    alwaysBounceVertical={false}
                  >
                    <Text style={styles.responseText} selectable>
                      {answerText}
                    </Text>
                  </ScrollView>
                ) : (
                  <Text style={styles.responseMeta}>Choose a prompt above.</Text>
                )}

                {copyMeta ? <Text style={styles.responseMeta}>{copyMeta}</Text> : null}
              </GravityCard>
            </>
          ) : (
            <>
              <AskLeoV2Screen
                snapshot={snapshot}
                screenTitle={screenTitle}
                route={route}
                getCurrentLoaded={getCurrentForV2}
              />
            </>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bg,
    paddingBottom: theme.spacing.md,
    maxHeight: "88%",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sheetHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  sheetTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
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
  sheetMetaRow: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  sheetMeta: {
    color: theme.colors.subtle,
    fontSize: 12,
    lineHeight: 16,
  },

  tabRow: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  tabButton: {
    flex: 1,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.panel,
    paddingVertical: 8,
    alignItems: "center",
  },
  tabButtonActive: {
    borderColor: theme.colors.accentSoft,
    backgroundColor: theme.colors.panelElevated,
  },
  tabButtonPressed: {
    opacity: 0.9,
  },
  tabText: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "900",
  },
  tabTextActive: {
    color: theme.colors.text,
  },

  actions: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  legacyNote: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    color: theme.colors.subtle,
    fontSize: 12,
    lineHeight: 16,
  },
  actionButton: {
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.panel,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
  },
  actionButtonActive: {
    borderColor: theme.colors.accentSoft,
    backgroundColor: theme.colors.panelElevated,
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
    lineHeight: 18,
  },
  actionButtonTextActive: {
    color: theme.colors.text,
  },

  responseCard: {
    marginTop: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
  },
  responseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  responseTitle: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "900",
    flex: 1,
  },
  responseMeta: {
    color: theme.colors.subtle,
    fontSize: 12,
    lineHeight: 16,
    marginTop: theme.spacing.xs,
  },
  responseScroll: {
    maxHeight: 320,
  },
  responseScrollContent: {
    paddingBottom: theme.spacing.sm,
  },
  responseText: {
    color: theme.colors.subtle,
    fontSize: 12,
    lineHeight: 16,
  },
  copyButton: {
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.panel,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  copyButtonPressed: {
    opacity: 0.9,
  },
  copyButtonText: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "900",
  },

  chatCard: {
    marginTop: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
  },
  chatMeta: {
    color: theme.colors.subtle,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: theme.spacing.sm,
  },
  chatScroll: {
    maxHeight: 340,
  },
  chatScrollContent: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  bubble: {
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm,
  },
  bubbleUser: {
    backgroundColor: theme.colors.panel,
    alignSelf: "flex-end",
    maxWidth: "92%",
  },
  bubbleAssistant: {
    backgroundColor: theme.colors.panelElevated,
    alignSelf: "flex-start",
    maxWidth: "92%",
  },
  bubbleLabel: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  bubbleText: {
    color: theme.colors.subtle,
    fontSize: 12,
    lineHeight: 16,
  },
  bubbleDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
  },
  chatInputRow: {
    marginTop: theme.spacing.sm,
    flexDirection: "row",
    gap: theme.spacing.sm,
    alignItems: "flex-end",
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: theme.colors.text,
    backgroundColor: theme.colors.panel,
    minHeight: 44,
    maxHeight: 120,
  },
  sendButton: {
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.panel,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonPressed: {
    opacity: 0.9,
  },
  sendButtonText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "900",
  },
});

