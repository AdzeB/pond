import { saveLibraryBridge } from "@/features/saves/lib/library-bridge";
import {
  getLastListPath,
  rememberListPath,
} from "@/features/saves/lib/list-path";
import { primarySelection } from "@/features/saves/state/selection";
import { getAppRouter } from "@/shared/lib/app-router";

export function saveIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/save\/([^/]+)\/?$/);
  if (!m?.[1]) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

export function openSave(id: string): void {
  const path = `/save/${encodeURIComponent(id)}`;
  primarySelection.set(id);
  saveLibraryBridge.openSaveDetails(id);
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
  saveLibraryBridge.inspectSave(id);
  if (primarySelection.get() !== id) primarySelection.set(id);
  rememberListPath(pathname);
}
