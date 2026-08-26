import { sessionImportPayloadSchema } from "@pond/schema/session";
import log from "electron-log/main.js";
import type { Context } from "hono";
import { sessionImport } from "../ops";

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

  const data = await sessionImport(parsed.data.source, parsed.data.cookies);
  return c.json({ status: "success", data });
}
