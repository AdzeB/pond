import { useSyncExternalStore } from "react";

export type ResolvedTheme = "light" | "dark";

// Source of truth is `<html data-theme>` (written by ThemeApplier); one resolver for React and ad-hoc callers.
export function resolveCurrentTheme(): ResolvedTheme {
  if (typeof document === "undefined") return "dark";
  const attr = document.documentElement.dataset.theme;
  return attr === "light" ? "light" : "dark";
}

const listeners = new Set<() => void>();
let observer: MutationObserver | null = null;

function ensureObserver(): void {
  if (observer || typeof document === "undefined") return;
  observer = new MutationObserver(() => {
    for (const fn of listeners) fn();
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
}

function subscribe(cb: () => void): () => void {
  ensureObserver();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getServerSnapshot(): ResolvedTheme {
  return "dark";
}

export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(
    subscribe,
    resolveCurrentTheme,
    getServerSnapshot,
  );
}
