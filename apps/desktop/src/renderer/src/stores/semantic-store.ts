import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

/** Embedding vector for the active query, scoped to the residual text it was computed from; ranking only applies it while the search text still matches, so it self-clears on edit without bookkeeping. */

interface SemanticState {
  readonly vector: Float32Array | null;
  readonly text: string;
}

const store = new Store<SemanticState>({ vector: null, text: "" });
export function useSemanticQuery(): SemanticState {
  return useSelector(store, (s) => s);
}
