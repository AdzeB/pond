import type { SessionImportResponse } from "@pond/schema/session";
import { SOURCES, type Source } from "@pond/schema/source-ids";
import { at, isRecord, type JsonValue } from "./json";

export const POND_EVENT = "pond:capture";

export interface PondCapturePayload {
  url: string;
  trigger?: string;
}

export interface PondLogEntry {
  level: "info" | "warn" | "error";
  message: string;
  data?: string;
}

/** Shape posted by injected MAIN-world scripts over `window.postMessage` before the content-script bridge relays it to the background. */
export type PondMessage =
  | { kind: "capture"; payload: PondCapturePayload }
  | {
      kind: "log";
      level: "info" | "warn" | "error";
      message: string;
      data?: string;
    };

export type PushSessionResult =
  | { ok: true; data: SessionImportResponse }
  | {
      ok: false;
      reason: "offline" | "no_cookies" | "network";
      detail?: string;
    };

export type ToolbarAction = "popup" | "save";

export type SourceFlags = Record<Source, boolean>;

/** A type alias, not an interface, so it stays assignable to the stored `JsonValue`. */
export type PondSettings = {
  enabled: SourceFlags;
  likes: SourceFlags;
  toolbar: ToolbarAction;
  confirmations: boolean;
};

const ALL_SOURCES_ON = {
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
} satisfies SourceFlags;

export const DEFAULT_SETTINGS: PondSettings = {
  enabled: ALL_SOURCES_ON,
  likes: ALL_SOURCES_ON,
  toolbar: "popup",
  confirmations: true,
};

function readFlags(value: JsonValue | undefined, fallback: SourceFlags) {
  const flags = { ...fallback };
  if (!isRecord(value)) return flags;
  for (const source of SOURCES) {
    if (source in value) flags[source] = Boolean(value[source]);
  }
  return flags;
}

export function normalizeStoredSettings(stored: JsonValue): PondSettings {
  return {
    enabled: readFlags(at(stored, "enabled"), DEFAULT_SETTINGS.enabled),
    likes: readFlags(at(stored, "likes"), DEFAULT_SETTINGS.likes),
    toolbar: at(stored, "toolbar") === "save" ? "save" : "popup",
    confirmations: at(stored, "confirmations") !== false,
  };
}
