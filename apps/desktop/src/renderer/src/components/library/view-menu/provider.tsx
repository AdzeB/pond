import type { Predicate, Query } from "@pond/schema/filters/types";
import { EMPTY_QUERY } from "@pond/schema/filters/types";
import { readQuery, writeQuery } from "@pond/schema/filters/url";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { useDensity } from "@/lib/density";
import {
  type DisplayPrefKey,
  useDisplayPrefs,
  setDisplayPref as writeDisplayPref,
} from "@/lib/display-prefs";
import { patchSearch } from "@/lib/navigate-path";
import { paramsToSearch, searchToParams } from "@/lib/search-schemas";
import { useZoom } from "@/lib/use-zoom";
import {
  isLayoutValue,
  type LayoutValue,
  readViewPref,
  writeViewPref,
} from "@/lib/view-prefs";
import {
  type SortDir,
  type SortKey,
  ViewContext,
  type ViewContextValue,
} from "./context";
import { predicateIsActive } from "./filter/helpers";

const SORT_KEYS = new Set<SortKey>(["savedAt", "title", "fileSize"]);

interface RootProps {
  children: ReactNode;
  triggerRef?: React.Ref<HTMLButtonElement>;
}

export function Root({ children, triggerRef }: RootProps) {
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const navigate = useNavigate();
  const displayPrefs = useDisplayPrefs();
  const [density, setDensity] = useDensity();
  const [zoom, setZoom] = useZoom();
  const [pendingPredicates, setPendingPredicates] = useState<Predicate[]>([]);

  const params = useMemo(() => searchToParams(search), [search]);
  const query = useMemo(() => readQuery(params), [params]);

  const layout = useMemo<LayoutValue>(() => {
    const raw =
      (search.view as string | undefined) ??
      readViewPref("view") ??
      "waterfall";
    return isLayoutValue(raw) ? raw : "waterfall";
  }, [search.view]);

  const sort = useMemo<{ key: SortKey; dir: SortDir }>(() => {
    const rawKey =
      (search.sort as string | undefined) ?? readViewPref("sort") ?? "savedAt";
    const key: SortKey = SORT_KEYS.has(rawKey as SortKey)
      ? (rawKey as SortKey)
      : "savedAt";
    const rawDir = (search.dir as string | undefined) ?? readViewPref("dir");
    const dir: SortDir = rawDir === "asc" ? "asc" : "desc";
    return { key, dir };
  }, [search.sort, search.dir]);

  const commitQuery = useCallback(
    (next: Query) => {
      const written = writeQuery(params, next);
      patchSearch(navigate, () => paramsToSearch(written), { replace: true });
    },
    [navigate, params],
  );

  const setLayout = useCallback(
    (next: LayoutValue) => {
      writeViewPref("view", next);
      patchSearch(
        navigate,
        (prev) => {
          const out = { ...prev };
          if (next === "waterfall") delete out.view;
          else out.view = next;
          return out;
        },
        { replace: true },
      );
    },
    [navigate],
  );

  const setSort = useCallback(
    (next: { key: SortKey; dir: SortDir }) => {
      writeViewPref("sort", next.key);
      writeViewPref("dir", next.dir);
      patchSearch(
        navigate,
        (prev) => {
          const out = { ...prev };
          if (next.key === "savedAt") delete out.sort;
          else out.sort = next.key;
          if (next.dir === "desc") delete out.dir;
          else out.dir = next.dir;
          return out;
        },
        { replace: true },
      );
    },
    [navigate],
  );

  const setDisplayPref = useCallback(
    (key: DisplayPrefKey, value: boolean) => writeDisplayPref(key, value),
    [],
  );

  const addPredicate = useCallback(() => {
    // A fresh row starts blank. It lives in pendingPredicates until the user
    // gives it a value, at which point it transitions into the URL via
    // updatePredicate. The default field/cmp pair just keeps the row's
    // selectors labelled until the user picks something else.
    const draft: Predicate = {
      kind: "p",
      field: "tags",
      cmp: "some",
      value: [],
    };
    setPendingPredicates((prev) => [...prev, draft]);
  }, []);

  const updatePredicate = useCallback(
    (idx: number, next: Predicate | null) => {
      const committedCount = query.clauses.length;

      if (idx < committedCount) {
        // Editing a row that already lives in the URL.
        const clauses = [...query.clauses];
        if (next === null) clauses.splice(idx, 1);
        else if (predicateIsActive(next)) clauses[idx] = next;
        else {
          // Newly-inactive: pop it out of the URL and park it as pending so
          // the row stays visible while the user re-picks a value.
          clauses.splice(idx, 1);
          commitQuery({ kind: "and", clauses });
          setPendingPredicates((prev) => [next, ...prev]);
          return;
        }
        commitQuery({ kind: "and", clauses });
        return;
      }

      // Editing a pending row.
      const pendingIdx = idx - committedCount;
      if (next === null) {
        setPendingPredicates((prev) => {
          if (pendingIdx < 0 || pendingIdx >= prev.length) return prev;
          const out = [...prev];
          out.splice(pendingIdx, 1);
          return out;
        });
        return;
      }
      if (predicateIsActive(next)) {
        // Promote the pending row into the URL.
        setPendingPredicates((prev) => {
          if (pendingIdx < 0 || pendingIdx >= prev.length) return prev;
          const out = [...prev];
          out.splice(pendingIdx, 1);
          return out;
        });
        commitQuery({ kind: "and", clauses: [...query.clauses, next] });
        return;
      }
      setPendingPredicates((prev) => {
        if (pendingIdx < 0 || pendingIdx >= prev.length) return prev;
        const out = [...prev];
        out[pendingIdx] = next;
        return out;
      });
    },
    [commitQuery, query.clauses],
  );

  const reorderPredicate = useCallback(
    (from: number, to: number) => {
      if (from === to) return;
      const committedCount = query.clauses.length;
      // Only reorder within the committed range for now. Pending rows are
      // appended below committed rows and stay in insertion order until they
      // graduate, so cross-range drag is left to the functional drag-and-drop
      // pass.
      if (from >= committedCount || to >= committedCount) return;
      const clauses = [...query.clauses];
      const [moved] = clauses.splice(from, 1);
      if (!moved) return;
      clauses.splice(to, 0, moved);
      commitQuery({ kind: "and", clauses });
    },
    [commitQuery, query.clauses],
  );

  const resetFilters = useCallback(() => {
    setPendingPredicates([]);
    commitQuery(EMPTY_QUERY);
  }, [commitQuery]);

  const restoreDefaults = useCallback(() => {
    setPendingPredicates([]);
    commitQuery(EMPTY_QUERY);
    setLayout("waterfall");
    setSort({ key: "savedAt", dir: "desc" });
    setDensity("comfortable");
    setZoom(130);
  }, [commitQuery, setLayout, setSort, setDensity, setZoom]);

  const value = useMemo<ViewContextValue>(
    () => ({
      state: {
        query,
        pendingPredicates,
        layout,
        sort,
        density,
        displayPrefs,
        zoom,
      },
      actions: {
        setQuery: commitQuery,
        addPredicate,
        updatePredicate,
        reorderPredicate,
        resetFilters,
        setLayout,
        setSort,
        setDensity,
        setDisplayPref,
        setZoom,
        restoreDefaults,
      },
      meta: { triggerRef },
    }),
    [
      query,
      pendingPredicates,
      layout,
      sort,
      density,
      displayPrefs,
      zoom,
      triggerRef,
      commitQuery,
      addPredicate,
      updatePredicate,
      reorderPredicate,
      resetFilters,
      setLayout,
      setSort,
      setDensity,
      setDisplayPref,
      setZoom,
      restoreDefaults,
    ],
  );

  return <ViewContext value={value}>{children}</ViewContext>;
}
