import { sql } from "drizzle-orm";
import { saves } from "../../db";
import { defineField } from "./descriptor";
import { shapeOf } from "./shared";

const SHAPE_PRESETS = [
  { id: "landscape", label: "Landscape", value: "landscape" },
  { id: "portrait", label: "Portrait", value: "portrait" },
  { id: "square", label: "Square", value: "square" },
] as const;

export const shape = defineField({
  id: "shape",
  type: "enum",
  label: "Shape",
  group: "media",
  presets: SHAPE_PRESETS,
  project: (s) => shapeOf(s.width, s.height),
  sqlProjection: () => sql`case
    when ${saves.width} is null or ${saves.height} is null
      or ${saves.width} = 0 or ${saves.height} = 0 then null
    when (cast(${saves.width} as real) / ${saves.height}) > 0.9
      and (cast(${saves.width} as real) / ${saves.height}) < 1.1 then 'square'
    when (cast(${saves.width} as real) / ${saves.height}) < 0.9 then 'portrait'
    else 'landscape'
  end`,
});
