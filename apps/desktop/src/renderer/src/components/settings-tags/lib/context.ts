import { createContext } from "react";

// Shared state + callbacks for every row in the tags table. Lets group rows and
// tag rows read selection and helpers without threading props through each level.
export interface TagsTableValue {
  selected: ReadonlySet<string>;
  selecting: boolean;
  toggleSelect: (id: string) => void;
  maxUsage: number;
  countFor: (name: string) => number;
  groupNames: string[];
  onOpen: (name: string) => void;
}

export const TagsTableContext = createContext<TagsTableValue | null>(null);
