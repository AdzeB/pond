import { useSyncExternalStore } from "react";

// navigator.platform is stable for the process lifetime; resolve the reveal label once.
export const REVEAL_LABEL: string = (() => {
  if (typeof navigator === "undefined") return "Reveal in Finder";
  const p = navigator.platform?.toLowerCase() ?? "";
  if (p.includes("win")) return "Show in Explorer";
  if (p.includes("linux")) return "Show in File Manager";
  return "Reveal in Finder";
})();

type Platform = "mac" | "other";

let platform: Platform | null = null;
let pending: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const cb of listeners) cb();
}

function ensure(): void {
  if (platform !== null || pending) return;
  pending = window.pond.appInfo().then((info) => {
    platform = info.platform === "darwin" ? "mac" : "other";
    pending = null;
    emit();
  });
}

export function usePlatform(): Platform {
  ensure();
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => platform ?? "other",
    () => "other",
  );
}
