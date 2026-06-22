import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

// Holds the embedding vector for the active "find anything" query, scoped to the
// residual free-text it was computed from. The ranking step only applies the
// vector when the current search text still matches `text`, so it self-clears
// when the user edits or clears the search without any manual bookkeeping.

interface SemanticState {
  readonly vector: Float32Array | null;
  readonly text: string;
}

const store = new Store<SemanticState>({ vector: null, text: "" });

export function setSemanticQuery(
  vector: Float32Array | null,
  text: string,
): void {
  store.setState(() => ({ vector, text }));
}

export function clearSemanticQuery(): void {
  store.setState((s) => (s.vector == null ? s : { vector: null, text: "" }));
}

export function useSemanticQuery(): SemanticState {
  return useSelector(store, (s) => s);
}
