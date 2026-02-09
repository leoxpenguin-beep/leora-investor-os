import React from "react";
import {
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { GravityCard } from "../components/GravityCard";
import { GravityDot } from "../components/GravityDot";
import { rpcListSnapshotSources, SnapshotRow, SnapshotSourceRow } from "../lib/rpc";
import { getSupabaseEnvStatus } from "../lib/supabaseClient";
import { theme } from "../theme/theme";

export function DocumentsSourcesScreen({
  snapshot,
  onBack,
}: {
  snapshot: SnapshotRow | null;
  onBack?: () => void;
}) {
  const env = getSupabaseEnvStatus();

  const [sources, setSources] = React.useState<SnapshotSourceRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [errorText, setErrorText] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;

    async function run(snapshotId: string) {
      setLoading(true);
      setErrorText(null);
      try {
        const data = await rpcListSnapshotSources(snapshotId);
        if (!alive) return;
        setSources(data);
      } catch (err) {
        if (!alive) return;
        setSources([]);
        setErrorText("—");
        // TODO: Add locked copy for documents/sources error states to docs/LOCKED_COPY.md.
      } finally {
        if (alive) setLoading(false);
      }
    }

    if (!snapshot?.id) {
      setSources([]);
      setLoading(false);
      setErrorText(null);
      return () => {
        alive = false;
      };
    }

    if (env.hasUrl && env.hasAnonKey) {
      void run(snapshot.id);
    } else {
      setSources([]);
    }

    return () => {
      alive = false;
    };
  }, [env.hasUrl, env.hasAnonKey, snapshot?.id]);

  const projectKey = snapshot?.project_key ?? "—";
  const month = snapshot?.snapshot_month ?? "—";
  const kind = snapshot?.snapshot_kind ?? "—";

  return (
    <View style={styles.root}>
      <GravityCard>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <GravityDot size={10} />
            {/* TODO: Use locked copy for this screen title in docs/LOCKED_COPY.md. */}
            <Text style={styles.title}>Documents &amp; Sources</Text>
          </View>
          {onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={onBack}
              style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
            >
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.meta}>
          {month} · {kind} · {projectKey}
        </Text>

        {!snapshot ? (
          <Text style={styles.meta}>—</Text>
        ) : !env.hasUrl || !env.hasAnonKey ? (
          <Text style={styles.meta}>
            Missing env: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
          </Text>
        ) : loading ? (
          <Text style={styles.meta}>Loading…</Text>
        ) : errorText ? (
          <Text style={styles.meta}>{errorText}</Text>
        ) : sources.length === 0 ? (
          <Text style={styles.meta}>—</Text>
        ) : (
          <Text style={styles.meta}>Snapshot-linked sources (display-only)</Text>
        )}
      </GravityCard>

      <FlatList
        data={sources}
        keyExtractor={(item, idx) => `${idx}:${item.source_type}:${item.title}:${item.url ?? ""}`}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <SourceCard item={item} />}
      />
    </View>
  );
}

function SourceCard({ item }: { item: SnapshotSourceRow }) {
  const title = item.title?.trim() ? item.title : "—";
  const sourceType = item.source_type?.trim() ? item.source_type : "—";
  const noteText = item.note?.trim() ? item.note : "—";
  const canOpen = Boolean(item.url && item.url.trim().length > 0);

  return (
    <GravityCard style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle}>{title}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{sourceType}</Text>
        </View>
      </View>

      <Text style={styles.note}>{noteText}</Text>

      <View style={styles.cardActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open source document"
          disabled={!canOpen}
          onPress={async () => {
            if (!canOpen || !item.url) return;
            try {
              await Linking.openURL(item.url);
            } catch {
              // TODO: Add locked copy for open-url failures to docs/LOCKED_COPY.md.
            }
          }}
          style={({ pressed }) => [
            styles.openButton,
            !canOpen && styles.openButtonDisabled,
            pressed && styles.openButtonPressed,
          ]}
        >
          {/* TODO: Use locked copy for this button label in docs/LOCKED_COPY.md. */}
          <Text style={styles.openButtonText}>Open</Text>
        </Pressable>
      </View>
    </GravityCard>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: theme.spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  title: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  meta: {
    color: theme.colors.subtle,
    fontSize: 12,
    marginTop: theme.spacing.xs,
    lineHeight: 16,
  },
  backButton: {
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.panel,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  backButtonPressed: {
    opacity: 0.9,
  },
  backText: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "800",
  },

  list: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
  },
  card: {
    paddingVertical: theme.spacing.sm,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  cardTitle: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  badge: {
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.accentSoft,
    backgroundColor: theme.colors.panelElevated,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  badgeText: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  note: {
    color: theme.colors.subtle,
    fontSize: 12,
    lineHeight: 16,
    marginTop: theme.spacing.xs,
  },
  cardActions: {
    marginTop: theme.spacing.sm,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  openButton: {
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.panel,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
  },
  openButtonDisabled: {
    opacity: 0.6,
  },
  openButtonPressed: {
    opacity: 0.9,
  },
  openButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
});

