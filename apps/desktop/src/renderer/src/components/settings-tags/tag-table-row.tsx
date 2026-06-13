import { normalizeLabelName } from "@pond/schema/label-name";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PromptDialog } from "@/components/prompt-dialog";
import { TagContextMenu } from "@/components/tag-context-menu";
import type { TagRow } from "@/stores/tags";
import { colorForName, formatCreated, relativeTime } from "./helpers";
import styles from "./styles.module.css";

interface TagTableRowProps {
  tag: TagRow;
  depth: 0 | 1;
  count: number;
  groupNames: string[];
  inGroup: string | null;
  onOpen: (name: string) => void;
}

export function TagTableRow({
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
