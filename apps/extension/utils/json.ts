import { $ZodNumber, $ZodString, safeParse } from "zod/v4/core";

/** Each page hook is a separate bundle; core schemas and pure construction keep unused parsers out. */
export const TextValue = /* @__PURE__ */ new $ZodString({ type: "string" });
const NumberValue = /* @__PURE__ */ new $ZodNumber({ type: "number" });

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
  return value instanceof Object && !Array.isArray(value);
}

export function asText(value: JsonValue | undefined): string | undefined {
  const parsed = safeParse(TextValue, value);
  return parsed.success ? parsed.data : undefined;
}

export function asNumber(value: JsonValue | undefined): number | undefined {
  const parsed = safeParse(NumberValue, value);
  return parsed.success ? parsed.data : undefined;
}

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
    /** SAFETY: JSON.parse only yields JSON values; re-validating that walks the whole payload for nothing. */
    return JSON.parse(text) as JsonValue;
  } catch {
    return null;
  }
}

export function parseJsonRecord(text: string | null): JsonRecord | null {
  const value = parseJsonValue(text);
  return isRecord(value) ? value : null;
}
