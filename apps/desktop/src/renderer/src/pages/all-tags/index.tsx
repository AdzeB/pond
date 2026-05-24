import { IconStarFill18 } from "@pond/icons/fill/18";
import {
  IconBookmarkOutline18,
  IconChevronRightOutline18,
  IconCircleQuestionOutline18,
  IconDotsOutline18,
  IconGridOutline18,
  IconListCheckboxOutline18,
  IconPlusOutline18,
  IconStarOutline18,
  IconTrash2Outline18,
} from "@pond/icons/outline/18";
import { normalizeLabelName } from "@pond/schema/label-name";
import { AlertDialog, Button, ContextMenu, Input, Menu } from "@pond/ui";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { Shell } from "@/components/shell";
import { useSaves } from "@/pool/hooks";
import { usePrefs } from "@/pool/prefs";
import { useTagGroups } from "@/pool/tag-groups";
import { type TagRow, useTags } from "@/pool/tags";
import { GroupTagAdder } from "./group-tag-adder";
import styles from "./styles.module.css";

const GROUP_COLORS = [
  "var(--ds-red-9)",
  "var(--ds-orange-9)",
  "var(--ds-amber-9)",
  "var(--ds-green-9)",
  "var(--ds-teal-9)",
  "var(--ds-blue-9)",
  "var(--ds-violet-9)",
  "var(--ds-pink-9)",
] as const;

type RailKey = "all" | "uncategorized" | "starred" | `g:${string}`;

interface DisplayItem {
  id: string;
  name: string;
  starred: boolean;
  count: number;
  lastUsedAt: number | null;
}

