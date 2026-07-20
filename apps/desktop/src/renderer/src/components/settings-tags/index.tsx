import { IconMagnifierOutline18 as Magnifier } from "@pond/icons/outline/18";
import { normalizeLabelName } from "@pond/schema/label-name";
import { Button, DataTable, Input, Settings, useDataTable } from "@pond/ui";
import {
  useCallback,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
} from "react";
import { confirm } from "@/components/confirm-dialog";
import { prompt } from "@/components/prompt-dialog";
import { useSaves } from "@/hooks/use-saves";
import { type TagGroupRow, useTagGroups } from "@/stores/tag-groups";
import { type TagRow, useTags } from "@/stores/tags";
import { tagsColumns } from "./lib/columns";
import { TagsTableContext } from "./lib/context";
import { colorForName, focusInput } from "./lib/helpers";
import { TagRow as TagRowRenderer } from "./lib/row-context";
import { EMPTY_STATS, type GroupStats, type TagsRowData } from "./lib/types";
import styles from "./styles.module.css";

type Creating = "tag" | "group" | null;

interface DraftRowProps {
  creating: "tag" | "group";
  draft: string;
  setDraft: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}

function DraftRow({
  creating,
  draft,
  setDraft,
  onCommit,
  onCancel,
}: DraftRowProps) {
  const { meta } = useDataTable<TagsRowData>();
  return (
    <div
      className={styles["draft-row"]}
      style={{ gridTemplateColumns: meta.gridTemplate }}
      data-group={creating === "group" || undefined}
    >
      {meta.selectionEnabled ? <div /> : null}
      {meta.expansionEnabled ? <div /> : null}
      <div className={styles["name-cell"]}>
        <span className={styles.name}>
          <span className={styles["dot-slot"]}>
            <span
              className={styles.dot}
              style={{ background: colorForName(draft || creating) }}
              aria-hidden
            />
          </span>
          <input
            ref={focusInput}
            className={styles["name-input"]}
            value={draft}
            spellCheck={false}
            placeholder={creating === "group" ? "Group name" : "Label name"}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={onCommit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onCommit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                onCancel();
              }
            }}
          />
        </span>
      </div>
    </div>
  );
}

export function TagsSection() {
  const tags = useTags();
  const groups = useTagGroups();
  const saves = useSaves();

  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);
  const [toggles, setToggles] = useState<Map<string, boolean>>(new Map());
  const [creating, setCreating] = useState<Creating>(null);
  const [draft, setDraft] = useState("");

  const clearRef = useRef<() => void>(() => {});

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
        kind: "tag",
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

  const ctxValue = useMemo(() => ({ groups: groupOptions }), [groupOptions]);

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

  async function bulkDelete(ids: string[]) {
    for (const name of namesFromIds(ids))
      await window.pond.query("tags.delete", { name });
    clearRef.current();
  }

  async function bulkMerge(ids: string[], raw: string) {
    const target = normalizeLabelName(raw);
    if (!target) return;
    for (const name of namesFromIds(ids)) {
      if (name.toLowerCase() === target.toLowerCase()) continue;
      await window.pond.query("tags.merge", { from: name, to: target });
    }
    clearRef.current();
  }

  function promptBulkMerge(ids: string[]) {
    const count = namesFromIds(ids).length;
    prompt({
      title: `Merge ${count} ${count === 1 ? "tag" : "tags"}`,
      description:
        "Every save using the selected tags will be re-tagged with the target, and the originals removed.",
      confirmLabel: "Merge",
      placeholder: "Target tag name",
      onConfirm: (value) => void bulkMerge(ids, value),
    });
  }

  function confirmBulkDelete(ids: string[]) {
    const count = namesFromIds(ids).length;
    confirm({
      title: `Delete ${count} ${count === 1 ? "tag" : "tags"}?`,
      description:
        "They will be removed from every save. This cannot be undone.",
      confirmLabel: "Delete",
      onConfirm: () => void bulkDelete(ids),
    });
  }

  const onSelectionChange = useCallback(() => {}, []);

  const total = tags.length;

  return (
    <DataTable.Provider
      data={data}
      columns={tagsColumns}
      getRowId={(row) => row.id}
      getSubRows={(row) => (row.kind === "group" ? row.children : undefined)}
      onSelectionChange={onSelectionChange}
      defaultSort={{ id: "name", desc: false }}
      expandedIds={expandedIds}
      onToggleExpand={onToggleExpand}
      renderRow={(args) => <TagRowRenderer {...args} />}
    >
      <Settings.Page width="wide" inset={80}>
        <Settings.Header>
          <Settings.HeaderText>
            <Settings.Title>Tags</Settings.Title>
            <Settings.Description>
              Organise your saves with tags and groups.
            </Settings.Description>
          </Settings.HeaderText>
        </Settings.Header>

        <div className={styles.content}>
          <DataTable.Toolbar className={styles.toolbar}>
            <Input.Root className={styles.search}>
              <Input.Icon>
                <Magnifier width={14} height={14} />
              </Input.Icon>
              <Input.Field
                value={q}
                onChange={(e) => setQ(e.target.value)}
                spellCheck={false}
                placeholder="Search…"
              />
            </Input.Root>
            <div className={styles.spacer} />
            <Button variant="secondary" onClick={() => startCreate("group")}>
              New Group
            </Button>
            <Button variant="primary" onClick={() => startCreate("tag")}>
              New Tag
            </Button>
          </DataTable.Toolbar>

          <TagsTableContext value={ctxValue}>
            <DataTable.Root className={styles["table-wrapper"]}>
              <DataTable.ExtraRow>
                {creating ? (
                  <DraftRow
                    creating={creating}
                    draft={draft}
                    setDraft={setDraft}
                    onCommit={() => void commitCreate()}
                    onCancel={() => {
                      setDraft("");
                      setCreating(null);
                    }}
                  />
                ) : null}
              </DataTable.ExtraRow>
              <DataTable.Empty>
                <div className={styles.empty}>
                  <span className={styles["empty-title"]}>
                    {total === 0 ? "No Tags Yet" : "No matches"}
                  </span>
                  <span className={styles["empty-text"]}>
                    {total === 0
                      ? "Labels keep your saves organised. Create one, then add it to a group to build a hierarchy."
                      : "Try a different search."}
                  </span>
                </div>
              </DataTable.Empty>
            </DataTable.Root>
          </TagsTableContext>
        </div>
      </Settings.Page>

      <DataTable.ActionBar className={styles["action-bar"]}>
        {(selection) => {
          const count = namesFromIds(selection.ids).length;
          return (
            <>
              <span className={styles["selection-count"]}>
                {count} selected
              </span>
              <DataTable.ActionBarDivider />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  clearRef.current = selection.clear;
                  promptBulkMerge(selection.ids);
                }}
              >
                Merge
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  clearRef.current = selection.clear;
                  confirmBulkDelete(selection.ids);
                }}
              >
                Delete
              </Button>
              <Button size="sm" variant="secondary" onClick={selection.clear}>
                Clear
              </Button>
            </>
          );
        }}
      </DataTable.ActionBar>
    </DataTable.Provider>
  );
}
