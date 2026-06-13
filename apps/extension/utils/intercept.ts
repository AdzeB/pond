// Runs in the page's MAIN world. MUST NOT touch chrome.* or WXT APIs — only
// DOM / web platform globals are available here.
//
// This module patches `fetch`, `XMLHttpRequest`, and `navigator.sendBeacon`
// exactly once per page and fans each request out to the registered source
// interceptors. Each source declares a cheap synchronous `match` (from request
// metadata) and a lazy `onResponse` that reads the request/response bodies only
// when it actually needs them.

const POND_EVENT = "pond:capture";

export function emit(message: unknown): void {
  window.postMessage({ type: POND_EVENT, message }, "*");
}

export function capture(url: string, trigger: string): void {
  emit({ kind: "capture", payload: { url, trigger } });
}

export function log(
  level: "info" | "warn" | "error",
  message: string,
  data?: unknown,
): void {
  emit({ kind: "log", level, message, data });
}

export interface RequestLens {
  readonly url: string;
  readonly method: string;
  /** Case-insensitive request header lookup. Returns null when unknown. */
  getHeader(name: string): string | null;
  /** Best-effort string form of the request body (cached). */
  readBody(): Promise<string | null>;
}

export interface ResponseLens {
  readonly status: number;
  readonly ok: boolean;
  /** Text body of the response, or null if it could not be read (cached). */
  readText(): Promise<string | null>;
}

export interface SourceInterceptor {
  /** Stable id; re-registering the same id is a no-op (double-injection guard). */
  id: string;
  /** Synchronous, cheap predicate over request metadata. */
  match(req: RequestLens): boolean;
  /** Invoked once the matched request settles. Throwing here is swallowed + logged. */
  onResponse(req: RequestLens, res: ResponseLens): void | Promise<void>;
  /** Optional observer for navigator.sendBeacon calls. */
  onBeacon?(url: string, body: string | null): void | Promise<void>;
}

interface Registry {
  handlers: SourceInterceptor[];
  ids: Set<string>;
  patchedFetch: boolean;
  patchedXhr: boolean;
  patchedBeacon: boolean;
}

const REGISTRY_KEY = "__pondInterceptors";

function registry(): Registry {
  const w = window as unknown as Record<string, Registry | undefined>;
  let reg = w[REGISTRY_KEY];
  if (!reg) {
    reg = {
      handlers: [],
      ids: new Set<string>(),
      patchedFetch: false,
      patchedXhr: false,
      patchedBeacon: false,
    };
    w[REGISTRY_KEY] = reg;
  }
  return reg;
}

function once<T>(fn: () => Promise<T>): () => Promise<T> {
  let cached: Promise<T> | undefined;
  return () => {
    if (!cached) cached = fn();
    return cached;
  };
}

function normalizeHeaders(
  source: HeadersInit | Headers | null | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!source) return out;
  if (typeof Headers !== "undefined" && source instanceof Headers) {
    source.forEach((value, key) => {
      out[key.toLowerCase()] = value;
    });
    return out;
  }
  if (Array.isArray(source)) {
    for (const entry of source) {
      if (Array.isArray(entry) && entry.length >= 2) {
        out[String(entry[0]).toLowerCase()] = String(entry[1]);
      }
    }
    return out;
  }
  for (const key of Object.keys(source as Record<string, string>)) {
    out[key.toLowerCase()] = String((source as Record<string, string>)[key]);
  }
  return out;
}

async function bodyToText(body: unknown): Promise<string | null> {
  if (body == null) return null;
  if (typeof body === "string") return body;
  if (body instanceof URLSearchParams) return body.toString();
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    const params = new URLSearchParams();
    body.forEach((value, key) => {
      params.append(key, typeof value === "string" ? value : "[file]");
    });
    return params.toString();
  }
  if (typeof Blob !== "undefined" && body instanceof Blob) {
    try {
      return await body.text();
    } catch {
      return null;
    }
  }
  if (body instanceof ArrayBuffer) return new TextDecoder().decode(body);
  if (ArrayBuffer.isView(body)) {
    return new TextDecoder().decode(body as ArrayBufferView);
  }
  return null;
}

function safeMatch(handler: SourceInterceptor, req: RequestLens): boolean {
  try {
    return handler.match(req);
  } catch (err) {
    log("warn", `${handler.id} match error`, String(err));
    return false;
  }
}

function dispatch(
  matched: SourceInterceptor[],
  req: RequestLens,
  res: ResponseLens,
): void {
  for (const handler of matched) {
    try {
      const result = handler.onResponse(req, res);
      if (result && typeof (result as Promise<void>).catch === "function") {
        (result as Promise<void>).catch((err) =>
          log("warn", `${handler.id} hook error`, String(err)),
        );
      }
    } catch (err) {
      log("warn", `${handler.id} hook error`, String(err));
    }
  }
}

