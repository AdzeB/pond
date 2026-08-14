import { sql } from "drizzle-orm";
import { saves } from "../../db";
import { defineField } from "./descriptor";

/** Enum options come from the live account registry in the renderer, so there are no static presets here. */
export const account = defineField({
  id: "account",
  type: "enum",
  label: "Account",
  group: "people",
  /** ULIDs are stored uppercase; enum filter values are lowercased and SQLite `=` is case-sensitive. */
  project: (s) => (s.accountId ?? "").toLowerCase(),
  sqlProjection: () => sql`lower(coalesce(${saves.accountId}, ''))`,
});
