/** Stands in for the preload bridge so the real renderer boots on sample data with no main process. */
import type { Prefs } from "@pond/schema/db";
import type {
  QueryInput,
  QueryName,
  QueryResult,
} from "@shared/query-contracts";
import type { PondApi } from "../../../../preload";

type PrefsListener = (prefs: Prefs) => void;
/** Any argument some preload method accepts. */
type BridgeArgument = Parameters<PondApi[keyof PondApi]>[number];

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
const queries: QueryHandlers = {};
const listeners = new Map<string, Set<PrefsListener>>();

let markReady: () => void = () => {};
/** Sibling modules can query while fixtures are still fetching, so queries wait for them. */
const ready = new Promise<void>((resolve) => {
  markReady = resolve;
});

async function query<K extends QueryName>(
  name: K,
  args?: QueryInput<K>,
): Promise<QueryResult<K>> {
  await ready;
  log.queries[name] = (log.queries[name] ?? 0) + 1;
  const handler: QueryHandlers[K] = queries[name];
  if (!handler) {
    log.missing[name] = (log.missing[name] ?? 0) + 1;
    /** SAFETY: an unhandled query resolves empty on purpose, and `__bridgeLog.missing` reports it. */
    return undefined as never;
  }
  /** SAFETY: callers omit `args` only for queries whose input is an empty object. */
  return handler((args ?? {}) as QueryInput<K>);
}

const methods: Partial<PondApi> = {
  libraryId: () => "launch-video",
  query,
};

export function fixturesReady() {
  markReady();
}

function fallback(name: string) {
  return (...args: BridgeArgument[]) => {
    log.calls[name] = (log.calls[name] ?? 0) + 1;
    if (/^on[A-Z]/.test(name)) {
      /** SAFETY: every `on*` preload method takes its listener first, and only prefs are emitted. */
      const listener = args[0] as PrefsListener;
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
    const name = String(prop);
    if (!Object.hasOwn(target, name)) return fallback(name);
    /** SAFETY: `hasOwn` just confirmed `name` is one of the defined methods. */
    return target[name as keyof PondApi];
  },
});

localStorage.clear();
localStorage.setItem("pond:onboarding:2026", "complete");
/** Six columns at the 1110px stage frame, matching the original cut. */
localStorage.setItem("pond.gridZoom", "120");

Object.assign(window, {
  pond: bridge,
  __pondShell: { theme: "light" },
  __bridgeLog: log,
});

export function defineQueries(handlers: QueryHandlers) {
  Object.assign(queries, handlers);
}

export function defineMethods(handlers: Partial<PondApi>) {
  Object.assign(methods, handlers);
}

export function emitPrefsChanged(prefs: Prefs) {
  for (const listener of listeners.get("onPrefsChanged") ?? []) {
    listener(prefs);
  }
}
