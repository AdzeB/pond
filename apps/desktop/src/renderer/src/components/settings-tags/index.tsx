import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { IconTagsFill18 as TagsIcon } from "@pond/icons/fill/18";
import { IconChevronRightOutline18 as ChevronRight } from "@pond/icons/outline/18";
import { normalizeLabelName } from "@pond/schema/label-name";
import { Button, Input } from "@pond/ui";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PromptDialog } from "@/components/prompt-dialog";
import { GroupRow } from "@/components/settings-tags-group-row";
import { TagTableRow } from "@/components/settings-tags-tag-table-row";
import { useSaves } from "@/hooks/use-saves";
import { adaptNavigate } from "@/lib/ui/navigate-path";
import { type TagGroupRow, useTagGroups } from "@/stores/tag-groups";
import { type TagRow, useTags } from "@/stores/tags";
import { setQuery } from "@/stores/view-store";
import { TagsTableContext, type TagsTableValue } from "./lib/context";
import {
  colorForName,
  compareFacets,
  DEFAULT_DIR,
  focusInput,
  type SortFacets,
  type SortKey,
  type SortState,
} from "./lib/helpers";
import styles from "./styles.module.css";

interface GroupStats {
  members: TagRow[];
  labelCount: number;
  totalSaves: number;
  recentMs: number | null;
}

type Creating = "tag" | "group" | null;

