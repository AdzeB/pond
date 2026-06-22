import { sql } from "drizzle-orm";
import { saves } from "../../db";
import { defineField } from "./descriptor";

const SOURCE_PRESETS = [
  { id: "twitter", label: "Twitter / X", value: "twitter" },
  { id: "instagram", label: "Instagram", value: "instagram" },
  { id: "pinterest", label: "Pinterest", value: "pinterest" },
  { id: "arena", label: "Are.na", value: "arena" },
  { id: "cosmos", label: "Cosmos", value: "cosmos" },
  { id: "tiktok", label: "TikTok", value: "tiktok" },
  { id: "youtube", label: "YouTube", value: "youtube" },
  { id: "web", label: "Web", value: "web" },
  { id: "local", label: "Local", value: "local" },
] as const;

export const source = defineField({
  id: "source",
  type: "enum",
  label: "Source",
  group: "content",
  presets: SOURCE_PRESETS,
  project: (s) => (s.source ?? "").toLowerCase(),
  sqlProjection: () => sql`lower(${saves.source})`,
});
