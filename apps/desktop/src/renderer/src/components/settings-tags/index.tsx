import { IconChevronRightOutline18 as ChevronRight } from "@pond/icons/outline/18";
import { normalizeLabelName } from "@pond/schema/label-name";
import { Button, Input } from "@pond/ui";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PromptDialog } from "@/components/prompt-dialog";
import { useSaves } from "@/hooks/use-saves";
import { adaptNavigate } from "@/lib/navigate-path";
import { type TagGroupRow, useTagGroups } from "@/stores/tag-groups";
import { type TagRow, useTags } from "@/stores/tags";
import { setQuery } from "@/stores/view-store";
import { GroupRow } from "./group-row";
import { cmpName, type SortDir } from "./helpers";
import styles from "./styles.module.css";
import { TagTableRow } from "./tag-table-row";

export function TagsSection() {
  const tags = useTags();
  const groups = useTagGroups();
  const saves = useSaves();
  const tsNavigate = useNavigate();
  const navigate = useMemo(() => adaptNavigate(tsNavigate), [tsNavigate]);

  const [q, setQ] = useState("");
  const [dir, setDir] = useState<SortDir>("asc");
  // Per-group expand overrides; absent groups fall back to persisted state.
  const [toggles, setToggles] = useState<Map<string, boolean>>(new Map());
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [creatingTag, setCreatingTag] = useState(false);
  const [draft, setDraft] = useState("");

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

  const countFor = (name: string) => counts.get(name.toLowerCase()) ?? 0;

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

  const groupNames = useMemo(() => groups.map((g) => g.name), [groups]);
  const needle = q.trim().toLowerCase();

  const childrenOf = (g: TagGroupRow): TagRow[] =>
    g.tagIds
      .map((id) => tagsById.get(id))
      .filter((t): t is TagRow => Boolean(t))
      .filter((t) => (needle ? t.name.toLowerCase().includes(needle) : true))
      .sort((a, b) => cmpName(a.name, b.name, dir));

  type Row =
    | { kind: "tag"; tag: TagRow }
    | { kind: "group"; group: TagGroupRow };

  const rows = useMemo<Row[]>(() => {
    const uncategorized = tags.filter((t) => !taggedIds.has(t.id));
    const list: Row[] = [
      ...groups.map((group) => ({ kind: "group" as const, group })),
      ...uncategorized.map((tag) => ({ kind: "tag" as const, tag })),
    ];
    list.sort((a, b) =>
      cmpName(
        a.kind === "group" ? a.group.name : a.tag.name,
        b.kind === "group" ? b.group.name : b.tag.name,
        dir,
      ),
    );
    if (!needle) return list;
    return list.filter((row) => {
      if (row.kind === "tag")
        return row.tag.name.toLowerCase().includes(needle);
      const g = row.group;
      if (g.name.toLowerCase().includes(needle)) return true;
      return g.tagNames.some((n) => n.toLowerCase().includes(needle));
    });
  }, [tags, groups, taggedIds, dir, needle]);

  function openTag(name: string) {
    setQuery({
      combinator: "and",
      rules: [{ field: "tags", operator: "some", value: [name] }],
    });
    navigate("/");
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

  async function commitCreate(kind: "group" | "tag") {
    const cleaned = normalizeLabelName(draft);
    setDraft("");
    setCreatingGroup(false);
    setCreatingTag(false);
    if (!cleaned) return;
    await window.pond.query(
      kind === "group" ? "tagGroups.create" : "tags.create",
      { name: cleaned },
    );
  }

  const total = tags.length;

  return (
    <>
      <div className={styles.page}>
        <header className={styles.head}>
          <h1 className={styles.title}>Tags</h1>
        </header>

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
          <div className={styles.spacer} />
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setDraft("");
              setCreatingGroup(true);
            }}
          >
            New group
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setDraft("");
              setCreatingTag(true);
            }}
          >
            New label
          </Button>
        </div>

        <div className={styles.table}>
          <div className={styles.header}>
            <button
              type="button"
              className={styles["col-name"]}
              data-sortable
              onClick={() => setDir((d) => (d === "asc" ? "desc" : "asc"))}
            >
              Name
              <ChevronRight
                className={styles["sort-caret"]}
                data-dir={dir}
                width={12}
                height={12}
              />
            </button>
            <span className={styles["col-issues"]}>Issues</span>
            <span className={styles["col-applied"]}>Last applied</span>
            <span className={styles["col-created"]}>Created</span>
          </div>

          <div className={styles.body}>
            {rows.length === 0 ? (
              <div className={styles.empty}>
                {total === 0
                  ? "No tags yet. Create a label to get started."
                  : `No tags match "${q}".`}
              </div>
            ) : (
              rows.map((row) =>
                row.kind === "group" ? (
                  <GroupRow
                    key={row.group.id}
                    group={row.group}
                    expanded={needle ? true : isExpanded(row.group)}
                    items={childrenOf(row.group)}
                    countFor={countFor}
                    groupNames={groupNames}
                    onToggle={() => toggleGroup(row.group)}
                    onOpen={openTag}
                  />
                ) : (
                  <TagTableRow
                    key={row.tag.id}
                    tag={row.tag}
                    depth={0}
                    count={countFor(row.tag.name)}
                    groupNames={groupNames}
                    inGroup={null}
                    onOpen={openTag}
                  />
                ),
              )
            )}
          </div>
        </div>
      </div>

      <PromptDialog
        open={creatingGroup}
        onOpenChange={setCreatingGroup}
        title="New group"
        description="Group related labels together."
        value={draft}
        onValueChange={setDraft}
        onConfirm={() => void commitCreate("group")}
        confirmLabel="Create"
        placeholder="Group name"
      />
      <PromptDialog
        open={creatingTag}
        onOpenChange={setCreatingTag}
        title="New label"
        description="Create a label you can apply to your saves."
        value={draft}
        onValueChange={setDraft}
        onConfirm={() => void commitCreate("tag")}
        confirmLabel="Create"
        placeholder="Label name"
      />
    </>
  );
}
