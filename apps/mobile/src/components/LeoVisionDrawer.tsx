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
  TextInput,
  View,
} from "react-native";

import { GravityCard } from "./GravityCard";
import { GravityDot } from "./GravityDot";
import { buildLeoContextPack, LeoVisionQuickActionKey, renderLeoVisionAnswer } from "../lib/leoVision";
import { callAskLeo, type AskLeoEdgeEvidence } from "../lib/callAskLeo";
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
import { buildSnapshotContext } from "../lib/snapshotContext";
import { useDemoMode } from "../demo/demoMode";
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

type DrawerTabKey = "vision" | "chat_v1";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  evidence?: AskLeoEdgeEvidence;
};

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
  const [tab, setTab] = React.useState<DrawerTabKey>("chat_v1");

  const [activeAction, setActiveAction] = React.useState<LeoVisionQuickActionKey | null>(null);
  const [answerText, setAnswerText] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [copyMeta, setCopyMeta] = React.useState<string | null>(null);

  const [currentLoaded, setCurrentLoaded] = React.useState<LoadedSnapshotData | null>(null);

  const [questionText, setQuestionText] = React.useState("");
  const [chatSending, setChatSending] = React.useState(false);
  const [chatErrorText, setChatErrorText] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);

  const { demoModeEnabled } = useDemoMode();

  React.useEffect(() => {
    if (!visible) return;
    // Reset transient UI when opening.
    setCopyMeta(null);
    setLoading(false);
    setChatErrorText(null);
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

  async function handleSendQuestion() {
    if (chatSending) return;
    const q = questionText.trim();
    if (!q) return;

    setQuestionText("");
    setChatErrorText(null);

    const userMsg: ChatMessage = {
      id: `${Date.now()}:user`,
      role: "user",
      text: q,
    };
    setMessages((prev) => [...prev, userMsg]);
    setChatSending(true);

    try {
      if (!snapshot?.id) {
        const assistantMsg: ChatMessage = {
          id: `${Date.now()}:assistant`,
          role: "assistant",
          text: "Not available in this snapshot.",
          evidence: { metrics_used: [], sources_used: [] },
        };
        setMessages((prev) => [...prev, assistantMsg]);
        return;
      }

      // Demo Mode must never call the edge function.
      if (demoModeEnabled) {
        const curLoaded = await ensureCurrentLoaded();
        const curPack = buildLeoContextPack({
          screenTitle,
          route,
          snapshot,
          position: curLoaded?.position ?? null,
          metrics: curLoaded?.metrics ?? [],
          sources: curLoaded?.sources ?? [],
        });

        const qLower = q.toLowerCase();
        const inferredAction: LeoVisionQuickActionKey =
          qLower.includes("change") || qLower.includes("changed") || qLower.includes("since last")
            ? "what_changed_since_last_snapshot"
            : qLower.includes("brief") || qLower.includes("pack")
              ? "create_investor_brief"
              : qLower.includes("check") && qLower.includes("next")
                ? "what_should_i_check_next"
                : qLower.includes("explain")
                  ? "explain_screen"
                  : "what_should_i_check_next";

        const prevPack =
          inferredAction === "what_changed_since_last_snapshot" && snapshot?.id
            ? (() => {
                return findPreviousSnapshot(snapshot).then(async (prevSnapshot) => {
                  if (!prevSnapshot) return null;
                  const prevLoaded = await loadSnapshotData(prevSnapshot);
                  return buildLeoContextPack({
                    screenTitle,
                    route,
                    snapshot: prevSnapshot,
                    position: prevLoaded?.position ?? null,
                    metrics: prevLoaded?.metrics ?? [],
                    sources: prevLoaded?.sources ?? [],
                  });
                });
              })()
            : Promise.resolve(null);

        const resolvedPrev = await prevPack;
        const demoAnswer = renderLeoVisionAnswer({
          action: inferredAction,
          current: curPack,
          previous: resolvedPrev,
        });

        const assistantMsg: ChatMessage = {
          id: `${Date.now()}:assistant`,
          role: "assistant",
          text: demoAnswer,
          evidence: { metrics_used: [], sources_used: [] },
        };
        setMessages((prev) => [...prev, assistantMsg]);
        return;
      }

      const snapshotContext = await buildSnapshotContext(snapshot.id, snapshot);
      const res = await callAskLeo({
        question: q,
        snapshotContext,
        activeSnapshot: {
          snapshot_month: snapshot.snapshot_month ?? null,
          snapshot_kind: snapshot.snapshot_kind ?? null,
          project_key: snapshot.project_key ?? null,
          created_at: snapshot.created_at ?? null,
          label: snapshot.label ?? null,
        },
      });

      const assistantMsg: ChatMessage = {
        id: `${Date.now()}:assistant`,
        role: "assistant",
        text: res.answerText || "—",
        evidence: res.evidence,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setChatErrorText("Leo is unavailable. Try again.");
      const assistantMsg: ChatMessage = {
        id: `${Date.now()}:assistant_error`,
        role: "assistant",
        text: "Leo is unavailable. Try again.",
        evidence: { metrics_used: [], sources_used: [] },
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setChatSending(false);
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
              accessibilityLabel="Ask Leo v1 tab"
              onPress={() => setTab("chat_v1")}
              style={({ pressed }) => [
                styles.tabButton,
                tab === "chat_v1" && styles.tabButtonActive,
                pressed && styles.tabButtonPressed,
              ]}
            >
              <Text style={[styles.tabText, tab === "chat_v1" && styles.tabTextActive]}>
                Ask Leo v1
              </Text>
            </Pressable>
          </View>

          {tab === "vision" ? (
            <>
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
              <GravityCard style={styles.chatCard}>
                <Text style={styles.chatMeta}>
                  Active snapshot: {snapshot ? snapshot.snapshot_month : "—"} ·{" "}
                  {snapshot ? snapshot.snapshot_kind : "—"} · {snapshot?.project_key ?? "—"}
                </Text>
                <ScrollView
                  style={styles.chatScroll}
                  contentContainerStyle={styles.chatScrollContent}
                  alwaysBounceVertical={false}
                >
                  {messages.length === 0 ? (
                    <Text style={styles.responseMeta}>Ask a question about this snapshot.</Text>
                  ) : (
                    messages.map((m) => (
                      <View
                        key={m.id}
                        style={[
                          styles.bubble,
                          m.role === "user" ? styles.bubbleUser : styles.bubbleAssistant,
                        ]}
                      >
                        {m.role === "assistant" ? (
                          <>
                            <Text style={styles.bubbleLabel}>Answer</Text>
                            <Text style={styles.bubbleText}>{m.text}</Text>

                            <View style={styles.bubbleDivider} />

                            <Text style={styles.bubbleLabel}>Evidence used</Text>
                            {(() => {
                              const metricLines = (m.evidence?.metrics_used ?? [])
                                .map((v) => v.trim())
                                .filter((v) => v.length > 0);
                              const sourceLines = (m.evidence?.sources_used ?? [])
                                .map((s) => `[source] ${s.title.trim()} — ${s.url.trim() || "—"}`)
                                .filter((v) => v.trim().length > 0);

                              const evidenceLines = [...metricLines, ...sourceLines];
                              if (evidenceLines.length === 0) return <Text style={styles.bubbleText}>- —</Text>;

                              return (
                                <>
                                  {evidenceLines.map((v) => (
                                    <Text key={`evidence:${m.id}:${v}`} style={styles.bubbleText}>
                                      - {v}
                                    </Text>
                                  ))}
                                </>
                              );
                            })()}
                          </>
                        ) : (
                          <Text style={styles.bubbleText}>{m.text}</Text>
                        )}
                      </View>
                    ))
                  )}
                  {chatSending ? <Text style={styles.responseMeta}>Sending…</Text> : null}
                  {chatErrorText ? <Text style={styles.responseMeta}>{chatErrorText}</Text> : null}
                </ScrollView>

                <View style={styles.chatInputRow}>
                  <TextInput
                    value={questionText}
                    onChangeText={setQuestionText}
                    autoCapitalize="sentences"
                    autoCorrect
                    placeholder="Ask about this snapshot…"
                    placeholderTextColor={theme.colors.subtle}
                    style={styles.chatInput}
                    editable={!chatSending}
                    multiline
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Send"
                    disabled={chatSending || questionText.trim().length === 0}
                    onPress={() => void handleSendQuestion()}
                    style={({ pressed }) => [
                      styles.sendButton,
                      (chatSending || questionText.trim().length === 0) && styles.sendButtonDisabled,
                      pressed && styles.sendButtonPressed,
                    ]}
                  >
                    <Text style={styles.sendButtonText}>{chatSending ? "…" : "Send"}</Text>
                  </Pressable>
                </View>
              </GravityCard>
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

