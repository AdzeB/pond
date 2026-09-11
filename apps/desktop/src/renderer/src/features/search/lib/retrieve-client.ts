import type { LibraryQueryRequest } from "@shared/library-query";
import { z } from "zod";

const HitSchema = z.object({
  hits: z.array(z.object({ id: z.string() })).catch([]),
});

export async function retrieveSaveIds(input: {
  libraryQuery?: LibraryQueryRequest;
  query?: string;
  visual?:
    | { kind: "saveId"; id: string }
    | { kind: "vector"; model: string; values: number[] };
  saveIds?: string[];
  limit?: number;
}): Promise<string[]> {
  const parsed = HitSchema.parse(
    await window.pond.query("saves.retrieve", {
      query: input.query,
      libraryQuery: input.libraryQuery,
      visual: input.visual,
      saveIds: input.saveIds,
      limit: input.limit ?? 500,
    }),
  );
  return parsed.hits.map((hit) => hit.id);
}
