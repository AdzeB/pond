import type { Source } from "@pond/schema/db";
import type { SessionImportResponse } from "@pond/schema/session";

export const POND_EVENT = "pond:capture";

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
      reason: "offline" | "no_cookies" | "network";
      detail?: string;
    };

export interface PondSettings {
  enabled: Record<Source, boolean>;
}

export const DEFAULT_SETTINGS: PondSettings = {
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
    web: false,
    local: false,
  },
};

/** Keep `enabled` from older stored shapes; drop port, apiKey, and endpoint. */
export function normalizeStoredSettings(stored: unknown): PondSettings {
  const base = (stored ?? {}) as Partial<PondSettings> & {
    enabled?: Partial<Record<Source, boolean>>;
  };
  return {
    enabled: { ...DEFAULT_SETTINGS.enabled, ...(base.enabled ?? {}) },
  };
}