export function AllTagsPage() {
  const tags = useTags();
  const groups = useTagGroups();
  const saves = useSaves();
  const navigate = useNavigate();
  const [prefs, patchPrefs] = usePrefs("allTags");
  const [selectedRail, setSelectedRail] = useState<RailKey>("all");
  const [q, setQ] = useState("");

  // Counts per tag name (lowercased)
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

  // If the selected group is deleted, fall back to "all".
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

  const baseItems = useMemo<TagRow[]>(() => {
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
    navigate(`/?tag=${encodeURIComponent(name)}`, { viewTransition: true });
  }

  const layout = prefs.layout ?? "grid";
  const gridSize = prefs.gridSize ?? "md";

  return (
    <Shell.Main>
      <div className={styles.page}>
        <div className={styles.layout}>
          <Rail
            tags={tags}
            groups={groups}
            counts={counts}
            uncategorisedCount={uncategorisedTags.length}
            starredCount={starredTags.length}
            selected={selectedRail}
            onSelect={setSelectedRail}
          />
          <section className={styles.pane}>
            <div className={styles["pane-toolbar"]}>
              <h1 className={styles["pane-title"]}>
                {paneTitle}{" "}
                <span className={styles["pane-count"]}>
                  ({visibleItems.length})
                </span>
              </h1>
              {selectedGroup ? (
                <GroupTagAdder
                  group={selectedGroup}
                  trigger={
                    <button
                      type="button"
                      className={styles["pane-add"]}
                      aria-label={`Add tag to ${selectedGroup.name}`}
                      title={`Add tag to ${selectedGroup.name}`}
                    >
                      <IconPlusOutline18 width={14} height={14} />
                    </button>
                  }
                />
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
                <IconListCheckboxOutline18 width={16} height={16} />
              </button>
              <button
                type="button"
                className={styles.tool}
                data-active={layout === "grid" || undefined}
                title="Grid layout"
                onClick={() => patchPrefs({ layout: "grid" })}
              >
                <IconGridOutline18 width={16} height={16} />
              </button>
              <DisplayMenu prefs={prefs} patch={patchPrefs} />
            </div>

            <div
              className={styles["pane-body"]}
              data-layout={layout}
              data-grid-size={gridSize}
            >
              {visibleItems.length === 0 ? (
                <EmptyState
                  hasAnyTags={tags.length > 0}
                  needle={needle}
                  query={q}
                />
              ) : (
                <div className={layout === "grid" ? styles.grid : styles.list}>
                  {visibleItems.map((item) => (
                    <TagItem
                      key={item.id}
                      item={item}
                      showCounts={prefs.showCounts ?? true}
                      groups={groups.map((g) => g.name)}
                      inGroup={selectedGroupName}
                      onPick={openTag}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </Shell.Main>
  );
}

// =================================================================
// Rail
// =================================================================

interface RailProps {
  tags: TagRow[];
  groups: ReturnType<typeof useTagGroups>;
  counts: Map<string, number>;
  uncategorisedCount: number;
  starredCount: number;
  selected: RailKey;
  onSelect: (next: RailKey) => void;
}

function Rail({
  tags,
  groups,
  counts,
  uncategorisedCount,
  starredCount,
  selected,
  onSelect,
}: RailProps) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [confirmDeleteName, setConfirmDeleteName] = useState<string | null>(
    null,
  );
  const createRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (creating) createRef.current?.focus();
  }, [creating]);

  function tagCountFor(name: string) {
    return counts.get(name.toLowerCase()) ?? 0;
  }

  function groupTotal(group: (typeof groups)[number]) {
    let total = 0;
    for (const name of group.tagNames) total += tagCountFor(name);
    return total;
  }

  async function commitCreate() {
    const cleaned = draft.trim();
    if (!cleaned) {
      setCreating(false);
      setDraft("");
      return;
    }
    await window.pond.query("tagGroups.create", { name: cleaned });
    setDraft("");
    setCreating(false);
  }

  async function commitRename(group: (typeof groups)[number]) {
    const cleaned = renameDraft.trim();
    setRenamingId(null);
    if (!cleaned || cleaned === group.name) return;
    await window.pond.query("tagGroups.rename", {
      from: group.name,
      to: cleaned,
    });
  }

  async function commitDelete(name: string) {
    await window.pond.query("tagGroups.delete", { name });
    setConfirmDeleteName(null);
  }

  async function setColor(
    group: (typeof groups)[number],
    color: string | null,
  ) {
    await window.pond.query("tagGroups.update", {
      name: group.name,
      patch: { color },
    });
  }

  return (
    <aside className={styles.rail} aria-label="Tag groups">
      <RailRow
        active={selected === "all"}
        onSelect={() => onSelect("all")}
        icon={<IconBookmarkOutline18 width={14} height={14} />}
        label="All"
        count={tags.length}
      />
      <RailRow
        active={selected === "uncategorized"}
        onSelect={() => onSelect("uncategorized")}
        icon={<IconCircleQuestionOutline18 width={14} height={14} />}
        label="Uncategorized"
        count={uncategorisedCount}
      />
      <RailRow
        active={selected === "starred"}
        onSelect={() => onSelect("starred")}
        icon={<IconStarOutline18 width={14} height={14} />}
        label="Starred"
        count={starredCount}
      />

      <div className={styles["rail-section-header"]}>
        <span className={styles["rail-section-label"]}>
          Groups
          <span className={styles["rail-section-count"]}>
            ({groups.length})
          </span>
        </span>
        <button
          type="button"
          className={styles["rail-section-action"]}
          aria-label="New tag group"
          title="New tag group"
          onClick={() => setCreating(true)}
        >
          <IconPlusOutline18 width={12} height={12} />
        </button>
      </div>

      {creating ? (
        <div className={styles["rail-create"]}>
          <Input.Field
            ref={createRef}
            data-size="sm"
            placeholder="New group name"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void commitCreate();
              if (e.key === "Escape") {
                setCreating(false);
                setDraft("");
              }
            }}
            onBlur={() => void commitCreate()}
          />
        </div>
      ) : null}

      {groups.map((g) => {
        const railKey: RailKey = `g:${g.id}`;
        const isRenaming = renamingId === g.id;
        return (
          <ContextMenu.Root key={g.id}>
            <ContextMenu.Trigger
              render={
                isRenaming ? (
                  <div
                    className={styles["rail-row"]}
                    data-active={selected === railKey || undefined}
                  >
                    <span
                      className={styles["rail-icon"]}
                      style={g.color ? { color: g.color } : undefined}
                      aria-hidden
                    >
                      <IconBookmarkOutline18 width={14} height={14} />
                    </span>
                    <Input.Field
                      data-size="sm"
                      value={renameDraft}
                      autoFocus
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Enter") void commitRename(g);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      onBlur={() => void commitRename(g)}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    className={styles["rail-row"]}
                    data-active={selected === railKey || undefined}
                    onClick={() => onSelect(railKey)}
                  >
                    <span
                      className={styles["rail-icon"]}
                      style={g.color ? { color: g.color } : undefined}
                      aria-hidden
                    >
                      <IconBookmarkOutline18 width={14} height={14} />
                    </span>
                    <span className={styles["rail-label"]}>{g.name}</span>
                    <span className={styles["rail-count"]}>
                      {groupTotal(g)}
                    </span>
                  </button>
                )
              }
            />
            <ContextMenu.Portal>
              <ContextMenu.Backdrop />
              <ContextMenu.Positioner>
                <ContextMenu.Popup>
                  <ContextMenu.Item
                    onClick={() => {
                      setRenameDraft(g.name);
                      setRenamingId(g.id);
                    }}
                  >
                    <ContextMenu.ItemLabel>Rename</ContextMenu.ItemLabel>
                  </ContextMenu.Item>
                  <Menu.SubmenuRoot>
                    <Menu.SubmenuTrigger>
                      <Menu.ItemLabel>Color</Menu.ItemLabel>
                      <Menu.ItemKbd>
                        <IconChevronRightOutline18
                          width="0.85em"
                          height="0.85em"
                        />
                      </Menu.ItemKbd>
                    </Menu.SubmenuTrigger>
                    <Menu.Portal>
                      <Menu.Positioner
                        align="start"
                        side="right"
                        sideOffset={6}
                      >
                        <Menu.Popup className={styles["color-popup"]}>
                          <div className={styles["color-grid"]}>
                            {GROUP_COLORS.map((c) => (
                              <button
                                key={c}
                                type="button"
                                className={styles["color-swatch"]}
                                style={{ background: c }}
                                aria-label={`Use ${c}`}
                                onClick={() => void setColor(g, c)}
                              />
                            ))}
                          </div>
                          <Menu.Separator />
                          <Menu.Item onClick={() => void setColor(g, null)}>
                            <Menu.ItemLabel>Clear color</Menu.ItemLabel>
                          </Menu.Item>
                        </Menu.Popup>
                      </Menu.Positioner>
                    </Menu.Portal>
                  </Menu.SubmenuRoot>
                  <ContextMenu.Separator />
                  <ContextMenu.Item
                    onClick={() => setConfirmDeleteName(g.name)}
                  >
                    <ContextMenu.ItemIcon>
                      <IconTrash2Outline18 />
                    </ContextMenu.ItemIcon>
                    <ContextMenu.ItemLabel>Remove</ContextMenu.ItemLabel>
                  </ContextMenu.Item>
                </ContextMenu.Popup>
              </ContextMenu.Positioner>
            </ContextMenu.Portal>
          </ContextMenu.Root>
        );
      })}

      <AlertDialog.Root
        open={confirmDeleteName !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteName(null);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop />
          <AlertDialog.Popup>
            <AlertDialog.Title>Remove tag group?</AlertDialog.Title>
            <AlertDialog.Description>
              "{confirmDeleteName}" will be removed. The tags inside it stay in
              your library; they just won't belong to this group anymore.
            </AlertDialog.Description>
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                marginTop: 8,
              }}
            >
              <AlertDialog.Close
                render={<Button variant="ghost">Cancel</Button>}
              />
              <AlertDialog.Close
                render={
                  <Button
                    variant="danger"
                    onClick={(e) => {
                      e.preventDefault();
                      if (confirmDeleteName)
                        void commitDelete(confirmDeleteName);
                    }}
                  >
                    Remove
                  </Button>
                }
              />
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </aside>
  );
}

interface RailRowProps {
  active: boolean;
  onSelect: () => void;
  icon: ReactNode;
  label: string;
  count: number;
}

function RailRow({ active, onSelect, icon, label, count }: RailRowProps) {
  return (
    <button
      type="button"
      className={styles["rail-row"]}
      data-active={active || undefined}
      onClick={onSelect}
    >
      <span className={styles["rail-icon"]} aria-hidden>
        {icon}
      </span>
      <span className={styles["rail-label"]}>{label}</span>
      <span className={styles["rail-count"]}>{count}</span>
    </button>
  );
}

// =================================================================
// Tag item (right pane)
// =================================================================

interface TagItemProps {
  item: DisplayItem;
  showCounts: boolean;
  groups: string[];
  /** Group name when the user is currently viewing a specific group. */
  inGroup: string | null;
  onPick: (name: string) => void;
}

function TagItem({ item, showCounts, groups, inGroup, onPick }: TagItemProps) {
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(item.name);
  const [merging, setMerging] = useState(false);
  const [mergeTarget, setMergeTarget] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function toggleStar() {
    await window.pond.query("tags.setStarred", {
      name: item.name,
      starred: !item.starred,
    });
  }

  async function commitRename() {
    const cleaned = normalizeLabelName(renameDraft);
    if (!cleaned || cleaned.toLowerCase() === item.name.toLowerCase()) {
      setRenaming(false);
      return;
    }
    await window.pond.query("tags.rename", { from: item.name, to: cleaned });
    setRenaming(false);
  }

  async function addToGroup(groupName: string) {
    await window.pond.query("tagGroups.addTags", {
      tags: [item.name],
      group: groupName,
    });
  }

  async function removeFromGroup(groupName: string) {
    await window.pond.query("tagGroups.removeTag", {
      tag: item.name,
      group: groupName,
    });
  }

  async function commitMerge() {
    const cleaned = normalizeLabelName(mergeTarget);
    if (!cleaned || cleaned.toLowerCase() === item.name.toLowerCase()) return;
    await window.pond.query("tags.merge", { from: item.name, to: cleaned });
    setMerging(false);
    setMergeTarget("");
  }

  async function commitDelete() {
    await window.pond.query("tags.delete", { name: item.name });
    setConfirmDelete(false);
  }

  return (
    <>
      <ContextMenu.Root>
        <ContextMenu.Trigger
          render={
            <button
              type="button"
              className={styles.item}
              onClick={() => onPick(item.name)}
              title={item.name}
            >
              <span className={styles["item-name"]}>{item.name}</span>
              {showCounts && item.count > 0 ? (
                <span className={styles["item-count"]}>{item.count}</span>
              ) : null}
              <button
                type="button"
                className={styles["item-star"]}
                data-active={item.starred || undefined}
                aria-label={item.starred ? "Unstar tag" : "Star tag"}
                onClick={(e) => {
                  e.stopPropagation();
                  void toggleStar();
                }}
              >
                {item.starred ? (
                  <IconStarFill18 width={12} height={12} />
                ) : (
                  <IconStarOutline18 width={12} height={12} />
                )}
              </button>
            </button>
          }
        />
        <ContextMenu.Portal>
          <ContextMenu.Backdrop />
          <ContextMenu.Positioner>
            <ContextMenu.Popup>
              <ContextMenu.Item onClick={() => void toggleStar()}>
                <ContextMenu.ItemIcon>
                  {item.starred ? (
                    <IconStarFill18 width="1em" height="1em" />
                  ) : (
                    <IconStarOutline18 width="1em" height="1em" />
                  )}
                </ContextMenu.ItemIcon>
                <ContextMenu.ItemLabel>
                  {item.starred ? "Remove from Starred" : "Add to Starred"}
                </ContextMenu.ItemLabel>
              </ContextMenu.Item>
              {groups.length > 0 ? (
                <Menu.SubmenuRoot>
                  <Menu.SubmenuTrigger>
                    <Menu.ItemLabel>Add to Group</Menu.ItemLabel>
                    <Menu.ItemKbd>
                      <IconChevronRightOutline18
                        width="0.85em"
                        height="0.85em"
                      />
                    </Menu.ItemKbd>
                  </Menu.SubmenuTrigger>
                  <Menu.Portal>
                    <Menu.Positioner align="start" side="right" sideOffset={6}>
                      <Menu.Popup>
                        {groups.map((g) => (
                          <Menu.Item key={g} onClick={() => void addToGroup(g)}>
                            <Menu.ItemLabel>{g}</Menu.ItemLabel>
                          </Menu.Item>
                        ))}
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.SubmenuRoot>
              ) : null}
              {inGroup ? (
                <ContextMenu.Item onClick={() => void removeFromGroup(inGroup)}>
                  <ContextMenu.ItemLabel>
                    Remove from this Group
                  </ContextMenu.ItemLabel>
                </ContextMenu.Item>
              ) : null}
              <ContextMenu.Item
                onClick={() => {
                  setRenameDraft(item.name);
                  setRenaming(true);
                }}
              >
                <ContextMenu.ItemLabel>Rename…</ContextMenu.ItemLabel>
              </ContextMenu.Item>
              <ContextMenu.Item
                onClick={() => {
                  setMergeTarget("");
                  setMerging(true);
                }}
              >
                <ContextMenu.ItemLabel>Merge into…</ContextMenu.ItemLabel>
              </ContextMenu.Item>
              <ContextMenu.Separator />
              <ContextMenu.Item onClick={() => setConfirmDelete(true)}>
                <ContextMenu.ItemIcon>
                  <IconTrash2Outline18 />
                </ContextMenu.ItemIcon>
                <ContextMenu.ItemLabel>Delete</ContextMenu.ItemLabel>
              </ContextMenu.Item>
            </ContextMenu.Popup>
          </ContextMenu.Positioner>
        </ContextMenu.Portal>
      </ContextMenu.Root>

      <AlertDialog.Root open={renaming} onOpenChange={setRenaming}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop />
          <AlertDialog.Popup>
            <AlertDialog.Title>Rename tag</AlertDialog.Title>
            <AlertDialog.Description>
              Rename "{item.name}". Every save using it will be updated.
            </AlertDialog.Description>
            <Input.Field
              data-size="sm"
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void commitRename();
              }}
              autoFocus
            />
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                marginTop: 8,
              }}
            >
              <AlertDialog.Close
                render={<Button variant="ghost">Cancel</Button>}
              />
              <AlertDialog.Close
                render={
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      void commitRename();
                    }}
                  >
                    Rename
                  </Button>
                }
              />
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      <AlertDialog.Root open={merging} onOpenChange={setMerging}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop />
          <AlertDialog.Popup>
            <AlertDialog.Title>Merge "{item.name}" into…</AlertDialog.Title>
            <AlertDialog.Description>
              Every save tagged "{item.name}" will be re-tagged with the target,
              and "{item.name}" will be removed.
            </AlertDialog.Description>
            <Input.Field
              data-size="sm"
              value={mergeTarget}
              onChange={(e) => setMergeTarget(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void commitMerge();
              }}
              placeholder="Target tag name"
              autoFocus
            />
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                marginTop: 8,
              }}
            >
              <AlertDialog.Close
                render={<Button variant="ghost">Cancel</Button>}
              />
              <AlertDialog.Close
                render={
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      void commitMerge();
                    }}
                  >
                    Merge
                  </Button>
                }
              />
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      <AlertDialog.Root open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop />
          <AlertDialog.Popup>
            <AlertDialog.Title>Delete tag?</AlertDialog.Title>
            <AlertDialog.Description>
              "{item.name}" will be removed from every save. This cannot be
              undone.
            </AlertDialog.Description>
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                marginTop: 8,
              }}
            >
              <AlertDialog.Close
                render={<Button variant="ghost">Cancel</Button>}
              />
              <AlertDialog.Close
                render={
                  <Button
                    variant="danger"
                    onClick={(e) => {
                      e.preventDefault();
                      void commitDelete();
                    }}
                  >
                    Delete
                  </Button>
                }
              />
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}

