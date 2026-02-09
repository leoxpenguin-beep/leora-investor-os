import React from "react";

// Module 14 — Demo Mode (DEV-only)
//
// Production safety:
// - `__DEV__` must be true to enable demo mode
// - In production builds, demo mode is always false and cannot be toggled

type Listener = (enabled: boolean) => void;

let demoModeEnabled = false;
const listeners = new Set<Listener>();

export function isDemoModeAvailable(): boolean {
  return __DEV__ === true;
}

export function getDemoModeEnabled(): boolean {
  return isDemoModeAvailable() ? demoModeEnabled : false;
}

export function setDemoModeEnabled(next: boolean): void {
  if (!isDemoModeAvailable()) {
    demoModeEnabled = false;
    return;
  }

  const normalized = Boolean(next);
  if (demoModeEnabled === normalized) return;
  demoModeEnabled = normalized;
  for (const l of Array.from(listeners)) {
    try {
      l(demoModeEnabled);
    } catch {
      // ignore listener errors
    }
  }
}

export function toggleDemoMode(): void {
  setDemoModeEnabled(!getDemoModeEnabled());
}

export function subscribeDemoMode(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useDemoMode(): {
  demoModeEnabled: boolean;
  setDemoModeEnabled: (next: boolean) => void;
} {
  const [enabled, setEnabled] = React.useState(getDemoModeEnabled());

  React.useEffect(() => {
    return subscribeDemoMode((nextEnabled) => setEnabled(nextEnabled));
  }, []);

  return {
    demoModeEnabled: enabled,
    setDemoModeEnabled: (next) => setDemoModeEnabled(next),
  };
}

