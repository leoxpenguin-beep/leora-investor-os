import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { GravityCard } from "../components/GravityCard";
import { GravityDot } from "../components/GravityDot";
import { getSupabaseEnvStatus, supabase } from "../lib/supabaseClient";
import { theme } from "../theme/theme";

export function AuthScreen() {
  const env = getSupabaseEnvStatus();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errorText, setErrorText] = React.useState<string | null>(null);

  const canSubmit = Boolean(
    env.hasUrl && env.hasAnonKey && email.trim().length > 0 && password.length > 0 && !loading
  );

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
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : "—");
      // TODO: Add locked copy for auth error states to docs/LOCKED_COPY.md (keep messages non-analytical).
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
      // Note: Depending on project settings, email confirmation may be required.
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : "—");
      // TODO: Add locked copy for auth error states to docs/LOCKED_COPY.md (keep messages non-analytical).
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

        {!env.hasUrl || !env.hasAnonKey ? (
          <Text style={styles.meta}>
            Missing env: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
          </Text>
        ) : null}

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="you@company.com"
              placeholderTextColor={theme.colors.subtle}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={theme.colors.subtle}
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign In"
            disabled={!canSubmit}
            onPress={() => void signIn()}
            style={({ pressed }) => [
              styles.actionButton,
              !canSubmit && styles.actionButtonDisabled,
              pressed && styles.actionButtonPressed,
            ]}
          >
            <Text style={styles.actionButtonText}>{loading ? "Loading…" : "Sign In"}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign Up"
            disabled={!canSubmit}
            onPress={() => void signUp()}
            style={({ pressed }) => [
              styles.actionButton,
              !canSubmit && styles.actionButtonDisabled,
              pressed && styles.actionButtonPressed,
            ]}
          >
            <Text style={styles.actionButtonText}>{loading ? "Loading…" : "Sign Up"}</Text>
          </Pressable>
        </View>

        {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
      </GravityCard>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bg,
    justifyContent: "center",
  },
  header: {
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
  form: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  field: {
    gap: theme.spacing.xs,
  },
  label: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: theme.colors.text,
    backgroundColor: theme.colors.panel,
  },
  actions: {
    marginTop: theme.spacing.md,
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
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
  errorText: {
    color: theme.colors.subtle,
    fontSize: 12,
    marginTop: theme.spacing.sm,
    lineHeight: 16,
  },
});