export function TagsSection() {
  const tags = useTags();
  const groups = useTagGroups();
  const saves = useSaves();
  const tsNavigate = useNavigate();
  const navigate = useMemo(() => adaptNavigate(tsNavigate), [tsNavigate]);

  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortState>({ key: "name", dir: "asc" });
  const [toggles, setToggles] = useState<Map<string, boolean>>(new Map());
  const [showArchived, setShowArchived] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [creating, setCreating] = useState<Creating>(null);
  const [draft, setDraft] = useState("");
  const [merging, setMerging] = useState(false);
  const [mergeTarget, setMergeTarget] = useState("");
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [dragName, setDragName] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

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

  const untaggedSaves = useMemo(
    () => saves.filter((s) => !s.deletedAt && s.tags.length === 0).length,
    [saves],
  );

  const archivedCount = useMemo(
    () => tags.filter((t) => t.archived).length,
    [tags],
  );

  // Everything below operates on the active set (archived hidden unless toggled).
  const activeTags = useMemo(
    () => (showArchived ? tags : tags.filter((t) => !t.archived)),
    [tags, showArchived],
  );

  const maxUsage = useMemo(() => {
    let m = 0;
    for (const t of activeTags) m = Math.max(m, countFor(t.name));
    return m;
  }, [activeTags, countFor]);

  const tagsById = useMemo(() => {
    const m = new Map<string, TagRow>();
    for (const t of activeTags) m.set(t.id, t);
    return m;
  }, [activeTags]);

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
      for (const t of members) {
        totalSaves += countFor(t.name);
        if (t.lastUsedAt != null)
          recentMs =
            recentMs == null ? t.lastUsedAt : Math.max(recentMs, t.lastUsedAt);
      }
      m.set(g.id, {
        members,
        labelCount: members.length,
        totalSaves,
        recentMs,
      });
    }
    return m;
  }, [groups, tagsById, countFor]);

  const groupNames = useMemo(() => groups.map((g) => g.name), [groups]);
  const needle = q.trim().toLowerCase();

  const tagFacet = useCallback(
    (t: TagRow): SortFacets => ({
      name: t.name,
      usage: countFor(t.name),
      recent: t.lastUsedAt ?? Number.NEGATIVE_INFINITY,
    }),
    [countFor],
  );

  const childrenOf = (g: TagGroupRow): TagRow[] =>
    (groupStats.get(g.id)?.members ?? [])
      .filter((t) => (needle ? t.name.toLowerCase().includes(needle) : true))
      .sort((a, b) => compareFacets(tagFacet(a), tagFacet(b), sort));

  type Row =
    | { kind: "tag"; tag: TagRow; facet: SortFacets }
    | { kind: "group"; group: TagGroupRow; facet: SortFacets };

  const rows = useMemo<Row[]>(() => {
    const uncategorized = activeTags.filter((t) => !taggedIds.has(t.id));
    const list: Row[] = [
      ...groups.map((group) => {
        const st = groupStats.get(group.id);
        return {
          kind: "group" as const,
          group,
          facet: {
            name: group.name,
            usage: st?.totalSaves ?? 0,
            recent: st?.recentMs ?? Number.NEGATIVE_INFINITY,
          },
        };
      }),
      ...uncategorized.map((tag) => ({
        kind: "tag" as const,
        tag,
        facet: tagFacet(tag),
      })),
    ];
    list.sort((a, b) => compareFacets(a.facet, b.facet, sort));
    if (!needle) return list;
    return list.filter((row) => {
      if (row.kind === "tag")
        return row.tag.name.toLowerCase().includes(needle);
      const g = row.group;
      if (g.name.toLowerCase().includes(needle)) return true;
      return g.tagNames.some((n) => n.toLowerCase().includes(needle));
    });
  }, [activeTags, groups, taggedIds, groupStats, sort, needle, tagFacet]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const openTag = useCallback(
    (name: string) => {
      setQuery({
        combinator: "and",
        rules: [{ field: "tags", operator: "some", value: [name] }],
      });
      navigate("/");
    },
    [navigate],
  );

  const ctxValue: TagsTableValue = useMemo(
    () => ({
      selected,
      selecting: selected.size > 0,
      toggleSelect,
      maxUsage,
      countFor,
      groupNames,
      onOpen: openTag,
    }),
    [selected, toggleSelect, maxUsage, countFor, groupNames, openTag],
  );

  const selectedNames = useMemo(
    () => activeTags.filter((t) => selected.has(t.id)).map((t) => t.name),
    [activeTags, selected],
  );

  const allSelectedArchived = useMemo(
    () =>
      selectedNames.length > 0 &&
      activeTags.filter((t) => selected.has(t.id)).every((t) => t.archived),
    [activeTags, selected, selectedNames.length],
  );

  function applySort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: DEFAULT_DIR[key] },
    );
  }

  const isExpanded = (g: TagGroupRow) =>
    toggles.has(g.id) ? Boolean(toggles.get(g.id)) : !g.collapsed;

  function toggleGroup(g: TagGroupRow) {
    const next = !isExpanded(g);
    setToggles((prev) => new Map(prev).set(g.id, next));
    void window.pond.query("tagGroups.update", {
      name: g.name,
      patch: { collapsed: !next },
    });
  }

  async function commitCreate() {
    const kind = creating;
    const cleaned = normalizeLabelName(draft);
    setDraft("");
    setCreating(null);
    if (!kind || !cleaned) return;
    await window.pond.query(
      kind === "group" ? "tagGroups.create" : "tags.create",
      { name: cleaned },
    );
  }

  function startCreate(kind: "tag" | "group") {
    setDraft("");
    setCreating(kind);
  }

  // ── Bulk actions ──────────────────────────────────────────────────────
  async function bulkArchive(archived: boolean) {
    for (const name of selectedNames)
      await window.pond.query("tags.update", { name, patch: { archived } });
    clearSelection();
  }
  async function bulkDelete() {
    for (const name of selectedNames)
      await window.pond.query("tags.delete", { name });
    clearSelection();
    setConfirmBulkDelete(false);
  }
  async function bulkMerge() {
    const target = normalizeLabelName(mergeTarget);
    setMerging(false);
    setMergeTarget("");
    if (!target) return;
    for (const name of selectedNames) {
      if (name.toLowerCase() === target.toLowerCase()) continue;
      await window.pond.query("tags.merge", { from: name, to: target });
    }
    clearSelection();
  }

  // ── Drag and drop ─────────────────────────────────────────────────────
  function onDragStart(e: DragStartEvent) {
    const data = e.active.data.current;
    if (data?.type === "tag") setDragName(String(data.name));
  }
  async function onDragEnd(e: DragEndEvent) {
    setDragName(null);
    const active = e.active.data.current;
    const over = e.over?.data.current;
    if (active?.type !== "tag" || over?.type !== "group") return;
    const tag = String(active.name);
    const from = active.group as string | null;
    const to = String(over.name);
    if (from === to) return;
    await window.pond.query("tagGroups.addTags", { tags: [tag], group: to });
    if (from)
      await window.pond.query("tagGroups.removeTag", { tag, group: from });
  }

  const sortCaret = (
    <ChevronRight
      className={styles["sort-caret"]}
      data-dir={sort.dir}
      width={12}
      height={12}
    />
  );

  const total = tags.length;
  const selecting = selected.size > 0;

  return (
    <>
      <div className={styles.page}>
        <header className={styles.head}>
          <h1 className={styles.title}>Tags</h1>
          <p className={styles.summary}>
            <span>
              <b>{total}</b> {total === 1 ? "label" : "labels"}
            </span>
            <span className={styles.summaryDot} aria-hidden />
            <span>
              <b>{taggedIds.size}</b> grouped
            </span>
            <span className={styles.summaryDot} aria-hidden />
            <span>
              <b>{untaggedSaves}</b> untagged{" "}
              {untaggedSaves === 1 ? "save" : "saves"}
            </span>
          </p>
        </header>

        {selecting ? (
          <div className={styles.toolbar} data-selection>
            <span className={styles["selection-count"]}>
              {selected.size} selected
            </span>
            <div className={styles.spacer} />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void bulkArchive(!allSelectedArchived)}
            >
              {allSelectedArchived ? "Unarchive" : "Archive"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setMergeTarget("");
                setMerging(true);
              }}
            >
              Merge
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmBulkDelete(true)}
            >
              Delete
            </Button>
            <Button size="sm" variant="secondary" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        ) : (
          <div className={styles.toolbar}>
            <div className={styles.search}>
              <Input.Field
                data-size="sm"
                type="search"
                placeholder="Filter by name…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                spellCheck={false}
              />
            </div>
            {archivedCount > 0 ? (
              <Button
                size="sm"
                variant="ghost"
                data-active={showArchived || undefined}
                onClick={() => setShowArchived((v) => !v)}
              >
                {showArchived ? "Hide archived" : `Archived (${archivedCount})`}
              </Button>
            ) : null}
            <div className={styles.spacer} />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => startCreate("group")}
            >
              New group
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => startCreate("tag")}
            >
              New label
            </Button>
          </div>
        )}

        <div className={styles.table}>
          <div className={styles.header}>
            <button
              type="button"
              className={styles.colhead}
              data-active={sort.key === "name" || undefined}
              onClick={() => applySort("name")}
            >
              Name
              {sort.key === "name" ? sortCaret : null}
            </button>
            <button
              type="button"
              className={styles.colhead}
              data-active={sort.key === "usage" || undefined}
              onClick={() => applySort("usage")}
            >
              Saves
              {sort.key === "usage" ? sortCaret : null}
            </button>
            <button
              type="button"
              className={styles.colhead}
              data-active={sort.key === "recent" || undefined}
              onClick={() => applySort("recent")}
            >
              Last used
              {sort.key === "recent" ? sortCaret : null}
            </button>
          </div>

          <TagsTableContext value={ctxValue}>
            <DndContext
              sensors={sensors}
              onDragStart={onDragStart}
              onDragEnd={(e) => void onDragEnd(e)}
              onDragCancel={() => setDragName(null)}
            >
              <div className={styles.body}>
                {creating ? (
                  <div
                    className={styles.draft}
                    data-group={creating === "group" || undefined}
                  >
                    <span className={styles.name}>
                      <span className={styles["chevron-slot"]} aria-hidden />
                      <span
                        className={styles.dot}
                        style={{ background: colorForName(draft || creating) }}
                        aria-hidden
                      />
                      <input
                        ref={focusInput}
                        className={styles["name-input"]}
                        value={draft}
                        spellCheck={false}
                        placeholder={
                          creating === "group" ? "Group name" : "Label name"
                        }
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={() => void commitCreate()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void commitCreate();
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            setDraft("");
                            setCreating(null);
                          }
                        }}
                      />
                    </span>
                    <span />
                    <span />
                  </div>
                ) : null}

                {rows.length === 0 && !creating ? (
                  total === 0 ? (
                    <div className={styles.empty}>
                      <span className={styles["empty-icon"]}>
                        <TagsIcon width={20} height={20} />
                      </span>
                      <span className={styles["empty-title"]}>No tags yet</span>
                      <span className={styles["empty-text"]}>
                        Labels keep your saves organised. Create one, then drag
                        it into a group to build a hierarchy.
                      </span>
                      <Button
                        className={styles["empty-action"]}
                        size="sm"
                        variant="primary"
                        onClick={() => startCreate("tag")}
                      >
                        New label
                      </Button>
                    </div>
                  ) : (
                    <div className={styles.empty}>
                      <span className={styles["empty-title"]}>No matches</span>
                      <span className={styles["empty-text"]}>
                        Nothing matches “{q}”. Try a different search.
                      </span>
                    </div>
                  )
                ) : (
                  rows.map((row) =>
                    row.kind === "group" ? (
                      <GroupRow
                        key={row.group.id}
                        group={row.group}
                        expanded={needle ? true : isExpanded(row.group)}
                        items={childrenOf(row.group)}
                        labelCount={
                          groupStats.get(row.group.id)?.labelCount ?? 0
                        }
                        totalSaves={
                          groupStats.get(row.group.id)?.totalSaves ?? 0
                        }
                        recentMs={
                          groupStats.get(row.group.id)?.recentMs ?? null
                        }
                        onToggle={() => toggleGroup(row.group)}
                      />
                    ) : (
                      <TagTableRow
                        key={row.tag.id}
                        tag={row.tag}
                        depth={0}
                        inGroup={null}
                      />
                    ),
                  )
                )}
              </div>

              <DragOverlay dropAnimation={null}>
                {dragName ? (
                  <span className={styles.overlay}>
                    <span
                      className={styles.dot}
                      style={{ background: colorForName(dragName) }}
                      aria-hidden
                    />
                    {dragName}
                  </span>
                ) : null}
              </DragOverlay>
            </DndContext>
          </TagsTableContext>
        </div>
      </div>

      <PromptDialog
        open={merging}
        onOpenChange={setMerging}
        title={`Merge ${selectedNames.length} ${
          selectedNames.length === 1 ? "tag" : "tags"
        } into…`}
        description="Every save using the selected tags will be re-tagged with the target, and the originals removed."
        value={mergeTarget}
        onValueChange={setMergeTarget}
        onConfirm={() => void bulkMerge()}
        confirmLabel="Merge"
        placeholder="Target tag name"
      />
      <ConfirmDialog
        open={confirmBulkDelete}
        onOpenChange={setConfirmBulkDelete}
        title={`Delete ${selectedNames.length} ${
          selectedNames.length === 1 ? "tag" : "tags"
        }?`}
        description="They will be removed from every save. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => void bulkDelete()}
      />
    </>
  );
}
