import {
  IconBookmarkOutline18,
  IconChevronRightOutline18,
  IconCircleQuestionOutline18,
  IconPlusOutline18,
  IconStarOutline18,
  IconTrash2Outline18,
} from "@pond/icons/outline/18";
import { AlertDialog, Button, ContextMenu, Input, Menu } from "@pond/ui";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useTagGroups } from "@/pool/tag-groups";
import type { TagRow } from "@/pool/tags";
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

export type RailKey = "all" | "uncategorized" | "starred" | `g:${string}`;

interface RailProps {
  tags: TagRow[];
  groups: ReturnType<typeof useTagGroups>;
  counts: Map<string, number>;
  uncategorisedCount: number;
  starredCount: number;
  selected: RailKey;
  onSelect: (next: RailKey) => void;
}

export function Rail({
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
