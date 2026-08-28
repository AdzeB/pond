import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

interface RowSelectionState<T> {
  readonly rows: readonly T[];
}

export interface RowSelectionStore<T> {
  snapshot(): readonly T[];
  size(): number;
  set(rows: readonly T[]): void;
  clear(): void;
  subscribe(fn: () => void): () => void;
}

export function createRowSelectionStore<T>(
  sameRow: (a: T, b: T) => boolean,
): RowSelectionStore<T> & {
  useSize(): number;
  useRows(): readonly T[];
} {
  const store = new Store<RowSelectionState<T>>({ rows: [] });

  function sameRows(a: readonly T[], b: readonly T[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((row, i) => {
      const other = b[i];
      return other !== undefined && sameRow(row, other);
    });
  }

  const api: RowSelectionStore<T> = {
    snapshot(): readonly T[] {
      return store.state.rows;
    },
    size(): number {
      return store.state.rows.length;
    },
    set(rows: readonly T[]): void {
      store.setState((s) => (sameRows(s.rows, rows) ? s : { rows }));
    },
    clear(): void {
      store.setState((s) => (s.rows.length === 0 ? s : { rows: [] }));
    },
    subscribe(fn: () => void): () => void {
      const sub = store.subscribe(fn);
      return () => sub.unsubscribe();
    },
  };

  return {
    ...api,
    useSize(): number {
      return useSelector(store, (s) => s.rows.length);
    },
    useRows(): readonly T[] {
      return useSelector(store, (s) => s.rows);
    },
  };
}
