import { sessionImportPayloadSchema } from "@pond/schema/session";
import log from "electron-log/main.js";
import type { Context } from "hono";
import { sessionImport } from "../ops";
import { invalidRequest } from "./errors";

export async function sessionImportHandler(c: Context): Promise<Response> {
  const parsed = sessionImportPayloadSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    log.warn(
      "[pond http] session/import validation failed",
      parsed.error.flatten(),
    );
    return invalidRequest(c, parsed.error);
  }

  const data = await sessionImport(parsed.data.source, parsed.data.cookies);
  return c.json({ status: "success", data });
}
