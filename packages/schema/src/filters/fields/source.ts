import { sql } from "drizzle-orm";
import { saves } from "../../db";
import { sourceIdentity } from "../../domain";
import { defineField } from "./descriptor";

export const source = defineField({
  id: "source",
  type: "enum",
  label: "Source",
  group: "content",
  project: (s) => sourceIdentity(s),
  sqlProjection: () => sql`lower(coalesce(
    nullif(trim(${saves.siteName}), ''),
    case when ${saves.source} = 'local' then 'local' else null end
  ))`,
});
