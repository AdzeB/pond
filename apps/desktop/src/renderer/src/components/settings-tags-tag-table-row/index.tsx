import { useDraggable } from "@dnd-kit/core";
import {
  IconCheckFill18 as Check,
  IconDotsFill18 as Dots,
  IconPencilFill18 as Pencil,
} from "@pond/icons/fill/18";
import { normalizeLabelName } from "@pond/schema/label-name";
import { cn } from "@pond/ui";
import { type KeyboardEvent, type MouseEvent, use, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PromptDialog } from "@/components/prompt-dialog";
import { TagsTableContext } from "@/components/settings-tags/lib/context";
import {
  colorForName,
  focusInput,
  relativeTime,
} from "@/components/settings-tags/lib/helpers";
import styles from "@/components/settings-tags/styles.module.css";
import {
  buildTagMenuItems,
  type TagMenuActions,
} from "@/components/tag-context-menu";
import { showContextMenu } from "@/lib/ui/native-menu";
import type { TagRow } from "@/stores/tags";

interface TagTableRowProps {
  tag: TagRow;
  depth: 0 | 1;
  inGroup: string | null;
}

export function TagTableRow({ tag, depth, inGroup }: TagTableRowProps) {
  const ctx = use(TagsTableContext);
  if (!ctx) throw new Error("TagTableRow must be used within TagsTableContext");
  const {
    selected,
    selecting,
    toggleSelect,
    maxUsage,
    countFor,
    groupNames,
    onOpen,
  } = ctx;

  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(tag.name);
  const [merging, setMerging] = useState(false);
  const [mergeTarget, setMergeTarget] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const count = countFor(tag.name);
  const isSelected = selected.has(tag.id);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `tag:${tag.id}:${inGroup ?? "_root"}`,
    data: { type: "tag", name: tag.name, group: inGroup },
  });

  const pct =
    maxUsage > 0 ? Math.max(count > 0 ? 6 : 0, (count / maxUsage) * 100) : 0;

  function setArchived(archived: boolean) {
    void window.pond.query("tags.update", {
      name: tag.name,
      patch: { archived },
    });
  }

  const menuActions: TagMenuActions = {
    groups: groupNames,
    inGroup,
    archived: tag.archived,
    onAddToGroup: (g) =>
      void window.pond.query("tagGroups.addTags", {
        tags: [tag.name],
        group: g,
      }),
    onRemoveFromGroup: (g) =>
      void window.pond.query("tagGroups.removeTag", {
        tag: tag.name,
        group: g,
      }),
    onRename: () => {
      setRenameDraft(tag.name);
      setRenaming(true);
    },
    onMerge: () => {
      setMergeTarget("");
      setMerging(true);
    },
    onArchive: setArchived,
    onDelete: () => setConfirmDelete(true),
  };

  async function commitRename() {
    const cleaned = normalizeLabelName(renameDraft);
    setRenaming(false);
    if (!cleaned || cleaned.toLowerCase() === tag.name.toLowerCase()) return;
    await window.pond.query("tags.rename", { from: tag.name, to: cleaned });
  }

  async function commitMerge() {
    const cleaned = normalizeLabelName(mergeTarget);
    if (!cleaned || cleaned.toLowerCase() === tag.name.toLowerCase()) return;
    await window.pond.query("tags.merge", { from: tag.name, to: cleaned });
    setMerging(false);
    setMergeTarget("");
  }

  function onRowClick(e: MouseEvent) {
    if (renaming) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || selecting) {
      toggleSelect(tag.id);
      return;
    }
    onOpen(tag.name);
  }

  function onRowKeyDown(e: KeyboardEvent) {
    if (renaming) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen(tag.name);
    }
  }

  function stop(e: MouseEvent) {
    e.stopPropagation();
  }

  return (
    <>
      {/* biome-ignore lint/a11y/useSemanticElements: row hosts nested interactive controls (checkbox, drag handle, actions), so it can't be a <button>. */}
      <div
        ref={setNodeRef}
        role="button"
        tabIndex={0}
        className={cn(styles.row, isSelected && styles["row-selected"])}
        data-depth={depth || undefined}
        data-dragging={isDragging || undefined}
        data-archived={tag.archived || undefined}
        onClick={onRowClick}
        onKeyDown={onRowKeyDown}
        onContextMenu={(e) => {
          e.preventDefault();
          void showContextMenu(buildTagMenuItems(menuActions));
        }}
        title={tag.name}
      >
        <span className={styles.name}>
          <button
            type="button"
            className={cn(styles.check, isSelected && styles["check-on"])}
            aria-pressed={isSelected}
            aria-label={isSelected ? "Deselect" : "Select"}
            data-active={selecting || undefined}
            onClick={(e) => {
              stop(e);
              toggleSelect(tag.id);
            }}
          >
            {isSelected ? <Check width={11} height={11} /> : null}
          </button>
          <button
            type="button"
            className={styles["dot-handle"]}
            aria-label={`Drag "${tag.name}" into a group`}
            onClick={stop}
            {...attributes}
            {...listeners}
          >
            <span
              className={styles.dot}
              style={{ background: colorForName(tag.name) }}
              aria-hidden
            />
          </button>
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
            <span className={styles["name-text"]}>{tag.name}</span>
          )}
        </span>

        <span className={styles.usage}>
          <span className={styles.bar} aria-hidden>
            <span className={styles["bar-fill"]} style={{ width: `${pct}%` }} />
          </span>
          <span className={styles.count} data-zero={count === 0 || undefined}>
            {count}
          </span>
        </span>

        <span className={styles["col-applied"]}>
          {tag.archived ? "Archived" : relativeTime(tag.lastUsedAt)}
        </span>

        {!renaming ? (
          <span className={styles.actions}>
            <button
              type="button"
              className={styles["action-btn"]}
              aria-label="Rename"
              onClick={(e) => {
                stop(e);
                setRenameDraft(tag.name);
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
                void showContextMenu(buildTagMenuItems(menuActions));
              }}
            >
              <Dots width={14} height={14} />
            </button>
          </span>
        ) : null}
      </div>

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
