import { readQuery } from "@pond/schema/filters/url";
import { useLocation, useNavigate, useSearch } from "@tanstack/react-router";
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
import {
  type LibrarySearch,
  listBaseFromPath,
  searchToParams,
} from "@/lib/search-schemas";
import { useStableById } from "@/lib/use-stable-array";
import { readViewPref } from "@/lib/view-prefs";
import { useSaves } from "@/pool/hooks";
import { useSearchResults } from "@/pool/search";
import { useFilteredSaves } from "@/pool/use-filtered-saves";

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
  const search = useSearch({ strict: false }) as LibrarySearch;
  const navigate = useNavigate();

  const parentBase = listBaseFromPath(location.pathname);
  const mode = parseMode(parentBase) ?? "library";
  const sourceFilter = mode === "source" ? extractSource(parentBase) : "";

  const q = search.q ?? "";
  const searchHits = useSearchResults(q);
  const params0 = useMemo(() => searchToParams(search), [search]);
  const query = useMemo(() => readQuery(params0), [params0]);

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
    const base = mode === "trash" ? saves : (searchHits.results ?? saves);
    const filteredList = applyModeFilter(base, {
      mode,
      sourceFilter,
      recentsOrder,
    });
    return applyModeSort(filteredList, { mode, recentsOrder, randomSeed });
  }, [saves, searchHits.results, mode, sourceFilter, recentsOrder, randomSeed]);

  const narrowed = useStableById(narrowedFresh);

  const sortOpts = useMemo(() => {
    if (mode === "recents" || mode === "random" || mode === "trash") {
      return undefined;
    }
    const rawSort = search.sort ?? readViewPref("sort") ?? "savedAt";
    const sortKey: "savedAt" | "title" | "fileSize" =
      rawSort === "title" || rawSort === "fileSize" ? rawSort : "savedAt";
    const rawDir = search.dir ?? readViewPref("dir");
    const sortDir: "asc" | "desc" = rawDir === "asc" ? "asc" : "desc";
    return { sortKey, sortDir };
  }, [mode, search.sort, search.dir]);

  const filteredFresh = useFilteredSaves(
    narrowed,
    mode === "trash" ? null : query,
    sortOpts,
  );
  const filtered = useStableById(filteredFresh);

  const base = useMemo(() => {
    const ids = filtered.map((s) => s.id);
    const index = activeId ? ids.indexOf(activeId) : -1;
    const prevId = index > 0 ? (ids[index - 1] ?? null) : null;
    const nextId =
      index >= 0 && index < ids.length - 1 ? (ids[index + 1] ?? null) : null;

    const parentLabel = labelForMode(mode, sourceFilter);
    const queryString = params0.toString();
    const parentTo = queryString ? `${parentBase}?${queryString}` : parentBase;

    const buildDetailPath = (id: string) => {
      const tail =
        parentBase === "/" ? `/detail/${id}` : `${parentBase}/detail/${id}`;
      return queryString ? `${tail}?${queryString}` : tail;
    };

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
  }, [filtered, activeId, mode, sourceFilter, params0, parentBase]);

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
