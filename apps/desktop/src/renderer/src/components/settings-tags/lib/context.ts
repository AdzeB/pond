import { createContext, use } from "react";

/** A group as offered in the "Move to group" menu — name plus its resolved
 * swatch colour (explicit group colour, or the name-derived fallback). */
export interface TagGroupOption {
  name: string;
  color: string;
}

// Global table metadata every row needs but that isn't row-specific: the
// groups (for the "Move to group" menu). Selection/expansion now live in the
// DataTable primitive, so they no longer belong here.
export interface TagsTableValue {
  groups: TagGroupOption[];
}

export const TagsTableContext = createContext<TagsTableValue | null>(null);

export function useTagsTable(): TagsTableValue {
  const ctx = use(TagsTableContext);
  if (!ctx) throw new Error("Tags cell must be used within TagsTableContext");
  return ctx;
}
