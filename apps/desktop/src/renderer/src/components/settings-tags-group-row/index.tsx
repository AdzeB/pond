import { useDroppable } from "@dnd-kit/core";
import {
  IconDotsFill18 as Dots,
  IconPaletteFill18 as Palette,
  IconPencilFill18 as Pencil,
} from "@pond/icons/fill/18";
import { IconChevronRightOutline18 as ChevronRight } from "@pond/icons/outline/18";
import { cn } from "@pond/ui";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, type MouseEvent, use, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { TagsTableContext } from "@/components/settings-tags/lib/context";
import {
  colorForName,
  focusInput,
  GROUP_COLORS,
  relativeTime,
} from "@/components/settings-tags/lib/helpers";
import styles from "@/components/settings-tags/styles.module.css";
import { TagTableRow } from "@/components/settings-tags-tag-table-row";
import {
  buildTagGroupMenuItems,
  type TagGroupMenuActions,
} from "@/components/tag-group-context-menu";
import { gentleSpring } from "@/lib/ui/motion";
import { showContextMenu } from "@/lib/ui/native-menu";
import type { TagGroupRow } from "@/stores/tag-groups";
import type { TagRow } from "@/stores/tags";

interface GroupRowProps {
  group: TagGroupRow;
  expanded: boolean;
  items: TagRow[];
  labelCount: number;
  totalSaves: number;
  recentMs: number | null;
  onToggle: () => void;
}

export function GroupRow({
  group,
  expanded,
  items,
  labelCount,
  totalSaves,
  recentMs,
  onToggle,
}: GroupRowProps) {
  const ctx = use(TagsTableContext);
  if (!ctx) throw new Error("GroupRow must be used within TagsTableContext");
  const { maxUsage } = ctx;

  const reduceMotion = useReducedMotion();
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(group.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: `group:${group.id}`,
    data: { type: "group", name: group.name },
  });

  const pct =
    maxUsage > 0
      ? Math.min(
          100,
          Math.max(totalSaves > 0 ? 6 : 0, (totalSaves / maxUsage) * 100),
        )
      : 0;

  function setColor(color: string | null) {
    void window.pond.query("tagGroups.update", {
      name: group.name,
      patch: { color },
    });
  }

  const menuActions: TagGroupMenuActions = {
    onRename: () => {
      setRenameDraft(group.name);
      setRenaming(true);
    },
    onSetColor: setColor,
    onRequestDelete: () => setConfirmDelete(true),
  };

  async function commitRename() {
    const cleaned = renameDraft.trim();
    setRenaming(false);
    if (!cleaned || cleaned === group.name) return;
    await window.pond.query("tagGroups.rename", {
      from: group.name,
      to: cleaned,
    });
  }

  function openColorMenu() {
    void showContextMenu([
      ...GROUP_COLORS.map((c) => ({
        label: c.label,
        onSelect: () => setColor(c.value),
      })),
      { type: "separator" as const },
      { label: "Clear color", onSelect: () => setColor(null) },
    ]);
  }

  function stop(e: MouseEvent) {
    e.stopPropagation();
  }

  function onRowKeyDown(e: KeyboardEvent) {
    if (renaming) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  }

  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    void showContextMenu(buildTagGroupMenuItems(menuActions));
  };

  return (
    <>
      {/* biome-ignore lint/a11y/useSemanticElements: row hosts nested interactive controls (rename input, actions), so it can't be a <button>. */}
      <div
        ref={setNodeRef}
        role="button"
        tabIndex={0}
        className={cn(styles.row, isOver && styles["drop-target"])}
        data-group
        aria-expanded={expanded}
        onClick={() => {
          if (!renaming) onToggle();
        }}
        onKeyDown={onRowKeyDown}
        onContextMenu={onContextMenu}
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
          <span className={styles["dot-slot"]}>
            <span
              className={styles.dot}
              style={{ background: group.color ?? colorForName(group.name) }}
              aria-hidden
            />
          </span>
          {renaming ? (
            <input
              ref={focusInput}
              className={styles["name-input"]}
              value={renameDraft}
              spellCheck={false}
              onClick={stop}
              onChange={(e) => setRenameDraft(e.target.value)}
              onBlur={() => void commitRename()}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void commitRename();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setRenaming(false);
                }
              }}
            />
          ) : (
            <span className={styles["name-text"]}>{group.name}</span>
          )}
          <span className={styles["group-count"]}>{labelCount}</span>
        </span>

        <span className={styles.usage}>
          <span className={styles.bar} aria-hidden>
            <span className={styles["bar-fill"]} style={{ width: `${pct}%` }} />
          </span>
          <span
            className={styles.count}
            data-zero={totalSaves === 0 || undefined}
          >
            {totalSaves}
          </span>
        </span>

        <span className={styles["col-applied"]}>{relativeTime(recentMs)}</span>

        {!renaming ? (
          <span className={styles.actions}>
            <button
              type="button"
              className={styles["action-btn"]}
              aria-label="Set color"
              onClick={(e) => {
                stop(e);
                openColorMenu();
              }}
            >
              <Palette width={14} height={14} />
            </button>
            <button
              type="button"
              className={styles["action-btn"]}
              aria-label="Rename group"
              onClick={(e) => {
                stop(e);
                setRenameDraft(group.name);
                setRenaming(true);
              }}
            >
              <Pencil width={14} height={14} />
            </button>
            <button
              type="button"
              className={styles["action-btn"]}
              aria-label="More actions"
              onClick={(e) => {
                stop(e);
                void showContextMenu(buildTagGroupMenuItems(menuActions));
              }}
            >
              <Dots width={14} height={14} />
            </button>
          </span>
        ) : null}
      </div>

      <AnimatePresence initial={false}>
        {expanded && items.length > 0 ? (
          <motion.div
            className={styles["group-children"]}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : gentleSpring}
          >
            {items.map((tag) => (
              <TagTableRow
                key={tag.id}
                tag={tag}
                depth={1}
                inGroup={group.name}
              />
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>

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
