import { saves } from "@pond/schema/db";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { getDb } from "../db";
import { apiError } from "./errors";

export async function saveInfoHandler(c: Context) {
  const id = c.req.query("id");
  if (!id) return apiError(c, "invalid_request", "Pass a Save id as ?id=.");

  const db = await getDb();
  const [row] = await db.select().from(saves).where(eq(saves.id, id)).limit(1);
  if (!row) return apiError(c, "save_not_found", `No Save has the id ${id}.`);
  return c.json({ status: "success", data: row });
}