// =================================================================
// Empty state
// =================================================================

function EmptyState({
  hasAnyTags,
  needle,
  query,
}: {
  hasAnyTags: boolean;
  needle: string;
  query: string;
}) {
  if (needle) {
    return (
      <div className={styles.empty}>
        <div className={styles["empty-title"]}>No matches</div>
        <div className={styles["empty-subtitle"]}>No tags match "{query}".</div>
      </div>
    );
  }
  return (
    <div className={styles.empty}>
      <div className={styles["empty-art"]} aria-hidden>
        <IconBookmarkOutline18 width={56} height={56} />
        <span className={styles["empty-art-overlay"]}>
          <IconCircleQuestionOutline18 width={18} height={18} />
        </span>
      </div>
      <div className={styles["empty-title"]}>No Tags Yet</div>
      <div className={styles["empty-subtitle"]}>
        {hasAnyTags
          ? "This section is empty. Drag tags here or pick one from the rail."
          : "Add tags to your saves for a proper organization. Tags also help when searching."}
      </div>
    </div>
  );
}

// =================================================================
// Display menu
// =================================================================

function DisplayMenu({
  prefs,
  patch,
}: {
  prefs: {
    showCounts?: boolean;
    sort?: "name" | "count" | "recent";
    gridSize?: "sm" | "md" | "lg";
  };
  patch: (next: Record<string, unknown>) => void;
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        render={
          <button
            type="button"
            className={styles.tool}
            aria-label="Display options"
            title="Display options"
          >
            <IconDotsOutline18 width={16} height={16} />
          </button>
        }
      />
      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={6}>
          <Menu.Popup>
            <Menu.CheckboxItem
              closeOnClick={false}
              checked={prefs.showCounts ?? true}
              onCheckedChange={(v) => patch({ showCounts: v })}
            >
              <Menu.ItemLabel>Show Counts</Menu.ItemLabel>
            </Menu.CheckboxItem>
            <Menu.Separator />
            <Menu.RadioGroup
              value={prefs.sort ?? "name"}
              onValueChange={(v) => patch({ sort: v })}
            >
              <Menu.RadioItem value="name">
                <Menu.ItemLabel>Sort by Name</Menu.ItemLabel>
              </Menu.RadioItem>
              <Menu.RadioItem value="count">
                <Menu.ItemLabel>Sort by Count</Menu.ItemLabel>
              </Menu.RadioItem>
              <Menu.RadioItem value="recent">
                <Menu.ItemLabel>Sort by Recently Used</Menu.ItemLabel>
              </Menu.RadioItem>
            </Menu.RadioGroup>
            <Menu.Separator />
            <Menu.RadioGroup
              value={prefs.gridSize ?? "md"}
              onValueChange={(v) => patch({ gridSize: v })}
            >
              <Menu.RadioItem value="sm">
                <Menu.ItemLabel>Small Tiles</Menu.ItemLabel>
              </Menu.RadioItem>
              <Menu.RadioItem value="md">
                <Menu.ItemLabel>Medium Tiles</Menu.ItemLabel>
              </Menu.RadioItem>
              <Menu.RadioItem value="lg">
                <Menu.ItemLabel>Large Tiles</Menu.ItemLabel>
              </Menu.RadioItem>
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
