import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { useSaves } from "@/hooks/use-saves";
import { type TagGroupRow, useTagGroups } from "@/stores/tag-groups";
import { type TagRow, useTags } from "@/stores/tags";
import { colorForName } from "./lib/helpers";
import { EMPTY_STATS, type GroupStats, type TagsRowData } from "./lib/types";

export function useTagsData() {
  const tags = useTags();
  const groups = useTagGroups();
  const saves = useSaves();

  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);
  const [toggles, setToggles] = useState<Map<string, boolean>>(new Map());

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const s of saves) {
      if (s.deletedAt) continue;
      for (const t of s.tags) {
        const k = t.toLowerCase();
        c.set(k, (c.get(k) ?? 0) + 1);
      }
    }
    return c;
  }, [saves]);

  const countFor = useCallback(
    (name: string) => counts.get(name.toLowerCase()) ?? 0,
    [counts],
  );

  const tagsById = useMemo(() => {
    const m = new Map<string, TagRow>();
    for (const t of tags) m.set(t.id, t);
    return m;
  }, [tags]);

  const taggedIds = useMemo(() => {
    const set = new Set<string>();
    for (const g of groups) for (const id of g.tagIds) set.add(id);
    return set;
  }, [groups]);

  const groupStats = useMemo(() => {
    const m = new Map<string, GroupStats>();
    for (const g of groups) {
      const members = g.tagIds
        .map((id) => tagsById.get(id))
        .filter((t): t is TagRow => Boolean(t));
      let totalSaves = 0;
      let recentMs: number | null = null;
      let createdMs: number | null = null;
      for (const t of members) {
        totalSaves += countFor(t.name);
        if (t.lastUsedAt != null)
          recentMs =
            recentMs == null ? t.lastUsedAt : Math.max(recentMs, t.lastUsedAt);
        if (t.createdAt != null)
          createdMs =
            createdMs == null ? t.createdAt : Math.min(createdMs, t.createdAt);
      }
      m.set(g.id, { members, totalSaves, recentMs, createdMs });
    }
    return m;
  }, [groups, tagsById, countFor]);

  const groupOptions = useMemo(
    () =>
      groups.map((g) => ({
        name: g.name,
        color: g.color ?? colorForName(g.name),
      })),
    [groups],
  );
  const needle = deferredQ.trim().toLowerCase();

  const data = useMemo<TagsRowData[]>(() => {
    const groupRows: TagsRowData[] = groups
      .map((group) => {
        const stats = groupStats.get(group.id) ?? EMPTY_STATS;
        const children = stats.members
          .filter((t) =>
            needle ? t.name.toLowerCase().includes(needle) : true,
          )
          .map<TagsRowData>((tag) => ({
            id: `${group.id}:${tag.id}`,
            kind: "tag",
            tag,
            inGroup: group.name,
            saves: countFor(tag.name),
          }));
        return {
          id: group.id,
          kind: "group" as const,
          group,
          stats,
          children,
        };
      })
      .filter((row) => {
        if (row.kind !== "group") return true;
        if (!needle) return true;
        if (row.group.name.toLowerCase().includes(needle)) return true;
        return row.group.tagNames.some((n) => n.toLowerCase().includes(needle));
      });

    const tagRows: TagsRowData[] = tags
      .filter((t) => !taggedIds.has(t.id))
      .filter((t) => (needle ? t.name.toLowerCase().includes(needle) : true))
      .map((tag) => ({
        id: tag.id,
        kind: "tag" as const,
        tag,
        inGroup: null,
        saves: countFor(tag.name),
      }));

    return [...groupRows, ...tagRows];
  }, [tags, groups, groupStats, taggedIds, needle, countFor]);

  const isExpanded = useCallback(
    (g: TagGroupRow) =>
      toggles.has(g.id) ? Boolean(toggles.get(g.id)) : !g.collapsed,
    [toggles],
  );

  const expandedIds = useMemo<string[]>(() => {
    if (needle) return groups.map((g) => g.id);
    return groups.filter((g) => isExpanded(g)).map((g) => g.id);
  }, [needle, groups, isExpanded]);

  const onToggleExpand = useCallback(
    (id: string, next: boolean) => {
      const g = groups.find((x) => x.id === id);
      if (!g) return;
      setToggles((prev) => new Map(prev).set(id, next));
      void window.pond.query("tagGroups.update", {
        name: g.name,
        patch: { collapsed: !next },
      });
    },
    [groups],
  );

  const tagNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const row of data) {
      if (row.kind === "tag") m.set(row.id, row.tag.name);
      else
        for (const child of row.children)
          if (child.kind === "tag") m.set(child.id, child.tag.name);
    }
    return m;
  }, [data]);

  const namesFromIds = useCallback(
    (ids: string[]) => {
      const set = new Set<string>();
      for (const id of ids) {
        const name = tagNameById.get(id);
        if (name) set.add(name);
      }
      return [...set];
    },
    [tagNameById],
  );

  return {
    q,
    setQ,
    data,
    expandedIds,
    onToggleExpand,
    namesFromIds,
    groupOptions,
    total: tags.length,
  };
}
