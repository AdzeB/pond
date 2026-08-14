import type { SessionImportResponse } from "@pond/schema/session";
import { sessionImportPayloadSchema } from "@pond/schema/session";
import log from "electron-log/main.js";
import type { Context } from "hono";
import { primaryDomainForSource } from "../core/refresh/scrape-window";
import { importSessionCookies } from "../core/session-import";

export async function sessionImportHandler(c: Context): Promise<Response> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ status: "error", error: "invalid_json" }, 400);
  }

  const parsed = sessionImportPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    log.warn(
      "[pond http] session/import validation failed",
      parsed.error.flatten(),
    );
    return c.json({ status: "error", error: parsed.error.flatten() }, 400);
  }

  const { source, cookies } = parsed.data;
  const domain = primaryDomainForSource(source);
  if (!domain) {
    return c.json(
      {
        status: "error",
        error: `source ${source} has no cookie domain configured`,
      },
      400,
    );
  }

  const body: SessionImportResponse = await importSessionCookies(
    source,
    cookies,
  );
  return c.json({ status: "success", data: body });
}
