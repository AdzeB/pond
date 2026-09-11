import { saves } from "@pond/schema/db";
import { EMPTY_QUERY } from "@pond/schema/filters";
import { count, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";
import type { LibrarySidebarCounts } from "../../shared/sidebar-counts";
import type { Db } from "../db";
import { libraryQueryWhere } from "./library-query";
export function querySidebarCounts(db: Db): LibrarySidebarCounts {
  return db.$raw.transaction(() => {
    const live = libraryQueryWhere({ query: EMPTY_QUERY });
    const rows = db
      .select({
        library: count(),
        untagged: sql<number>`sum(case when json_array_length(coalesce(${saves.tags},'[]'))=0 then 1 else 0 end)`,
        uncategorized: sql<number>`sum(case when not exists(select 1 from save_folders where save_id=${saves.id}) then 1 else 0 end)`,
      })
      .from(saves)
      .where(live)
      .get();
    const folderRows = z
      .array(z.object({ id: z.string(), n: z.number() }))
      .parse(
        db.all(
          sql`select save_folders.folder_id as id,count(*) as n from save_folders join saves on saves.id=save_folders.save_id where ${live} group by save_folders.folder_id`,
        ),
      );
    return {
      library: rows?.library ?? 0,
      untagged: rows?.untagged ?? 0,
      uncategorized: rows?.uncategorized ?? 0,
      trash:
        db
          .select({ n: count() })
          .from(saves)
          .where(isNotNull(saves.deletedAt))
          .get()?.n ?? 0,
      folders: Object.fromEntries(folderRows.map((row) => [row.id, row.n])),
    };
  })();
}
