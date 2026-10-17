import { saveLibraryBridge } from "@/features/saves/lib/library-bridge";
import {
  getLastListPath,
  rememberListPath,
} from "@/features/saves/lib/list-path";
import {
  cardMedia,
  transitionSave,
  viewerMedia,
  viewerStage,
} from "@/features/saves/lib/save-transition";
import { resultNavigation } from "@/features/saves/state/result-navigation";
import { primarySelection, selection } from "@/features/saves/state/selection";
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
  selection.setCursor(id);
  saveLibraryBridge.openSaveDetails(id);
  const router = getAppRouter();
  if (!router) return;
  const { pathname, searchStr } = router.state.location;
  rememberListPath(pathname, searchStr);
  if (saveIdFromPath(pathname) !== null) {
    router.history.push(path);
    return;
  }
  transitionSave({
    router,
    path,
    source: cardMedia(id),
    target: viewerMedia,
    stage: viewerStage,
  });
}

export function closeSave(): void {
  const router = getAppRouter();
  const cursor = selection.getCursor();
  primarySelection.set(cursor);
  if (!router) return;
  const reveal = cursor
    ? () => resultNavigation.reveal(cursor, { focus: true })
    : undefined;
  if (saveIdFromPath(router.state.location.pathname) === null) {
    router.history.push(getLastListPath());
    void reveal?.();
    return;
  }
  transitionSave({
    router,
    path: getLastListPath(),
    source: viewerMedia(),
    target: () => (cursor ? cardMedia(cursor) : null),
    settle: reveal,
  });
}

export function syncPrimaryFromPath(pathname: string): void {
  const id = saveIdFromPath(pathname);
  const primary = id ?? selection.getCursor();
  if (id) saveLibraryBridge.inspectSave(id);
  else if (primary) saveLibraryBridge.setInspectorSaveId(primary);
  else saveLibraryBridge.inspectSave(null);
  if (primarySelection.get() !== primary) primarySelection.set(primary);
  rememberListPath(pathname);
}
