import { IconChevronRightOutline18 as ChevronRight } from "@pond/icons/outline/18";
import { normalizeLabelName } from "@pond/schema/label-name";
import { Button, Input } from "@pond/ui";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/primitives/dialogs/confirm";
import { PromptDialog } from "@/components/primitives/dialogs/prompt";
import { TagContextMenu } from "@/components/primitives/menus/tag-context";
import { TagGroupContextMenu } from "@/components/primitives/menus/tag-group-context";
import { setQuery } from "@/lib/stores/view-store";
import { adaptNavigate } from "@/lib/utils/navigate-path";
import { useSaves } from "@/pool/hooks";
import { type TagGroupRow, useTagGroups } from "@/pool/tag-groups";
import { type TagRow, useTags } from "@/pool/tags";
import styles from "./styles.module.css";

type SortDir = "asc" | "desc";

// Deterministic, pleasant dot color from a label name so the table reads
// like Linear's even though Pond tags don't store their own color.
function colorForName(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i += 1)
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 58% 55%)`;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

function relativeTime(ms: number | null): string {
  if (ms == null) return "—";
  const diff = Date.now() - ms;
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return plural(Math.floor(diff / MINUTE), "minute");
  if (diff < DAY) return plural(Math.floor(diff / HOUR), "hour");
  if (diff < MONTH) return plural(Math.floor(diff / DAY), "day");
  if (diff < YEAR) return plural(Math.floor(diff / MONTH), "month");
  return plural(Math.floor(diff / YEAR), "year");
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"} ago`;
}

