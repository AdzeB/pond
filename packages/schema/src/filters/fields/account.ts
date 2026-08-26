import { sql } from "drizzle-orm";
import { saves } from "../../db";
import { defineField } from "./descriptor";

export const account = defineField({
  id: "account",
  type: "enum",
  label: "Account",
  group: "people",
  project: (s) => (s.accountId ?? "").toLowerCase(),
  sqlProjection: () => sql`lower(coalesce(${saves.accountId}, ''))`,
});
