import { sql } from "drizzle-orm";
import { saves } from "../../db";
import { defineField } from "./descriptor";

// Connected account (prefs sync.accounts id) that ingested the save. Enum
// options come from the live account registry in the renderer, so there are
// no static presets here.
export const account = defineField({
  id: "account",
  type: "enum",
  label: "Account",
  group: "people",
  project: (s) => s.accountId ?? "",
  sqlProjection: () => sql`coalesce(${saves.accountId}, '')`,
});
