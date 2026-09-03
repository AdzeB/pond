import { isEmptyQuery, type Query } from "@pond/schema/filters/types";
import { useEffect } from "react";
import { pool } from "@/stores/pool";
import { selection } from "@/stores/selection";
import {
  setQuery,
  setSemanticQuery,
  setVisualProbe,
} from "@/stores/view-store";

function asQuery(value: unknown): Query | null {
  if (!value || typeof value !== "object") return null;
  const query = value as Query;
  if (query.combinator !== "and" && query.combinator !== "or") return null;
  if (!Array.isArray(query.rules)) return null;
  return query;
}

export function AgentLibraryBridge(): null {
  useEffect(() => {
    const stopFilter = window.pond.onAgentFilter((raw) => {
      const query = asQuery(raw);
      if (query && !isEmptyQuery(query)) setQuery(query);
      else if (query) setQuery(query);
    });
    const stopCite = window.pond.onAgentCite((ids) => {
      selection.set(ids);
    });
    const stopOverlay = window.pond.onAgentOverlay((overlay) => {
      if ("semanticQuery" in overlay)
        setSemanticQuery(overlay.semanticQuery ?? null);
      if ("visualSaveId" in overlay) {
        const id = overlay.visualSaveId;
        if (!id) setVisualProbe(null);
        else {
          const save = pool.get(id);
          setVisualProbe({
            kind: "saveId",
            id,
            label: save?.title?.trim() || "Save",
          });
        }
      }
    });
    return () => {
      stopFilter();
      stopCite();
      stopOverlay();
    };
  }, []);
  return null;
}
