import { sql } from "drizzle-orm";
import { saves } from "../../db";
import { defineField } from "./descriptor";

export const fontActivated = defineField({
  id: "fontActivated",
  type: "boolean",
  label: "Activated Font",
  group: "media",
  project: (save) => save.fontActivated ?? false,
  sqlProjection: () => sql`${saves.fontActivated}`,
});
