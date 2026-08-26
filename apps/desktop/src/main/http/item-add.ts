import { enqueueRequestSchema } from "@pond/schema/ingest";
import log from "electron-log/main.js";
import type { Context } from "hono";
import { UnsupportedError } from "../core/pipeline/extractors/errors";
import { enqueue } from "../ops";

export async function enqueueHandler(c: Context) {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ status: "error", error: "invalid json body" }, 400);
  }

  const parsed = enqueueRequestSchema.safeParse(raw);
  if (!parsed.success) {
    log.warn("[pond http] enqueue validation failed", parsed.error.flatten());
    return c.json({ status: "error", error: parsed.error.flatten() }, 400);
  }

  try {
    const cookies = parsed.data.cookies;
    const result = await enqueue(parsed.data.url, {
      ...(parsed.data.trigger ? { trigger: parsed.data.trigger } : {}),
      ...(cookies && cookies.length > 0 ? { cookies } : {}),
    });
    return c.json({ status: "success", data: result });
  } catch (err) {
    if (err instanceof UnsupportedError) {
      return c.json({ status: "error", error: "unsupported_url" }, 422);
    }
    log.error("[pond http] enqueue failed", err);
    return c.json({ status: "error", error: String(err) }, 500);
  }
}
