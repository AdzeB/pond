import { sql } from "drizzle-orm";
import { saves } from "../../db";
import { defineField } from "./descriptor";

function extension(path: unknown): string | null {
  if (typeof path !== "string") return null;
  const name = path.split(/[\\/]/).at(-1)?.split(/[?#]/, 1)[0] ?? "";
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1) return null;
  return name.slice(dot + 1).toLowerCase();
}

export const format = defineField({
  id: "format",
  type: "stringArray",
  label: "Format",
  group: "media",
  project: (save) => [
    ...new Set(
      (save.files ?? [])
        .map((file) =>
          file && typeof file === "object" && "path" in file
            ? extension(file.path)
            : null,
        )
        .filter((value): value is string => value !== null),
    ),
  ],
  sqlProjection: () => sql`${saves.files}`,
});
