import type { LibraryQueryRequest } from "@shared/library-query";
import { useEffect, useState } from "react";
import {
  useSemanticQuery,
  useVisualProbe,
  type VisualProbe,
} from "@/features/library";
import { ensureSaves, pool } from "@/features/saves/pool";
import type { Save } from "@/features/saves/types";
import { retrieveSaveIds } from "@/features/search/lib/retrieve-client";
import { usePrefs } from "@/shared/state/prefs";
import { useStableById } from "../../../shared/hooks/use-stable-array";

const LIMIT = 500;
const SCOPE_CAP = 10_000;

function visualInput(probe: VisualProbe) {
  return probe.kind === "saveId"
    ? { kind: "saveId" as const, id: probe.id }
    : {
        kind: "vector" as const,
        model: probe.model,
        values: probe.values,
      };
}

export function useRetrievalOverlay(
  saves: ReadonlyArray<Save>,
  libraryQuery?: LibraryQueryRequest,
): ReadonlyArray<Save> {
  const [ai] = usePrefs("ai");
  const semanticQuery = useSemanticQuery();
  const visualProbe = useVisualProbe();
  const semantic = ai?.semanticSearch === true ? semanticQuery : null;
  const visual = ai?.enableClip === true ? visualProbe : null;
  const [ranked, setRanked] = useState<Save[] | null>(null);
  const [searching, setSearching] = useState(false);
  const _scopeKey = saves.map((save) => save.id).join("\n");

  useEffect(() => {
    if (!semantic && !visual) {
      setRanked(null);
      setSearching(false);
      return;
    }
    const scoped = saves.slice(0, SCOPE_CAP);
    const byId = new Map(scoped.map((save) => [save.id, save] as const));
    setSearching(true);
    let cancelled = false;
    void (async () => {
      try {
        const ids = await retrieveSaveIds({
          query: semantic ?? undefined,
          visual: visual ? visualInput(visual) : undefined,
          saveIds: libraryQuery ? undefined : scoped.map((save) => save.id),
          libraryQuery,
          limit: LIMIT,
        });
        if (cancelled) return;
        await ensureSaves(ids);
        if (cancelled) return;
        setRanked(
          ids.flatMap((id) => {
            const save = libraryQuery ? pool.get(id) : byId.get(id);
            return save ? [save] : [];
          }),
        );
      } catch (error) {
        if (!cancelled) console.warn("[pond overlay] retrieval failed", error);
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [semantic, visual, saves, libraryQuery]);

  const settled = useStableById(ranked ?? saves);
  if (!semantic && !visual) return saves;
  if (searching && ranked == null) return saves;
  return settled;
}
