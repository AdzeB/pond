import { sql } from "drizzle-orm";
import { z } from "zod";
import { saves } from "../../db";
import { defineField } from "./descriptor";

const FileBpm = z.object({ bpm: z.number().finite() });

export const bpm = defineField({
  id: "bpm",
  type: "number",
  label: "BPM",
  group: "media",
  project: (save) => {
    const parsed = FileBpm.safeParse(save.files?.[0]);
    return parsed.success ? parsed.data.bpm : null;
  },
  sqlProjection: () => sql`json_extract(${saves.files}, '$[0].bpm')`,
});
