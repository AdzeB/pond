import { saves } from "@pond/schema/db";
import { enqueueRequestSchema } from "@pond/schema/ingest";
import { eq } from "drizzle-orm";
import log from "electron-log/main.js";
import type { Context } from "hono";
import { addSavesToFolder } from "../core/folders";
import { UnsupportedError } from "../core/pipeline/extractors/errors";
import { setSaveTags } from "../core/tags";
import { getDb } from "../db";
import { type EnqueueOptions, enqueue } from "../ops";

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
    const options: EnqueueOptions = {};
    if (parsed.data.trigger) options.trigger = parsed.data.trigger;
    if (cookies && cookies.length > 0) options.cookies = cookies;
    const result = await enqueue(parsed.data.url, options);
    if (parsed.data.tags?.length) {
      const [row] = await (await getDb())
        .select({ tags: saves.tags })
        .from(saves)
        .where(eq(saves.id, result.id))
        .limit(1);
      await setSaveTags(result.id, [...(row?.tags ?? []), ...parsed.data.tags]);
    }
    if (parsed.data.folderId) {
      await addSavesToFolder(parsed.data.folderId, [result.id]);
    }
    return c.json({ status: "success", data: result });
  } catch (err) {
    if (err instanceof UnsupportedError) {
      return c.json({ status: "error", error: "unsupported_url" }, 422);
    }
    log.error("[pond http] enqueue failed", err);
    return c.json({ status: "error", error: String(err) }, 500);
  }
}
