import { Store } from "@tanstack/store";

interface ClipEntry {
  vec: Float32Array;
  model: string;
}

interface ClipState {
  readonly byId: Map<string, ClipEntry>;
  readonly version: number;
}

const store = new Store<ClipState>({
  byId: new Map(),
  version: 0,
});

export function setClipEmbedding(
  id: string,
  vec: Float32Array,
  model: string,
): void {
  store.setState((s) => {
    const byId = new Map(s.byId);
    byId.set(id, { vec, model });
    return { byId, version: s.version + 1 };
  });
  void window.pond
    .query("saves.patchDerived", {
      id,
      patch: { clipEmbedding: Array.from(vec), clipModel: model },
    })
    .catch((err) => {
      console.warn(`[clip] failed to persist vector for ${id}`, err);
    });
}

export function clearClipEmbeddings(ids?: readonly string[]): number {
  if (ids && ids.length > 0) {
    let count = 0;
    store.setState((s) => {
      const byId = new Map(s.byId);
      for (const id of ids) if (byId.delete(id)) count++;
      return count === 0 ? s : { byId, version: s.version + 1 };
    });
    return count;
  }
  const count = store.state.byId.size;
  if (count === 0) return 0;
  store.setState((s) => ({
    byId: new Map(),
    version: s.version + 1,
  }));
  return count;
}