function formatCreated(ms: number | null): string {
  if (ms == null) return "—";
  const d = new Date(ms);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return sameYear
    ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

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

function cmpName(a: string, b: string, dir: SortDir): number {
  const r = a.localeCompare(b);
  return dir === "asc" ? r : -r;
}

interface TagTableRowProps {
  tag: TagRow;
  depth: 0 | 1;
  count: number;
  groupNames: string[];
  inGroup: string | null;
  onOpen: (name: string) => void;
}

function TagTableRow({
  tag,
  depth,
  count,
  groupNames,
  inGroup,
  onOpen,
}: TagTableRowProps) {
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(tag.name);
  const [merging, setMerging] = useState(false);
  const [mergeTarget, setMergeTarget] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function commitRename() {
    const cleaned = normalizeLabelName(renameDraft);
    if (!cleaned || cleaned.toLowerCase() === tag.name.toLowerCase()) {
      setRenaming(false);
      return;
    }
    await window.pond.query("tags.rename", { from: tag.name, to: cleaned });
    setRenaming(false);
  }

  async function commitMerge() {
    const cleaned = normalizeLabelName(mergeTarget);
    if (!cleaned || cleaned.toLowerCase() === tag.name.toLowerCase()) return;
    await window.pond.query("tags.merge", { from: tag.name, to: cleaned });
    setMerging(false);
    setMergeTarget("");
  }

  return (
    <>
      <TagContextMenu
        groups={groupNames}
        inGroup={inGroup}
        onAddToGroup={(g) =>
          void window.pond.query("tagGroups.addTags", {
            tags: [tag.name],
            group: g,
          })
        }
        onRemoveFromGroup={(g) =>
          void window.pond.query("tagGroups.removeTag", {
            tag: tag.name,
            group: g,
          })
        }
        onRename={() => {
          setRenameDraft(tag.name);
          setRenaming(true);
        }}
        onMerge={() => {
          setMergeTarget("");
          setMerging(true);
        }}
        onDelete={() => setConfirmDelete(true)}
      >
        <button
          type="button"
          className={styles.row}
          data-depth={depth || undefined}
          onClick={() => onOpen(tag.name)}
          title={tag.name}
        >
          <span className={styles.name}>
            <span className={styles["chevron-slot"]} aria-hidden />
            <span
              className={styles.dot}
              style={{ background: colorForName(tag.name) }}
              aria-hidden
            />
            <span className={styles["name-text"]}>{tag.name}</span>
          </span>
          <span className={styles["col-issues"]}>{count > 0 ? count : ""}</span>
          <span className={styles["col-applied"]}>
            {relativeTime(tag.lastUsedAt)}
          </span>
          <span className={styles["col-created"]}>
            {formatCreated(tag.createdAt)}
          </span>
        </button>
      </TagContextMenu>

      <PromptDialog
        open={renaming}
        onOpenChange={setRenaming}
        title="Rename tag"
        description={`Rename "${tag.name}". Every save using it will be updated.`}
        value={renameDraft}
        onValueChange={setRenameDraft}
        onConfirm={() => void commitRename()}
        confirmLabel="Rename"
      />
      <PromptDialog
        open={merging}
        onOpenChange={setMerging}
        title={`Merge "${tag.name}" into…`}
        description={`Every save tagged "${tag.name}" will be re-tagged with the target, and "${tag.name}" will be removed.`}
        value={mergeTarget}
        onValueChange={setMergeTarget}
        onConfirm={() => void commitMerge()}
        confirmLabel="Merge"
        placeholder="Target tag name"
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete tag?"
        description={`"${tag.name}" will be removed from every save. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => {
          void window.pond.query("tags.delete", { name: tag.name });
          setConfirmDelete(false);
        }}
      />
    </>
  );
}

interface GroupRowProps {
  group: TagGroupRow;
  expanded: boolean;
  items: TagRow[];
  countFor: (name: string) => number;
  groupNames: string[];
  onToggle: () => void;
  onOpen: (name: string) => void;
}

function GroupRow({
  group,
  expanded,
  items,
  countFor,
  groupNames,
  onToggle,
  onOpen,
}: GroupRowProps) {
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(group.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function commitRename() {
    const cleaned = renameDraft.trim();
    setRenaming(false);
    if (!cleaned || cleaned === group.name) return;
    await window.pond.query("tagGroups.rename", {
      from: group.name,
      to: cleaned,
    });
  }

  return (
    <>
      <TagGroupContextMenu
        onRename={() => {
          setRenameDraft(group.name);
          setRenaming(true);
        }}
        onSetColor={(color) =>
          void window.pond.query("tagGroups.update", {
            name: group.name,
            patch: { color },
          })
        }
        onRequestDelete={() => setConfirmDelete(true)}
      >
        <button
          type="button"
          className={styles.row}
          data-group
          aria-expanded={expanded}
          onClick={onToggle}
          title={group.name}
        >
          <span className={styles.name}>
            <span className={styles["chevron-slot"]}>
              <ChevronRight
                className={styles.chevron}
                data-open={expanded || undefined}
                width={14}
                height={14}
              />
            </span>
            <span
              className={styles.dot}
              style={{ background: group.color ?? colorForName(group.name) }}
              aria-hidden
            />
            <span className={styles["name-text"]}>{group.name}</span>
          </span>
          <span className={styles["col-issues"]} />
          <span className={styles["col-applied"]} />
          <span className={styles["col-created"]} />
        </button>
      </TagGroupContextMenu>

      {expanded
        ? items.map((tag) => (
            <TagTableRow
              key={tag.id}
              tag={tag}
              depth={1}
              count={countFor(tag.name)}
              groupNames={groupNames}
              inGroup={group.name}
              onOpen={onOpen}
            />
          ))
        : null}

      <PromptDialog
        open={renaming}
        onOpenChange={setRenaming}
        title="Rename group"
        value={renameDraft}
        onValueChange={setRenameDraft}
        onConfirm={() => void commitRename()}
        confirmLabel="Rename"
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Remove tag group?"
        description={`"${group.name}" will be removed. The tags inside it stay in your library; they just won't belong to this group anymore.`}
        confirmLabel="Remove"
        onConfirm={() => {
          void window.pond.query("tagGroups.delete", { name: group.name });
          setConfirmDelete(false);
        }}
      />
    </>
  );
}
