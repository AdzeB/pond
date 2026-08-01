import { listBaseFromPath } from "@/lib/search/schemas";
import { getAppRouter } from "@/lib/ui/app-router";
import { primarySelection } from "@/stores/selection";
import { tabs } from "@/stores/tabs";

export function saveIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/save\/([^/]+)\/?$/);
  if (!m?.[1]) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

export function openSave(id: string, opts?: { background?: boolean }): void {
  const path = `/save/${encodeURIComponent(id)}`;
  if (opts?.background) {
    tabs.open(path, { background: true });
    return;
  }
  primarySelection.set(id);
  const router = getAppRouter();
  if (!router) return;
  router.history.push(path);
}

export function closeSave(): void {
  const router = getAppRouter();
  primarySelection.set(null);
  if (!router) return;
  const base = listBaseFromPath(router.state.location.pathname);
  router.history.push(base);
}

/** Sync primary selection from the active tab path so save hotkeys follow the visible tab. */
export function syncPrimaryFromPath(pathname: string): void {
  const id = saveIdFromPath(pathname);
  if (primarySelection.get() !== id) primarySelection.set(id);
}
