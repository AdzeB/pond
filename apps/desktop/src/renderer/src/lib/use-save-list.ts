import { useLocation, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { useRecents } from "@/lib/recents";
import {
  applyModeFilter,
  applyModeSort,
  extractSource,
  labelForMode,
  parseMode,
  type SaveListMode,
} from "@/lib/save-list";
import { listBaseFromPath } from "@/lib/search-schemas";
import { useStableById } from "@/lib/use-stable-array";
import { useViewStore } from "@/lib/view-store";
import { useSaves } from "@/pool/hooks";
import { useSearchResults } from "@/pool/search";
import {
  type SortDir,
  type SortKey,
  useFilteredSaves,
} from "@/pool/use-filtered-saves";

export interface SaveList {
  mode: SaveListMode;
  parentLabel: string;
  parentTo: string;
  buildDetailPath: (id: string) => string;
  ids: string[];
  total: number;
  index: number;
  prevId: string | null;
  nextId: string | null;
  goPrev: () => void;
  goNext: () => void;
}

interface SaveListOptions {
  activeId: string | null;
}

export function useSaveList({ activeId }: SaveListOptions): SaveList {
  const saves = useSaves();
  const recents = useRecents();
  const location = useLocation();
  const view = useViewStore();
  const navigate = useNavigate();

  const parentBase = listBaseFromPath(location.pathname);
  const mode: SaveListMode =
    view.trash && parentBase === "/"
      ? "trash"
      : (parseMode(parentBase) ?? "library");
  const sourceFilter = mode === "source" ? extractSource(parentBase) : "";

  const q = view.q;
  const searchHits = useSearchResults(q, { deletedOnly: mode === "trash" });
  const query = view.query;

  const recentsOrder = useMemo(() => {
    if (mode !== "recents") return null;
    const map = new Map<string, number>();
    for (let i = 0; i < recents.length; i++) {
      const entry = recents[i];
      if (entry) map.set(entry.saveId, i);
    }
    return map;
  }, [mode, recents]);

  const randomSeed = useMemo(() => Math.random().toString(36).slice(2), []);

  const narrowedFresh = useMemo(() => {
    const base = searchHits.results ?? saves;
    const filteredList = applyModeFilter(base, {
      mode,
      sourceFilter,
      recentsOrder,
    });
    return applyModeSort(filteredList, { mode, recentsOrder, randomSeed });
  }, [saves, searchHits.results, mode, sourceFilter, recentsOrder, randomSeed]);

  const narrowed = useStableById(narrowedFresh);

  const sortOpts = useMemo(() => {
    if (mode === "recents" || mode === "random") {
      return undefined;
    }
    const sortKey: SortKey =
      view.sortKey === "title" || view.sortKey === "fileSize"
        ? view.sortKey
        : "savedAt";
    const sortDir: SortDir = view.sortDir === "asc" ? "asc" : "desc";
    return { sortKey, sortDir };
  }, [mode, view.sortKey, view.sortDir]);

  const filteredFresh = useFilteredSaves(narrowed, query, sortOpts);
  const filtered = useStableById(filteredFresh);

  const base = useMemo(() => {
    const ids = filtered.map((s) => s.id);
    const index = activeId ? ids.indexOf(activeId) : -1;
    const prevId = index > 0 ? (ids[index - 1] ?? null) : null;
    const nextId =
      index >= 0 && index < ids.length - 1 ? (ids[index + 1] ?? null) : null;

    const parentLabel = labelForMode(mode, sourceFilter);
    const parentTo = parentBase;

    const buildDetailPath = (id: string) =>
      parentBase === "/" ? `/detail/${id}` : `${parentBase}/detail/${id}`;

    return {
      mode,
      parentLabel,
      parentTo,
      buildDetailPath,
      ids,
      total: ids.length,
      index,
      prevId,
      nextId,
    };
  }, [filtered, activeId, mode, sourceFilter, parentBase]);

  const goPrev = useCallback(() => {
    if (!base.prevId) return;
    void navigate({ to: base.buildDetailPath(base.prevId) });
  }, [base, navigate]);

  const goNext = useCallback(() => {
    if (!base.nextId) return;
    void navigate({ to: base.buildDetailPath(base.nextId) });
  }, [base, navigate]);

  return useMemo(() => ({ ...base, goPrev, goNext }), [base, goPrev, goNext]);
}
