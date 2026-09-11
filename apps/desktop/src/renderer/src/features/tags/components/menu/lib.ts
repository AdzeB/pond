export type TagNavId = "all" | "uncategorized" | string;

export interface TagNavItem {
  id: TagNavId;
  kind: "all" | "group" | "uncategorized";
  label: string;
  count: number;
}

interface RecentPartition<T> {
  recent: T[];
  others: T[];
}

export function partitionRecent<
  T extends { lastUsedAt: number | null; name: string },
>(tags: readonly T[]): RecentPartition<T> {
  const recent: T[] = [];
  const others: T[] = [];
  for (const tag of tags) {
    if (tag.lastUsedAt != null) recent.push(tag);
    else others.push(tag);
  }
  recent.sort(
    (a, b) =>
      (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0) || a.name.localeCompare(b.name),
  );
  others.sort((a, b) => a.name.localeCompare(b.name));
  return { recent, others };
}

export function filterByNav<T extends { id: string }>(
  tags: readonly T[],
  navId: TagNavId,
  groupedIds: ReadonlySet<string>,
  groupTagIds: ReadonlyMap<string, ReadonlySet<string>>,
): T[] {
  if (navId === "all") return tags.slice();
  if (navId === "uncategorized") {
    return tags.filter((tag) => !groupedIds.has(tag.id));
  }
  const ids = groupTagIds.get(navId);
  if (!ids) return [];
  return tags.filter((tag) => ids.has(tag.id));
}

export function buildTagNav(
  allCount: number,
  groups: ReadonlyArray<{
    id: string;
    name: string;
    count: number;
  }>,
  uncategorizedCount: number,
): TagNavItem[] {
  const items: TagNavItem[] = [
    { id: "all", kind: "all", label: "All", count: allCount },
  ];
  for (const group of groups) {
    items.push({
      id: group.id,
      kind: "group",
      label: group.name,
      count: group.count,
    });
  }
  if (uncategorizedCount > 0) {
    items.push({
      id: "uncategorized",
      kind: "uncategorized",
      label: "Uncategorized",
      count: uncategorizedCount,
    });
  }
  return items;
}

export function partitionPickerTags<
  T extends { starred: boolean; lastUsedAt: number | null; name: string },
>(tags: readonly T[]) {
  const starred = tags
    .filter((tag) => tag.starred)
    .sort((a, b) => a.name.localeCompare(b.name));
  return { starred, ...partitionRecent(tags.filter((tag) => !tag.starred)) };
}
