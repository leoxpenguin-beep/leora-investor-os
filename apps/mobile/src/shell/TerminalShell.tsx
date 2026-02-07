import React from "react";
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { GravityCard } from "../components/GravityCard";
import { GravityDot } from "../components/GravityDot";
import { theme } from "../theme/theme";

export type ShellRouteKey = "orbit" | "cockpit" | "position";

type TerminalShellProps = {
  route: ShellRouteKey;
  onRouteChange: (next: ShellRouteKey) => void;
  selectedSnapshotLabel?: string;
  children: React.ReactNode;
};

export function TerminalShell({
  route,
  onRouteChange,
  selectedSnapshotLabel,
  children,
}: TerminalShellProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 960;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.root}>
        {isWide ? (
          <>
            <LeftRail route={route} onRouteChange={onRouteChange} />
            <View style={styles.center}>
              <TopBar route={route} selectedSnapshotLabel={selectedSnapshotLabel} />
              <View style={styles.canvas}>{children}</View>
            </View>
            <RightInspector />
          </>
        ) : (
          <>
            <TopBar route={route} selectedSnapshotLabel={selectedSnapshotLabel} />
            <View style={styles.canvas}>{children}</View>
            <BottomNav route={route} onRouteChange={onRouteChange} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function TopBar({
  route,
  selectedSnapshotLabel,
}: {
  route: ShellRouteKey;
  selectedSnapshotLabel?: string;
}) {
  const title =
    route === "orbit" ? "Orbit" : route === "cockpit" ? "Cockpit" : "My Position";
  return (
    <View style={styles.topBar}>
      <View style={styles.topBarLeft}>
        <GravityDot size={10} />
        <Text style={styles.topBarTitle}>{title}</Text>
      </View>
      <Text style={styles.topBarMeta}>
        {selectedSnapshotLabel ? selectedSnapshotLabel : "—"}
      </Text>
    </View>
  );
}

function LeftRail({
  route,
  onRouteChange,
}: {
  route: ShellRouteKey;
  onRouteChange: (next: ShellRouteKey) => void;
}) {
  return (
    <View style={styles.leftRail}>
      <Text style={styles.railBrand}>Leora</Text>
      <View style={styles.railNav}>
        <RailItem
          label="Orbit"
          active={route === "orbit"}
          onPress={() => onRouteChange("orbit")}
        />
        <RailItem
          label="Cockpit"
          active={route === "cockpit"}
          onPress={() => onRouteChange("cockpit")}
        />
        <RailItem
          label="My Position"
          active={route === "position"}
          onPress={() => onRouteChange("position")}
        />
      </View>
      <View style={styles.railFooter}>
        <Text style={styles.railFooterText}>Module 0 · Shell only</Text>
      </View>
    </View>
  );
}

function RightInspector() {
  return (
    <View style={styles.rightInspector}>
      <GravityCard>
        <Text style={styles.inspectorTitle}>Inspector</Text>
        {/* TODO: Wire selection + snapshot details from read-only APIs (display-only). */}
        <Text style={styles.inspectorRow}>
          Selected: <Text style={styles.inspectorValue}>—</Text>
        </Text>
        <Text style={styles.inspectorRow}>
          Snapshot: <Text style={styles.inspectorValue}>—</Text>
        </Text>
      </GravityCard>
    </View>
  );
}

function BottomNav({
  route,
  onRouteChange,
}: {
  route: ShellRouteKey;
  onRouteChange: (next: ShellRouteKey) => void;
}) {
  return (
    <View style={styles.bottomNav}>
      <BottomNavItem
        label="Orbit"
        active={route === "orbit"}
        onPress={() => onRouteChange("orbit")}
      />
      <BottomNavItem
        label="Cockpit"
        active={route === "cockpit"}
        onPress={() => onRouteChange("cockpit")}
      />
      <BottomNavItem
        label="Position"
        active={route === "position"}
        onPress={() => onRouteChange("position")}
      />
    </View>
  );
}

function RailItem({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.railItem,
        active && styles.railItemActive,
        pressed && styles.railItemPressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.railItemText, active && styles.railItemTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function BottomNavItem({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.bottomNavItem,
        active && styles.bottomNavItemActive,
        pressed && styles.bottomNavItemPressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text
        style={[
          styles.bottomNavItemText,
          active && styles.bottomNavItemTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  root: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  center: {
    flex: 1,
  },
  canvas: {
    flex: 1,
    padding: theme.spacing.md,
  },

  topBar: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  topBarTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  topBarMeta: {
    color: theme.colors.muted,
    fontSize: 12,
  },

  leftRail: {
    width: 220,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.lg,
  },
  railBrand: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  railNav: {
    gap: theme.spacing.sm,
  },
  railItem: {
    borderRadius: theme.radius.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderWidth: 1,
    borderColor: "transparent",
  },
  railItemActive: {
    borderColor: theme.colors.accentSoft,
    backgroundColor: theme.colors.panelElevated,
  },
  railItemPressed: {
    opacity: 0.9,
  },
  railItemText: {
    color: theme.colors.muted,
    fontSize: 14,
    fontWeight: "600",
  },
  railItemTextActive: {
    color: theme.colors.text,
  },
  railFooter: {
    marginTop: "auto",
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
  },
  railFooterText: {
    color: theme.colors.subtle,
    fontSize: 12,
  },

  rightInspector: {
    width: 320,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  inspectorTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: theme.spacing.sm,
  },
  inspectorRow: {
    color: theme.colors.muted,
    fontSize: 12,
    marginTop: theme.spacing.xs,
  },
  inspectorValue: {
    color: theme.colors.text,
    fontWeight: "600",
  },

  bottomNav: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  bottomNavItem: {
    flex: 1,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
    alignItems: "center",
    backgroundColor: theme.colors.panel,
  },
  bottomNavItemActive: {
    borderColor: theme.colors.accentSoft,
    backgroundColor: theme.colors.panelElevated,
  },
  bottomNavItemPressed: {
    opacity: 0.9,
  },
  bottomNavItemText: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  bottomNavItemTextActive: {
    color: theme.colors.text,
  },
});
