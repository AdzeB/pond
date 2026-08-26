import { getAppRouter } from "@/lib/ui/app-router";
import { getLastListPath, rememberListPath } from "@/lib/ui/list-path";
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
  rememberListPath(
    router.state.location.pathname,
    router.state.location.searchStr,
  );
  router.history.push(path);
}

export function closeSave(): void {
  const router = getAppRouter();
  primarySelection.set(null);
  if (!router) return;
  router.history.push(getLastListPath());
}

export function syncPrimaryFromPath(pathname: string): void {
  const id = saveIdFromPath(pathname);
  if (primarySelection.get() !== id) primarySelection.set(id);
  rememberListPath(pathname);
}
