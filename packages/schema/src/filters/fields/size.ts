import { sql } from "drizzle-orm";
import { saves } from "../../db";
import { defineField } from "./descriptor";

export const width = defineField({
  id: "width",
  type: "number",
  label: "Dimensions",
  group: "media",
  project: (s) => s.width ?? 0,
  sqlProjection: () => sql`${saves.width}`,
});

export const height = defineField({
  id: "height",
  type: "number",
  label: "Height",
  group: "media",
  project: (s) => s.height ?? 0,
  sqlProjection: () => sql`${saves.height}`,
});
