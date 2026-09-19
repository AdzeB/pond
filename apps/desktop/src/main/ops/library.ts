import { saves } from "@pond/schema/db";
import { count, isNull } from "drizzle-orm";
import { readLibraryIdentity } from "../core/library-identity";
import { getDb } from "../db";
import { libraryRoot } from "../paths";
import { resolveTheme } from "../theme";

export interface LibraryInfo {
  path: string;
  name: string;
  counts: { active: number };
  theme: Awaited<ReturnType<typeof resolveTheme>>;
}

export async function libraryInfo(): Promise<LibraryInfo> {
  const db = await getDb();
  const [total] = await db
    .select({ n: count() })
    .from(saves)
    .where(isNull(saves.deletedAt));
  return {
    path: libraryRoot(),
    name: readLibraryIdentity(libraryRoot()).name,
    counts: {
      active: Number(total?.n ?? 0),
    },
    theme: await resolveTheme(),
  };
}
