import { sql } from "drizzle-orm";
import { z } from "zod";
import { saves } from "../../db";
import { defineField } from "./descriptor";

const FileFamily = z.object({ family: z.string().min(1) });

export const fontFamily = defineField({
  id: "fontFamily",
  type: "string",
  label: "Font Family",
  group: "media",
  project: (save) => {
    const parsed = FileFamily.safeParse(save.files?.[0]);
    return parsed.success ? parsed.data.family.toLowerCase() : null;
  },
  sqlProjection: () => sql`lower(json_extract(${saves.files}, '$[0].family'))`,
});
