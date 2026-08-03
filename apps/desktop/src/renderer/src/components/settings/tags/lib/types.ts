import type { TagGroupRow } from "@/stores/tag-groups";
import type { TagRow } from "@/stores/tags";

export interface GroupStats {
  members: TagRow[];
  totalSaves: number;
  recentMs: number | null;
  createdMs: number | null;
}

export const EMPTY_STATS: GroupStats = {
  members: [],
  totalSaves: 0,
  recentMs: null,
  createdMs: null,
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
