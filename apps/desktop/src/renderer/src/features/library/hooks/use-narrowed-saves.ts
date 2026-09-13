import type { LibraryQueryRequest } from "@shared/library-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useFolderMemberships,
  useFolders,
} from "@/features/library/state/folders";
import { useLibraryNav } from "@/features/library/state/library-chrome";
import {
  createQuerySession,
  type QuerySessionState,
} from "@/features/library/state/query-session";
import { useRecents } from "@/features/library/state/recents";
import {
  activateFolderPresentation,
  useEffectiveFilterQuery,
  useIncludeSubfolders,
  useRandomSeed,
  useSearchText,
  useSortDir,
  useSortKey,
} from "@/features/library/state/view-store";
import { useSaves } from "@/features/saves/hooks/use-saves";
import { reloadSaves } from "@/features/saves/lib/ensure-saves";
import type { SaveListMode } from "@/features/saves/lib/list";
import { descendantFolderIds } from "@/features/saves/lib/nav-filter";
import type { Save } from "@/features/saves/types";
import { useRetrievalOverlay } from "@/features/search/hooks/use-retrieval-overlay";
import { usePrefs } from "@/features/settings/state/prefs";

export function useNarrowedSaves(mode: SaveListMode, sourceFilter: string) {
  const saves = useSaves();
  const recents = useRecents();
  const query = useEffectiveFilterQuery();
  const keywords = useSearchText();
  const sortKey = useSortKey();
  const sortDir = useSortDir();
  const randomSeed = useRandomSeed();
  const [folderViews, , viewsReady] = usePrefs("folderViews");
  const includeSubfolders = useIncludeSubfolders();
  const nav = useLibraryNav();
  const memberships = useFolderMemberships();
  const folders = useFolders();
  const folderId = nav.kind === "folder" ? nav.id : null;
  useEffect(() => {
    if (viewsReady)
      activateFolderPresentation(
        folderId,
        folderId ? folderViews[folderId] : undefined,
      );
  }, [folderId, folderViews, viewsReady]);
  const request = useMemo<LibraryQueryRequest>(
    () => ({
      query,
      keywords,
      sortKey,
      randomSeed,
      orderFolderId: folderId ?? undefined,
      sortDir: sortDir === "asc" ? "asc" : "desc",
      scope: {
        deletedOnly: mode === "trash",
        source: sourceFilter || undefined,
        untagged: mode === "untagged",
        uncategorized: nav.kind === "uncategorized",
        folderIds:
          nav.kind === "folder"
            ? [
                ...(includeSubfolders
                  ? descendantFolderIds(nav.id, folders)
                  : [nav.id]),
              ]
            : undefined,
        tag: nav.kind === "tag" ? nav.name : undefined,
        saveIds:
          mode === "recents" ? recents.map((entry) => entry.saveId) : undefined,
      },
    }),
    [
      query,
      keywords,
      sortKey,
      randomSeed,
      folderId,
      sortDir,
      mode,
      sourceFilter,
      nav,
      includeSubfolders,
      folders,
      recents,
    ],
  );
  const [state, setState] = useState<QuerySessionState>({
    page: null,
    loading: true,
    error: null,
  });
  const [session] = useState(() =>
    createQuerySession(
      {
        page: (request) => window.pond.query("saves.queryPage", request),
        ids: (request) => window.pond.query("saves.queryIds", request),
        refresh: reloadSaves,
      },
      setState,
    ),
  );
  useEffect(() => {
    session.setRequest(request);
    const timer = setTimeout(
      () => {
        void session.load();
      },
      request.keywords?.trim() ? 100 : 0,
    );
    return () => {
      clearTimeout(timer);
      session.cancel();
    };
  }, [request, session]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = window.pond.onSyncAction(() => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = undefined;
        void session.load();
      }, 100);
    });
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [session]);
  const manualOrder = folderId ? folderViews[folderId]?.manualOrder : undefined;
  const previousOrder = useRef(manualOrder);
  useEffect(() => {
    if (previousOrder.current !== manualOrder && sortKey === "manual")
      void session.load();
    previousOrder.current = manualOrder;
  }, [manualOrder, sortKey, session]);
  const { page, loading, error } = state;
  const filtered = useMemo(() => {
    const rows: Save[] = [];
    const byId = new Map(saves.map((save) => [save.id, save]));
    for (const id of page?.ids ?? []) {
      const save = byId.get(id);
      if (save) rows.push({ ...save, folderIds: memberships[id] ?? [] });
    }
    if (mode === "recents") {
      const order = new Map(
        recents.map((entry, index) => [entry.saveId, index]),
      );
      rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    }
    return rows;
  }, [page, saves, memberships, mode, recents]);
  const ranked = useRetrievalOverlay(filtered, request);
  const loadMore = useCallback(() => session.load(true), [session]);
  const allIds = useCallback(
    async () =>
      ranked !== filtered ? ranked.map((save) => save.id) : session.allIds(),
    [ranked, filtered, session],
  );
  return {
    queryKey: JSON.stringify(request),
    loadedIds: () => session.snapshot().page?.ids ?? [],
    filtered: ranked,
    loading,
    error,
    total: ranked === filtered ? (page?.total ?? 0) : ranked.length,
    hasMore: ranked === filtered && !!page?.nextCursor,
    loadMore,
    allIds,
    retry: () => session.load(),
  };
}
