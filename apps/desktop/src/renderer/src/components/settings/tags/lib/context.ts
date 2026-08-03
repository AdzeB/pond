import { createContext, use } from "react";

/** The colour is the explicit group colour or the name-derived fallback. */
export interface TagGroupOption {
  name: string;
  color: string;
}

/** Global table metadata every row needs but that isn't row-specific. */
interface TagsTableValue {
  groups: TagGroupOption[];
}

export const TagsTableContext = createContext<TagsTableValue | null>(null);

export function useTagsTable(): TagsTableValue {
  const ctx = use(TagsTableContext);
  if (!ctx) throw new Error("Tags cell must be used within TagsTableContext");
  return ctx;
}
