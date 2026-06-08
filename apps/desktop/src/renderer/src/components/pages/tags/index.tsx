import {
  IconGridOutline18 as LayoutGrid,
  IconListCheckboxOutline18 as ListChecks,
  IconPlusOutline18 as Plus,
} from "@pond/icons/outline/18";
import { Input, Shell } from "@pond/ui";
import { useNavigate } from "@tanstack/react-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AllTags,
  type DisplayItem,
  type RailKey,
} from "@/components/library/all-tags";
import { DisplayMenu } from "@/components/menus/display";
import { TagPicker } from "@/components/popovers/tag-picker";
import { Library as Sidebar } from "@/components/sidebars/library";
import { setQuery } from "@/lib/stores/view-store";
import { adaptNavigate } from "@/lib/utils/navigate-path";
import { useSaves } from "@/pool/hooks";
import { usePrefs } from "@/pool/prefs";
import { useTagGroups } from "@/pool/tag-groups";
import { type TagRow, useTags } from "@/pool/tags";
import styles from "./styles.module.css";

interface AlphaSection {
  letter: string;
  items: DisplayItem[];
}

export function Tags() {
  const tags = useTags();
  const groups = useTagGroups();
  const saves = useSaves();
  const tsNavigate = useNavigate();
  const navigate = useMemo(() => adaptNavigate(tsNavigate), [tsNavigate]);
  const [prefs, patchPrefs] = usePrefs("allTags");
  const [selectedRail, setSelectedRail] = useState<RailKey>("all");
  const [q, setQ] = useState("");

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

  const taggedIds = useMemo(() => {
    const set = new Set<string>();
    for (const g of groups) for (const id of g.tagIds) set.add(id);
    return set;
  }, [groups]);

  const uncategorisedTags = useMemo(
    () => tags.filter((t) => !taggedIds.has(t.id)),
    [tags, taggedIds],
  );
  const starredTags = useMemo(() => tags.filter((t) => t.starred), [tags]);

  const groupById = useMemo(() => {
    const map = new Map<string, (typeof groups)[number]>();
    for (const g of groups) map.set(g.id, g);
    return map;
  }, [groups]);

  useEffect(() => {
    if (!selectedRail.startsWith("g:")) return;
    const id = selectedRail.slice(2);
    if (!groupById.has(id)) setSelectedRail("all");
  }, [groupById, selectedRail]);

  const toItem = useCallback(
    (t: TagRow): DisplayItem => ({
      id: t.id,
      name: t.name,
      starred: t.starred,
      count: counts.get(t.name.toLowerCase()) ?? 0,
      lastUsedAt: t.lastUsedAt,
    }),
    [counts],
  );

  const sortItems = useCallback(
    (items: DisplayItem[]): DisplayItem[] => {
      const sort = prefs.sort ?? "name";
      const copy = items.slice();
      if (sort === "count") {
        copy.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
      } else if (sort === "recent") {
        copy.sort(
          (a, b) =>
            (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0) ||
            a.name.localeCompare(b.name),
        );
      } else {
        copy.sort((a, b) => a.name.localeCompare(b.name));
      }
      return copy;
    },
    [prefs.sort],
  );

  const baseItems = useMemo<ReadonlyArray<TagRow>>(() => {
    if (selectedRail === "all") return tags;
    if (selectedRail === "uncategorized") return uncategorisedTags;
    if (selectedRail === "starred") return starredTags;
    const id = selectedRail.slice(2);
    const g = groupById.get(id);
    if (!g) return [];
    const byId = new Map(tags.map((t) => [t.id, t]));
    return g.tagIds
      .map((tid) => byId.get(tid))
      .filter((t): t is TagRow => Boolean(t));
  }, [selectedRail, tags, uncategorisedTags, starredTags, groupById]);

  const needle = q.trim().toLowerCase();
  const visibleItems = useMemo(() => {
    const mapped = baseItems
      .map(toItem)
      .filter((i) => (needle ? i.name.toLowerCase().includes(needle) : true));
    return sortItems(mapped);
  }, [baseItems, toItem, needle, sortItems]);

  const sections = useMemo<AlphaSection[]>(() => {
    const buckets = new Map<string, DisplayItem[]>();
    for (const item of visibleItems) {
      const first = item.name.trim().charAt(0).toUpperCase();
      const key = /[A-Z]/.test(first) ? first : "#";
      const list = buckets.get(key) ?? [];
      list.push(item);
      buckets.set(key, list);
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => {
        if (a === b) return 0;
        if (a === "#") return 1;
        if (b === "#") return -1;
        return a.localeCompare(b);
      })
      .map(([letter, items]) => ({ letter, items }));
  }, [visibleItems]);

  const selectedGroup = useMemo(() => {
    if (!selectedRail.startsWith("g:")) return null;
    return groupById.get(selectedRail.slice(2)) ?? null;
  }, [selectedRail, groupById]);
  const selectedGroupName = selectedGroup?.name ?? null;

  const paneTitle = useMemo(() => {
    if (selectedRail === "all") return "All Tags";
    if (selectedRail === "uncategorized") return "Uncategorized";
    if (selectedRail === "starred") return "Starred";
    return selectedGroupName ?? "Tags";
  }, [selectedRail, selectedGroupName]);

  function openTag(name: string) {
    setQuery({
      combinator: "and",
      rules: [{ field: "tags", operator: "some", value: [name] }],
    });
    navigate("/");
  }

  const layout = prefs.layout ?? "grid";
  const gridSize = prefs.gridSize ?? "md";

  return (
    <React.Fragment>
      <Shell.Aside>
        <Sidebar />
      </Shell.Aside>
      <Shell.Main>
        <div className={styles.page}>
          <div className={styles.rail}>
            <AllTags.Rail
              tags={tags}
              groups={groups}
              counts={counts}
              uncategorisedCount={uncategorisedTags.length}
              starredCount={starredTags.length}
              selected={selectedRail}
              onSelect={setSelectedRail}
            />
          </div>
          <section className={styles.pane}>
            <div className={styles["pane-toolbar"]}>
              <h1 className={styles["pane-title"]}>
                {paneTitle}{" "}
                <span className={styles["pane-count"]}>
                  ({visibleItems.length})
                </span>
              </h1>
              {selectedGroup ? (
                <TagPicker.Root
                  target={{ kind: "group", group: selectedGroup }}
                >
                  <TagPicker.Trigger
                    render={
                      <button
                        type="button"
                        className={styles["pane-add"]}
                        aria-label={`Add tag to ${selectedGroup.name}`}
                        title={`Add tag to ${selectedGroup.name}`}
                      >
                        <Plus width={14} height={14} />
                      </button>
                    }
                  />
                  <TagPicker.Content
                    side="bottom"
                    align="start"
                    sideOffset={6}
                  />
                </TagPicker.Root>
              ) : null}
              <div className={styles.spacer} />
              <div className={styles["pane-search"]}>
                <Input.Field
                  data-size="sm"
                  type="search"
                  placeholder="Search…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  spellCheck={false}
                />
              </div>
              <button
                type="button"
                className={styles.tool}
                data-active={layout === "list" || undefined}
                title="List layout"
                onClick={() => patchPrefs({ layout: "list" })}
              >
                <ListChecks width={16} height={16} />
              </button>
              <button
                type="button"
                className={styles.tool}
                data-active={layout === "grid" || undefined}
                title="Grid layout"
                onClick={() => patchPrefs({ layout: "grid" })}
              >
                <LayoutGrid width={16} height={16} />
              </button>
              <DisplayMenu prefs={prefs} patch={patchPrefs} />
            </div>

            <div
              className={styles["pane-body"]}
              data-layout={layout}
              data-grid-size={gridSize}
            >
              {visibleItems.length === 0 ? (
                <AllTags.EmptyState
                  hasAnyTags={tags.length > 0}
                  needle={needle}
                  query={q}
                />
              ) : (
                <div className={styles.sections}>
                  {sections.map((section) => (
                    <section
                      key={section.letter}
                      className={styles.section}
                      aria-label={`Tags starting with ${section.letter}`}
                    >
                      <h2 className={styles["section-header"]}>
                        {section.letter}{" "}
                        <span className={styles["section-count"]}>
                          ({section.items.length})
                        </span>
                      </h2>
                      <div
                        className={
                          layout === "grid" ? styles.grid : styles.list
                        }
                      >
                        {section.items.map((item) => (
                          <AllTags.TagItem
                            key={item.id}
                            item={item}
                            showCounts={prefs.showCounts ?? true}
                            groups={groups.map((g) => g.name)}
                            inGroup={selectedGroupName}
                            onPick={openTag}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </Shell.Main>
    </React.Fragment>
  );
}
