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
  sqlProjection: () =>
    sql`pond_source_identity(${saves.siteName}, ${saves.source}, ${saves.url})`,
});
