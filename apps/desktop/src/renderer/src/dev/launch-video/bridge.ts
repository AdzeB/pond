/** Stands in for the preload bridge so the real renderer boots on sample data with no main process. */
import type {
  QueryInput,
  QueryName,
  QueryResult,
} from "@shared/query-contracts";

type Handler = (args: unknown) => unknown;
type Listener = (payload: unknown) => void;

export type QueryHandlers = {
  [K in QueryName]?: (
    input: QueryInput<K>,
  ) => QueryResult<K> | Promise<QueryResult<K>>;
};

interface BridgeLog {
  calls: Record<string, number>;
  queries: Record<string, number>;
  missing: Record<string, number>;
}

const log: BridgeLog = { calls: {}, queries: {}, missing: {} };
const queries: Record<string, Handler> = {};
const listeners = new Map<string, Set<Listener>>();

let markReady: () => void = () => {};
/** Sibling modules can query while fixtures are still fetching, so queries wait for them. */
const ready = new Promise<void>((resolve) => {
  markReady = resolve;
});

const methods: Record<string, (...args: unknown[]) => unknown> = {
  libraryId: () => "launch-video",
  query: async (name: unknown, args: unknown) => {
    await ready;
    const key = String(name);
    log.queries[key] = (log.queries[key] ?? 0) + 1;
    const handler = queries[key];
    if (!handler) log.missing[key] = (log.missing[key] ?? 0) + 1;
    return handler ? handler(args ?? {}) : undefined;
  },
};

export function fixturesReady() {
  markReady();
}

function fallback(name: string) {
  return (...args: unknown[]) => {
    log.calls[name] = (log.calls[name] ?? 0) + 1;
    if (/^on[A-Z]/.test(name)) {
      const listener = args[0] as Listener;
      const set = listeners.get(name) ?? new Set();
      set.add(listener);
      listeners.set(name, set);
      return () => set.delete(listener);
    }
    return Promise.resolve(undefined);
  };
}

const bridge = new Proxy(methods, {
  get(target, prop) {
    if (typeof prop !== "string") return undefined;
    return target[prop] ?? fallback(prop);
  },
});

localStorage.clear();
localStorage.setItem("pond:onboarding:2026", "complete");

Object.assign(window, {
  pond: bridge,
  __pondShell: { theme: "light" },
  __bridgeLog: log,
});

export function defineQueries(handlers: QueryHandlers) {
  Object.assign(queries, handlers);
}

export function defineMethods(
  handlers: Record<string, (...args: unknown[]) => unknown>,
) {
  Object.assign(methods, handlers);
}

export function emit(event: string, payload: unknown) {
  for (const listener of listeners.get(event) ?? []) listener(payload);
}
