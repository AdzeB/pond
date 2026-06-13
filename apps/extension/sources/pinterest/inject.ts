import {
  capture,
  installInterceptor,
  type RequestLens,
} from "@/utils/intercept";

const SAVE_RE =
  /\/resource\/(?:Repin|RepinSave|BoardPickerSave|UserPin|Pin)Resource\/create\/?(?:\?|$)/i;

function decodeDataParam(encoded: string): unknown {
  try {
    return JSON.parse(decodeURIComponent(encoded));
  } catch {
    try {
      return JSON.parse(encoded);
    } catch {
      return null;
    }
  }
}

function pinIdFromBody(body: string | null): string | null {
  if (!body) return null;
  let json: any = null;
  if (body.startsWith("data=")) {
    json = decodeDataParam(body.slice(5).split("&")[0]);
  } else if (body.includes("&data=")) {
    const m = body.match(/(?:^|&)data=([^&]+)/);
    if (m) json = decodeDataParam(m[1]);
  } else if (body.startsWith("{")) {
    try {
      json = JSON.parse(body);
    } catch {
      json = null;
    }
  }
  if (!json) return null;
  const opts = json.options ?? json;
  const id =
    opts?.pin_id ?? opts?.id ?? opts?.source_pin_id ?? opts?.sourceId ?? null;
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
