import { IconChevronRightOutline18 as ChevronRight } from "@pond/icons/outline/18";
import { useState } from "react";
import type { TagGroupRow } from "@/core/data/tag-groups";
import type { TagRow } from "@/core/data/tags";
import { ConfirmDialog } from "@/core/ui/confirm-dialog";
import { PromptDialog } from "@/core/ui/prompt-dialog";
import { TagGroupContextMenu } from "@/features/tags/menus/tag-group-context";
import { colorForName } from "./helpers";
import styles from "./styles.module.css";
import { TagTableRow } from "./tag-table-row";

interface GroupRowProps {
  group: TagGroupRow;
  expanded: boolean;
  items: TagRow[];
  countFor: (name: string) => number;
  groupNames: string[];
  onToggle: () => void;
  onOpen: (name: string) => void;
}

export function GroupRow({
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
