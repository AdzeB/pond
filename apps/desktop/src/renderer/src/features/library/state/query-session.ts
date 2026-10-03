import type {
  LibraryQueryPage,
  LibraryQueryRequest,
} from "@shared/library-query";
export interface QuerySessionState {
  page: LibraryQueryPage | null;
  loading: boolean;
  error: string | null;
}
interface Runtime {
  page(request: LibraryQueryRequest): Promise<LibraryQueryPage>;
  ids(request: LibraryQueryRequest): Promise<{ ids: string[] }>;
  refresh(ids: readonly string[]): Promise<void>;
}
function scopeKey({ keywords: _, ...rest }: LibraryQueryRequest): string {
  return JSON.stringify(rest);
}

export function createQuerySession(
  runtime: Runtime,
  emit: (state: QuerySessionState) => void,
) {
  let request: LibraryQueryRequest | null = null;
  let key = "";
  let pageKey = "";
  let sequence = 0;
  let active = false;
  let state: QuerySessionState = { page: null, loading: true, error: null };
  function update(patch: Partial<QuerySessionState>) {
    state = { ...state, ...patch };
    emit(state);
  }
  async function load(append = false): Promise<void> {
    if (!request || (append && (active || !state.page?.nextCursor))) return;
    const captured = request;
    const capturedKey = key;
    const ticket = ++sequence;
    active = true;
    const previous = pageKey === capturedKey ? state.page : null;
    update({ loading: true, error: null });
    const current = () => ticket === sequence && capturedKey === key;
    try {
      let result = await runtime.page({
        ...captured,
        cursor: append ? previous?.nextCursor : null,
      });
      if (!current()) return;
      while (
        !append &&
        result.nextCursor &&
        result.ids.length < (previous?.ids.length ?? 0)
      ) {
        const next = await runtime.page({
          ...captured,
          cursor: result.nextCursor,
        });
        if (!current()) return;
        result = { ...next, ids: [...result.ids, ...next.ids] };
      }
      await runtime.refresh(result.ids);
      if (!current()) return;
      pageKey = capturedKey;
      update({
        page: {
          ...result,
          ids:
            append && previous
              ? [...new Set([...previous.ids, ...result.ids])]
              : result.ids,
        },
      });
    } catch (cause) {
      if (!current()) return;
      if (append) {
        active = false;
        await load(false);
        return;
      }
      update({
        error:
          cause instanceof Error
            ? cause.message
            : "Search could not be completed.",
      });
    } finally {
      if (current()) {
        active = false;
        update({ loading: false });
      }
    }
  }
  return {
    snapshot: () => state,
    setRequest(next: LibraryQueryRequest) {
      const nextKey = JSON.stringify(next);
      if (nextKey === key) return;
      /** Typing only changes keywords, so current results stay up until the debounced search replaces them. */
      const retyped = request !== null && scopeKey(request) === scopeKey(next);
      request = next;
      key = nextKey;
      sequence++;
      active = false;
      update({ page: retyped ? state.page : null, loading: true, error: null });
    },
    load,
    async allIds() {
      if (!request) return null;
      const capturedKey = key;
      const result = await runtime.ids(request);
      return key === capturedKey ? result.ids : null;
    },
    cancel() {
      sequence++;
      active = false;
    },
  };
}
