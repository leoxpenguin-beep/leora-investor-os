import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { GravityCard } from "../components/GravityCard";
import { GravityDot } from "../components/GravityDot";
import { getSupabaseEnvStatus, supabase } from "../lib/supabaseClient";
import { theme } from "../theme/theme";

export function AuthScreen() {
  const env = getSupabaseEnvStatus();
  const isEnabled = env.hasUrl && env.hasAnonKey && Boolean(supabase);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errorText, setErrorText] = React.useState<string | null>(null);

  async function signIn() {
    if (!supabase) return;
    setLoading(true);
    setErrorText(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
    } catch {
      setErrorText("—");
      // TODO: Add locked copy for auth error states to docs/LOCKED_COPY.md.
    } finally {
      setLoading(false);
    }
  }

  async function signUp() {
    if (!supabase) return;
    setLoading(true);
    setErrorText(null);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) throw error;
    } catch {
      setErrorText("—");
      // TODO: Add locked copy for auth error states to docs/LOCKED_COPY.md.
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <GravityCard>
        <View style={styles.header}>
          <GravityDot size={10} />
          {/* TODO: Use locked copy for this title in docs/LOCKED_COPY.md. */}
          <Text style={styles.title}>Sign in</Text>
        </View>

        {!isEnabled ? (
          <Text style={styles.meta}>
            Missing env: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
          </Text>
        ) : loading ? (
          <Text style={styles.meta}>Loading…</Text>
        ) : errorText ? (
          <Text style={styles.meta}>{errorText}</Text>
        ) : (
          <Text style={styles.meta}>—</Text>
        )}
      </GravityCard>

      <GravityCard>
        {/* TODO: Use locked copy for these labels/placeholders in docs/LOCKED_COPY.md. */}
        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor={theme.colors.subtle}
          style={styles.input}
          editable={isEnabled && !loading}
        />

        <Text style={[styles.label, { marginTop: theme.spacing.sm }]}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={theme.colors.subtle}
          style={styles.input}
          editable={isEnabled && !loading}
        />

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign In"
            disabled={!isEnabled || loading}
            onPress={() => void signIn()}
            style={({ pressed }) => [
              styles.actionButton,
              (!isEnabled || loading) && styles.actionButtonDisabled,
              pressed && styles.actionButtonPressed,
            ]}
          >
            <Text style={styles.actionButtonText}>Sign In</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign Up"
            disabled={!isEnabled || loading}
            onPress={() => void signUp()}
            style={({ pressed }) => [
              styles.actionButton,
              (!isEnabled || loading) && styles.actionButtonDisabled,
              pressed && styles.actionButtonPressed,
            ]}
          >
            <Text style={styles.actionButtonText}>Sign Up</Text>
          </Pressable>
        </View>
      </GravityCard>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  title: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  meta: {
    color: theme.colors.subtle,
    fontSize: 12,
    marginTop: theme.spacing.xs,
    lineHeight: 16,
  },
  label: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
    textTransform: "uppercase",
    marginBottom: theme.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.text,
    backgroundColor: theme.colors.panel,
    fontSize: 14,
  },
  actions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.panel,
    paddingVertical: theme.spacing.sm,
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
    fontWeight: "900",
  },
});