function patchFetch(reg: Registry): void {
  if (reg.patchedFetch) return;
  reg.patchedFetch = true;
  const origFetch = window.fetch;

  window.fetch = function patchedFetch(
    this: unknown,
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const isRequest =
      typeof Request !== "undefined" && input instanceof Request;
    const url = isRequest ? (input as Request).url : String(input);
    const method = String(
      init?.method ?? (isRequest ? (input as Request).method : "GET"),
    ).toUpperCase();
    const headers = normalizeHeaders(
      init?.headers ?? (isRequest ? (input as Request).headers : null),
    );

    let matched: SourceInterceptor[] = [];
    let req: RequestLens | null = null;
    if (reg.handlers.length > 0) {
      const requestClone =
        isRequest && init?.body == null ? (input as Request).clone() : null;
      const readBody = once(async () => {
        if (init?.body != null) return bodyToText(init.body);
        if (requestClone) {
          try {
            return await requestClone.text();
          } catch {
            return null;
          }
        }
        return null;
      });
      req = {
        url,
        method,
        getHeader: (name) => headers[name.toLowerCase()] ?? null,
        readBody,
      };
      const candidate = req;
      matched = reg.handlers.filter((h) => safeMatch(h, candidate));
    }

    const promise = origFetch.call(this, input, init);
    if (matched.length === 0 || !req) return promise;

    const activeReq = req;
    const activeMatched = matched;
    promise
      .then((response) => {
        const clone = (() => {
          try {
            return response.clone();
          } catch {
            return null;
          }
        })();
        const readText = once(async () => {
          if (!clone) return null;
          try {
            return await clone.text();
          } catch {
            return null;
          }
        });
        dispatch(activeMatched, activeReq, {
          status: response.status,
          ok: response.ok,
          readText,
        });
      })
      .catch(() => {});

    return promise;
  } as typeof window.fetch;
}

interface XhrState {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

function patchXhr(reg: Registry): void {
  if (reg.patchedXhr) return;
  reg.patchedXhr = true;

  const proto = XMLHttpRequest.prototype;
  const origOpen = proto.open;
  const origSend = proto.send;
  const origSetHeader = proto.setRequestHeader;
  const states = new WeakMap<XMLHttpRequest, XhrState>();

  proto.open = function (
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ) {
    states.set(this, {
      method: String(method ?? "GET").toUpperCase(),
      url: String(url ?? ""),
      headers: {},
      body: null,
    });
    return (origOpen as (...args: unknown[]) => void).call(
      this,
      method,
      url,
      ...rest,
    );
  } as typeof proto.open;

  proto.setRequestHeader = function (
    this: XMLHttpRequest,
    name: string,
    value: string,
  ) {
    const state = states.get(this);
    if (state) {
      try {
        state.headers[String(name).toLowerCase()] = String(value);
      } catch {
        /* ignore */
      }
    }
    return origSetHeader.call(this, name, value);
  } as typeof proto.setRequestHeader;

  proto.send = function (
    this: XMLHttpRequest,
    body?: Document | XMLHttpRequestBodyInit | null,
  ) {
    const state = states.get(this);
    if (state && reg.handlers.length > 0) {
      state.body = body ?? null;
      const readBody = once(() => bodyToText(state.body));
      const req: RequestLens = {
        url: state.url,
        method: state.method,
        getHeader: (name) => state.headers[name.toLowerCase()] ?? null,
        readBody,
      };
      const matched = reg.handlers.filter((h) => safeMatch(h, req));
      if (matched.length > 0) {
        this.addEventListener(
          "load",
          () => {
            const readText = once(async () =>
              this.responseType === "" || this.responseType === "text"
                ? this.responseText
                : null,
            );
            dispatch(matched, req, {
              status: this.status,
              ok: this.status >= 200 && this.status < 300,
              readText,
            });
          },
          { once: true },
        );
      }
    }
    return origSend.call(this, body);
  } as typeof proto.send;
}

function patchBeacon(reg: Registry): void {
  if (reg.patchedBeacon) return;
  if (typeof navigator === "undefined" || !navigator.sendBeacon) return;
  reg.patchedBeacon = true;
  const origBeacon = navigator.sendBeacon.bind(navigator);

  navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) => {
    const result = origBeacon(url, data);
    const beaconHandlers = reg.handlers.filter((h) => h.onBeacon);
    if (beaconHandlers.length > 0) {
      const u = typeof url === "string" ? url : url.toString();
      void bodyToText(data).then((body) => {
        for (const handler of beaconHandlers) {
          try {
            void Promise.resolve(handler.onBeacon?.(u, body)).catch((err) =>
              log("warn", `${handler.id} beacon error`, String(err)),
            );
          } catch (err) {
            log("warn", `${handler.id} beacon error`, String(err));
          }
        }
      });
    }
    return result;
  };
}

/**
 * Register a source interceptor and lazily install the network patches.
 * Safe to call multiple times; the same `id` is only registered once.
 */
export function installInterceptor(def: SourceInterceptor): void {
  const reg = registry();
  if (reg.ids.has(def.id)) return;
  reg.ids.add(def.id);
  reg.handlers.push(def);
  patchFetch(reg);
  patchXhr(reg);
  if (def.onBeacon) patchBeacon(reg);
  log("info", `${def.id} inject ready`);
}
