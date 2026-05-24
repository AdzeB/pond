import { readQuery } from "@pond/schema/filters/url";
import { useCallback, useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useRecents } from "@/lib/recents";
import {
  applyModeFilter,
  applyModeSort,
  extractSource,
  labelForMode,
  parseMode,
  type SaveListMode,
} from "@/lib/save-list";
import { useStableById } from "@/lib/use-stable-array";
import { readViewPref } from "@/lib/view-prefs";
import { useSaves } from "@/pool/hooks";
import { useSearchResults } from "@/pool/search";
import { useFilteredSaves } from "@/pool/use-filtered-saves";

export interface ListContext {
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

interface ListContextOptions {
  activeId: string | null;
}

export function useSaveListContext({
  activeId,
}: ListContextOptions): ListContext {
  const saves = useSaves();
  const recents = useRecents();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const path = location.pathname;
  const parentBase =
    path.replace(/\/detail\/[^/]+\/?$/, "").replace(/\/+$/, "") || "/";

  const mode = parseMode(parentBase);
  const sourceFilter = mode === "source" ? extractSource(parentBase) : "";

  const q = searchParams.get("q") ?? "";
  const search = useSearchResults(q);
  const query = useMemo(() => readQuery(searchParams), [searchParams]);

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
    const base = mode === "trash" ? saves : (search.results ?? saves);
    const filteredList = applyModeFilter(base, {
      mode,
      sourceFilter,
      recentsOrder,
    });
    return applyModeSort(filteredList, { mode, recentsOrder, randomSeed });
  }, [saves, search.results, mode, sourceFilter, recentsOrder, randomSeed]);

  const narrowed = useStableById(narrowedFresh);

  const sortOpts = useMemo(() => {
    if (mode === "recents" || mode === "random" || mode === "trash") {
      return undefined;
    }
    const rawSort =
      searchParams.get("sort") ?? readViewPref("sort") ?? "savedAt";
    const sortKey: "savedAt" | "title" | "fileSize" =
      rawSort === "title" || rawSort === "fileSize" ? rawSort : "savedAt";
    const rawDir = searchParams.get("dir") ?? readViewPref("dir");
    const sortDir: "asc" | "desc" = rawDir === "asc" ? "asc" : "desc";
    return { sortKey, sortDir };
  }, [mode, searchParams]);

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
    const queryString = searchParams.toString();
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
  }, [filtered, activeId, mode, sourceFilter, searchParams, parentBase]);

  const goPrev = useCallback(() => {
    if (!base.prevId) return;
    navigate(base.buildDetailPath(base.prevId));
  }, [base, navigate]);

  const goNext = useCallback(() => {
    if (!base.nextId) return;
    navigate(base.buildDetailPath(base.nextId));
  }, [base, navigate]);

  return useMemo(() => ({ ...base, goPrev, goNext }), [base, goPrev, goNext]);
}
