import { useCallback } from "react";
import { compileStageA } from "@/lib/search/nl-query";
import { clearAsk, useAskActive } from "@/stores/ask-store";
import {
  applyCompiledQuery,
  resetFilters,
  setSearchInputText,
  useSearchInput,
} from "@/stores/view-store";
import { useNlFacets } from "./use-nl-query";

export interface InstantSearch {
  text: string;
  setText: (value: string) => void;
  clear: () => void;
}

// The local-only instant Search surface. Turns the typed string into structured
// filters with the deterministic Stage-A resolver (no LLM, no IPC) and commits
// them to the view store, which the grid already reflects via useNarrowedSaves.
// Distinct from the LLM agent (ask-store / useAsk) by design.
export function useInstantSearch(): InstantSearch {
  const text = useSearchInput();
  const facets = useNlFacets();
  const askActive = useAskActive();

  const setText = useCallback(
    (value: string) => {
      setSearchInputText(value);

      // A live agent result overrides the grid; running a search means the user
      // wants filters to drive the grid again, so retire the ask transcript.
      if (askActive) clearAsk();

      if (!value.trim()) {
        resetFilters();
        return;
      }

      const result = compileStageA(value, facets);
      applyCompiledQuery(result.query, result.residual);
    },
    [facets, askActive],
  );

  // resetFilters also clears the raw input and residual text.
  const clear = useCallback(() => {
    resetFilters();
  }, []);

  return { text, setText, clear };
}
