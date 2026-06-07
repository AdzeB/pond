import { IconStarFill18 as StarFill } from "@pond/icons/fill/18";
import { IconStarOutline18 as Star } from "@pond/icons/outline/18";
import { normalizeLabelName } from "@pond/schema/label-name";
import { useState } from "react";
import { ConfirmDialog } from "@/components/dialogs/confirm";
import { PromptDialog } from "@/components/dialogs/prompt";
import { TagContextMenu } from "@/components/menus/tag-context";
import styles from "./styles.module.css";

export interface DisplayItem {
  id: string;
  name: string;
  starred: boolean;
  count: number;
  lastUsedAt: number | null;
}

interface TagItemProps {
  item: DisplayItem;
  showCounts: boolean;
  groups: string[];
  /** Group name when the user is currently viewing a specific group. */
  inGroup: string | null;
  onPick: (name: string) => void;
}

export function TagItem({
  item,
  showCounts,
  groups,
  inGroup,
  onPick,
}: TagItemProps) {
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
      <TagContextMenu
        starred={item.starred}
        groups={groups}
        inGroup={inGroup}
        onToggleStar={() => void toggleStar()}
        onAddToGroup={(g) => void addToGroup(g)}
        onRemoveFromGroup={(g) => void removeFromGroup(g)}
        onRename={() => {
          setRenameDraft(item.name);
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
          className={styles.item}
          onClick={() => onPick(item.name)}
          title={item.name}
        >
          <span className={styles["item-bullet"]} aria-hidden>
            •
          </span>
          <span className={styles["item-name"]}>{item.name}</span>
          {showCounts && item.count > 0 ? (
            <span className={styles["item-count"]}>({item.count})</span>
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
              <StarFill width={12} height={12} />
            ) : (
              <Star width={12} height={12} />
            )}
          </button>
        </button>
      </TagContextMenu>

      <PromptDialog
        open={renaming}
        onOpenChange={setRenaming}
        title="Rename tag"
        description={`Rename "${item.name}". Every save using it will be updated.`}
        value={renameDraft}
        onValueChange={setRenameDraft}
        onConfirm={() => void commitRename()}
        confirmLabel="Rename"
      />

      <PromptDialog
        open={merging}
        onOpenChange={setMerging}
        title={`Merge "${item.name}" into…`}
        description={`Every save tagged "${item.name}" will be re-tagged with the target, and "${item.name}" will be removed.`}
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
        description={`"${item.name}" will be removed from every save. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => void commitDelete()}
      />
    </>
  );
}
