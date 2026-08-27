/**
 * Injected scripts run in the page on every visit to a supported site, so they read payloads
 * structurally instead of bundling zod. The `no-runtime-typeof` findings in this file are the
 * accepted trade for that, and they stay concentrated here.
 */

export interface JsonRecord {
  [key: string]: JsonValue;
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | JsonRecord;

export function isRecord(value: JsonValue | undefined): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asText(value: JsonValue | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function asNumber(value: JsonValue | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

/** Reads a nested field; platform payloads nest ids several levels deep. */
export function at(
  value: JsonValue | undefined,
  ...path: string[]
): JsonValue | undefined {
  let current = value;
  for (const key of path) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return current;
}

/** Page hooks must never throw, so a body that is not JSON reads as absent. */
export function parseJsonValue(text: string | null): JsonValue | null {
  if (!text) return null;
  try {
    // SAFETY: JSON.parse only yields JSON values; re-validating that walks the whole payload for nothing.
    return JSON.parse(text) as JsonValue;
  } catch {
    return null;
  }
}

export function parseJsonRecord(text: string | null): JsonRecord | null {
  const value = parseJsonValue(text);
  return isRecord(value) ? value : null;
}
