import { sql } from "drizzle-orm";
import { saves } from "../../db";
import { defineField } from "./descriptor";

/** Enum options come from the live account registry in the renderer, so there are no static presets here. */
export const account = defineField({
  id: "account",
  type: "enum",
  label: "Account",
  group: "people",
  project: (s) => s.accountId ?? "",
  sqlProjection: () => sql`coalesce(${saves.accountId}, '')`,
});
