import type { TagGroupRow } from "@/features/tags/state/tag-groups";
import type { TagRow } from "@/features/tags/state/tags";

export interface GroupStats {
  members: TagRow[];
}

export const EMPTY_STATS: GroupStats = {
  members: [],
};

export type TagsRowData =
  | {
      id: string;
      kind: "group";
      group: TagGroupRow;
      stats: GroupStats;
      children: TagsRowData[];
    }
  | {
      id: string;
      kind: "tag";
      tag: TagRow;
      inGroup: string | null;
      saves: number;
    };
