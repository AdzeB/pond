import { saves } from "@pond/schema/db";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { saveIsLocked } from "../core/security/folder-passwords";
import { getDb } from "../db";

export async function itemInfoHandler(c: Context) {
  const id = c.req.query("id");
  if (!id) return c.json({ status: "error", error: "Missing id" }, 400);
  if (await saveIsLocked(id))
    return c.json({ status: "error", error: "Not found" }, 404);

  const db = await getDb();
  const [row] = await db.select().from(saves).where(eq(saves.id, id)).limit(1);
  if (!row) return c.json({ status: "error", error: "Not found" }, 404);
  return c.json({ status: "success", data: row });
}
