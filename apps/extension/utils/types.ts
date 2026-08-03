import type { Source } from "@pond/schema/db";
import type { SessionImportResponse } from "@pond/schema/session";

export const POND_EVENT = "pond:capture";

const DEFAULT_PORT = 41610;

export interface PondCapturePayload {
  url: string;
  trigger?: string;
}

export interface PondLogEntry {
  level: "info" | "warn" | "error";
  message: string;
  data?: unknown;
}

/** Shape posted by injected MAIN-world scripts over `window.postMessage` before the content-script bridge relays it to the background. */
export type PondMessage =
  | { kind: "capture"; payload: PondCapturePayload }
  | { kind: "pushSession"; source: Source }
  | { kind: "openPond"; path?: string }
  | {
      kind: "log";
      level: "info" | "warn" | "error";
      message: string;
      data?: unknown;
    };

export type PushSessionResult =
  | { ok: true; data: SessionImportResponse }
  | {
      ok: false;
      reason: "unpaired" | "no_cookies" | "network";
      detail?: string;
    };

export interface PondSettings {
  port: number;
  apiKey: string;
  enabled: Record<Source, boolean>;
}

export const DEFAULT_SETTINGS: PondSettings = {
  port: DEFAULT_PORT,
  apiKey: "",
  enabled: {
    twitter: true,
    instagram: true,
    pinterest: true,
    arena: true,
    cosmos: true,
    tiktok: true,
    youtube: true,
    reddit: true,
    threads: true,
    /** Generic web links are a desktop-side fallback, not an extension toggle. */
    web: false,
    local: false,
  },
};

/** Migrate legacy `endpoint` URL to the stored `port`, salvaging the port when possible. */
export function normalizeStoredSettings(stored: unknown): PondSettings {
  const base = (stored ?? {}) as Partial<PondSettings> & {
    endpoint?: string;
    port?: number;
  };
  const port =
    typeof base.port === "number" && Number.isFinite(base.port)
      ? base.port
      : (portFromLegacyEndpoint(base.endpoint) ?? DEFAULT_SETTINGS.port);
  return {
    ...DEFAULT_SETTINGS,
    ...base,
    port,
    enabled: { ...DEFAULT_SETTINGS.enabled, ...(base.enabled ?? {}) },
  };
}

function portFromLegacyEndpoint(endpoint: string | undefined): number | null {
  if (!endpoint) return null;
  try {
    const u = new URL(endpoint);
    const p = Number.parseInt(u.port || "0", 10);
    return Number.isFinite(p) && p > 0 ? p : null;
  } catch {
    return null;
  }
}

export function enqueueUrl(port: number): string {
  return `http://127.0.0.1:${port}/api/v2/enqueue`;
}

export function libraryInfoUrl(port: number): string {
  return `http://127.0.0.1:${port}/api/v2/library/info`;
}

export function sessionImportUrl(port: number): string {
  return `http://127.0.0.1:${port}/api/v2/session/import`;
}

export function sessionPendingUrl(port: number): string {
  return `http://127.0.0.1:${port}/api/v2/session/pending`;
}

export function itemGetUrl(port: number): string {
  return `http://127.0.0.1:${port}/api/v2/item/get`;
}

export function itemThumbUrl(port: number, id: string): string {
  return `http://127.0.0.1:${port}/api/v2/item/thumb?id=${encodeURIComponent(id)}`;
}
