import { useLocation, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import {
  extractSource,
  labelForMode,
  parseMode,
  type SaveListMode,
} from "@/lib/save/list";
import { listBaseFromPath } from "@/lib/search/schemas";
import { useNarrowedSaves } from "./use-narrowed-saves";

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
  const location = useLocation();
  const navigate = useNavigate();

  const parentBase = listBaseFromPath(location.pathname);
  const mode: SaveListMode = parseMode(parentBase) ?? "library";
  const sourceFilter = mode === "source" ? extractSource(parentBase) : "";

  const filtered = useNarrowedSaves(mode, sourceFilter);

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
