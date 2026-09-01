import {
  capture,
  installInterceptor,
  type RequestLens,
} from "@/utils/intercept";
import { at, type JsonValue, parseJsonValue } from "@/utils/json";

const SAVE_RE =
  /\/resource\/(?:Repin|RepinSave|BoardPickerSave|UserPin|Pin)Resource\/create\/?(?:\?|$)/i;

function decodeDataParam(encoded: string): JsonValue | null {
  let decoded = encoded;
  try {
    decoded = decodeURIComponent(encoded);
  } catch {
    /* already decoded */
  }
  return parseJsonValue(decoded) ?? parseJsonValue(encoded);
}

function pinIdFromBody(body: string | null): string | null {
  if (!body) return null;
  let json: JsonValue | null = null;
  if (body.startsWith("data=")) {
    json = decodeDataParam(body.slice(5).split("&")[0] ?? "");
  } else if (body.includes("&data=")) {
    const m = body.match(/(?:^|&)data=([^&]+)/);
    if (m?.[1]) json = decodeDataParam(m[1]);
  } else if (body.startsWith("{")) {
    json = parseJsonValue(body);
  }
  if (!json) return null;
  const opts = at(json, "options") ?? json;
  const id =
    at(opts, "pin_id") ??
    at(opts, "id") ??
    at(opts, "source_pin_id") ??
    at(opts, "sourceId");
  return id ? String(id) : null;
}

export function inject(): void {
  const emitted = new Set<string>();
  installInterceptor({
    id: "pinterest",
    match: (req: RequestLens) => req.method === "POST" && SAVE_RE.test(req.url),
    async onResponse(req, res) {
      if (!res.ok) return;
      const id = pinIdFromBody(await req.readBody());
      if (!id || emitted.has(id)) return;
      emitted.add(id);
      capture(`https://www.pinterest.com/pin/${id}/`, "pinterest:save");
    },
  });
}
