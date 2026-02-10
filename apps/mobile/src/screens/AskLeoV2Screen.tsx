import React from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { GravityCard } from "../components/GravityCard";
import { useDemoMode } from "../demo/demoMode";
import { askLeoV2, AskLeoV2Citation, NOT_AVAILABLE_IN_SNAPSHOT } from "../lib/askLeoV2";
import { buildLeoContextPack, LeoVisionQuickActionKey, renderLeoVisionAnswer } from "../lib/leoVision";
import type {
  InvestorPositionRow,
  MetricValueRow,
  SnapshotRow,
  SnapshotSourceRow,
} from "../lib/rpc";
import { buildSnapshotContext } from "../lib/snapshotContext";
import type { ShellRouteKey } from "../shell/routes";
import { theme } from "../theme/theme";

type LeoResponseModel = {
  summary: string;
  what_changed: string;
  context: string;
  citations: AskLeoV2Citation[];
};

function nonEmptyOrDash(v: string | null | undefined): string {
  return v && v.trim().length > 0 ? v : "—";
}

function asCitationCardsFromSnapshotSources(sources: SnapshotSourceRow[]): AskLeoV2Citation[] {
  return (sources ?? []).map((s) => ({
    title: nonEmptyOrDash(s.title),
    type: nonEmptyOrDash(s.source_type),
    date: "—",
    url: nonEmptyOrDash(s.url),
  }));
}

function inferSafeActionFromQuestion(q: string): LeoVisionQuickActionKey {
  const qLower = q.toLowerCase();
  return qLower.includes("change") || qLower.includes("changed") || qLower.includes("since last")
    ? "what_changed_since_last_snapshot"
    : qLower.includes("brief") || qLower.includes("pack")
      ? "create_investor_brief"
      : qLower.includes("check") && qLower.includes("next")
        ? "what_should_i_check_next"
        : qLower.includes("explain")
          ? "explain_screen"
          : "what_should_i_check_next";
}

function AccordionSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <GravityCard style={styles.sectionCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${open ? "Collapse" : "Expand"} ${title}`}
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [styles.sectionHeader, pressed && styles.sectionHeaderPressed]}
      >
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionChevron}>{open ? "−" : "+"}</Text>
      </Pressable>
      {open ? <View style={styles.sectionBody}>{children}</View> : null}
    </GravityCard>
  );
}

export function AskLeoV2Screen({
  snapshot,
  screenTitle,
  route,
  getCurrentLoaded,
}: {
  snapshot: SnapshotRow | null;
  screenTitle: string;
  route: ShellRouteKey;
  getCurrentLoaded: () => Promise<{
    position: InvestorPositionRow | null;
    metrics: MetricValueRow[];
    sources: SnapshotSourceRow[];
  } | null>;
}) {
  const { demoModeEnabled } = useDemoMode();

  const [question, setQuestion] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [errorText, setErrorText] = React.useState<string | null>(null);
  const [response, setResponse] = React.useState<LeoResponseModel | null>(null);

  const citationsCount = response?.citations?.length ?? 0;

  const missingSections = React.useMemo(() => {
    const r = response;
    if (!r) return ["Summary", "What changed", "Context", "Sources"];
    const missing: string[] = [];
    if (!r.summary || r.summary.trim().length === 0 || r.summary.trim() === "—") missing.push("Summary");
    if (!r.what_changed || r.what_changed.trim().length === 0 || r.what_changed.trim() === "—") missing.push("What changed");
    if (!r.context || r.context.trim().length === 0 || r.context.trim() === "—") missing.push("Context");
    if ((r.citations?.length ?? 0) === 0) missing.push("Sources");
    return missing;
  }, [response]);

  const showWhyPanel =
    response?.summary === NOT_AVAILABLE_IN_SNAPSHOT || (response != null && missingSections.length > 0);

  async function handleRun() {
    if (sending) return;
    const q = question.trim();
    if (!q) return;

    setSending(true);
    setErrorText(null);

    try {
      if (!snapshot?.id) {
        setResponse({
          summary: NOT_AVAILABLE_IN_SNAPSHOT,
          what_changed: "",
          context: "",
          citations: [],
        });
        return;
      }

      if (demoModeEnabled) {
        const curLoaded = await getCurrentLoaded();
        const curPack = buildLeoContextPack({
          screenTitle,
          route,
          snapshot,
          position: curLoaded?.position ?? null,
          metrics: curLoaded?.metrics ?? [],
          sources: curLoaded?.sources ?? [],
        });

        const inferredAction = inferSafeActionFromQuestion(q);
        const demoAnswer = renderLeoVisionAnswer({
          action: inferredAction,
          current: curPack,
          previous: null,
        });
        setResponse({
          summary: demoAnswer || "—",
          what_changed: "—",
          context: "—",
          citations: asCitationCardsFromSnapshotSources(curLoaded?.sources ?? []),
        });
        return;
      }

      const snapshotContext = await buildSnapshotContext(snapshot.id, snapshot);
      const v2 = await askLeoV2({
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

      const normalized: LeoResponseModel = {
        summary: v2.summary || NOT_AVAILABLE_IN_SNAPSHOT,
        what_changed: v2.what_changed?.trim().length ? v2.what_changed : "—",
        context: v2.context?.trim().length ? v2.context : "—",
        citations: v2.citations ?? [],
      };

      // Hard requirement: if missing/invalid, show exact phrase.
      if (!normalized.summary || normalized.summary.trim().length === 0) {
        normalized.summary = NOT_AVAILABLE_IN_SNAPSHOT;
      }

      setResponse(normalized);
    } catch {
      setErrorText("Leo is unavailable. Try again.");
      setResponse({
        summary: NOT_AVAILABLE_IN_SNAPSHOT,
        what_changed: "",
        context: "",
        citations: [],
      });
    } finally {
      setSending(false);
    }
  }

  function handleOpenUrl(url: string) {
    const u = url.trim();
    if (!u || u === "—") {
      Alert.alert("No link available");
      return;
    }
    void Linking.openURL(u).catch(() => Alert.alert("No link available"));
  }

  return (
    <View style={styles.root}>
      <GravityCard style={styles.commandCard}>
        <Text style={styles.commandTitle}>Leo Vision v2</Text>
        <Text style={styles.commandMeta}>
          Snapshot-scoped. Read-only. No calculations or predictions.
        </Text>

        <View style={styles.commandRow}>
          <TextInput
            value={question}
            onChangeText={setQuestion}
            placeholder="Ask about this snapshot…"
            placeholderTextColor={theme.colors.subtle}
            editable={!sending}
            style={styles.commandInput}
            autoCapitalize="sentences"
            autoCorrect
            multiline
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Run"
            disabled={sending || question.trim().length === 0}
            onPress={() => void handleRun()}
            style={({ pressed }) => [
              styles.runButton,
              (sending || question.trim().length === 0) && styles.runButtonDisabled,
              pressed && styles.runButtonPressed,
            ]}
          >
            <Text style={styles.runButtonText}>{sending ? "…" : "Run"}</Text>
          </Pressable>
        </View>

        {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
      </GravityCard>

      <GravityCard style={styles.previewCard}>
        <Text style={styles.previewTitle}>Snapshot context</Text>
        <Text style={styles.previewLine}>
          {snapshot ? nonEmptyOrDash(snapshot.snapshot_month) : "—"} ·{" "}
          {snapshot ? nonEmptyOrDash(snapshot.snapshot_kind) : "—"} ·{" "}
          {snapshot?.project_key ? snapshot.project_key : "—"}
        </Text>
        <Text style={styles.previewMeta}>
          Sources: {citationsCount} · Created: {snapshot ? nonEmptyOrDash(snapshot.created_at) : "—"}
        </Text>
      </GravityCard>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} alwaysBounceVertical={false}>
        <AccordionSection title="Summary">
          <Text style={styles.sectionText}>{response?.summary?.trim().length ? response.summary : "—"}</Text>
        </AccordionSection>

        <AccordionSection title="What changed">
          <Text style={styles.sectionText}>{response?.what_changed?.trim().length ? response.what_changed : "—"}</Text>
        </AccordionSection>

        <AccordionSection title="Context">
          <Text style={styles.sectionText}>{response?.context?.trim().length ? response.context : "—"}</Text>
        </AccordionSection>

        <AccordionSection title="Sources">
          {(response?.citations?.length ?? 0) === 0 ? (
            <Text style={styles.sectionText}>—</Text>
          ) : (
            <View style={styles.sourcesList}>
              {response!.citations.map((c, idx) => (
                <Pressable
                  key={`${c.title}:${idx}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Open source ${c.title}`}
                  onPress={() => handleOpenUrl(c.url)}
                  style={({ pressed }) => [styles.sourceCard, pressed && styles.sourceCardPressed]}
                >
                  <Text style={styles.sourceTitle}>{c.title}</Text>
                  <Text style={styles.sourceMeta}>
                    {nonEmptyOrDash(c.type)} · {nonEmptyOrDash(c.date)}
                  </Text>
                  <Text style={styles.sourceUrl} numberOfLines={2}>
                    {nonEmptyOrDash(c.url)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </AccordionSection>

        {showWhyPanel ? (
          <GravityCard style={styles.whyCard}>
            <Text style={styles.whyTitle}>Why Leo can’t answer</Text>
            <Text style={styles.whyBody}>This snapshot doesn’t contain the requested field.</Text>

            <Text style={styles.whySubtitle}>Try one of these snapshot-scoped questions</Text>
            {[
              "What’s included in this snapshot?",
              "What does my position summary say in this snapshot?",
              "List the available metric keys in this snapshot.",
              "Which sources/documents are linked to this snapshot?",
              "What is not available in this snapshot?",
            ].map((s) => (
              <Text key={s} style={styles.whySuggestion}>
                - {s}
              </Text>
            ))}

            {missingSections.length > 0 ? (
              <>
                <Text style={styles.whySubtitle}>Missing sections</Text>
                <Text style={styles.whyBody}>{missingSections.join(", ")}</Text>
              </>
            ) : null}
          </GravityCard>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: theme.spacing.md,
  },
  commandCard: {
    padding: theme.spacing.md,
  },
  commandTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 4,
  },
  commandMeta: {
    color: theme.colors.subtle,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: theme.spacing.sm,
  },
  commandRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    alignItems: "flex-end",
  },
  commandInput: {
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
  runButton: {
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.panel,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  runButtonDisabled: {
    opacity: 0.6,
  },
  runButtonPressed: {
    opacity: 0.9,
  },
  runButtonText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "900",
  },
  errorText: {
    color: theme.colors.subtle,
    fontSize: 12,
    marginTop: theme.spacing.xs,
  },

  previewCard: {
    padding: theme.spacing.md,
  },
  previewTitle: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.2,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  previewLine: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  previewMeta: {
    color: theme.colors.subtle,
    fontSize: 12,
    lineHeight: 16,
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },

  sectionCard: {
    padding: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionHeaderPressed: {
    opacity: 0.9,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  sectionChevron: {
    color: theme.colors.muted,
    fontSize: 16,
    fontWeight: "900",
  },
  sectionBody: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  sectionText: {
    color: theme.colors.subtle,
    fontSize: 12,
    lineHeight: 16,
  },

  sourcesList: {
    gap: theme.spacing.sm,
  },
  sourceCard: {
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.panel,
    padding: theme.spacing.sm,
  },
  sourceCardPressed: {
    opacity: 0.9,
  },
  sourceTitle: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 2,
  },
  sourceMeta: {
    color: theme.colors.muted,
    fontSize: 11,
    marginBottom: 4,
  },
  sourceUrl: {
    color: theme.colors.subtle,
    fontSize: 11,
    lineHeight: 15,
  },

  whyCard: {
    padding: theme.spacing.md,
    borderColor: theme.colors.accentSoft,
  },
  whyTitle: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 6,
  },
  whySubtitle: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.2,
    textTransform: "uppercase",
    marginTop: theme.spacing.sm,
    marginBottom: 4,
  },
  whyBody: {
    color: theme.colors.subtle,
    fontSize: 12,
    lineHeight: 16,
  },
  whySuggestion: {
    color: theme.colors.subtle,
    fontSize: 12,
    lineHeight: 16,
  },
});

