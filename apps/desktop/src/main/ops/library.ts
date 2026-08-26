import { saves } from "@pond/schema/db";
import { count, isNull } from "drizzle-orm";
import { getDb } from "../db";
import { libraryRoot } from "../paths";
import { resolveTheme } from "../theme";

export async function libraryInfo() {
  const db = await getDb();
  const [total] = await db
    .select({ n: count() })
    .from(saves)
    .where(isNull(saves.deletedAt));
  return {
    path: libraryRoot(),
    name:
      libraryRoot()
        .split("/")
        .pop()
        ?.replace(/\.(pond|library)$/, "") ?? "Library",
    counts: {
      active: Number(total?.n ?? 0),
    },
    theme: await resolveTheme(),
  };
}
