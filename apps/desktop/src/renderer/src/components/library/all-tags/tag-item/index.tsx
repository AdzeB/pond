import { IconStarFill18 as StarFill } from "@pond/icons/fill/18";
import {
  IconStarOutline18 as Star,
  IconTrash2Outline18 as Trash2,
} from "@pond/icons/outline/18";
import { normalizeLabelName } from "@pond/schema/label-name";
import { AlertDialog, Button, ContextMenu, Input } from "@pond/ui";
import { useState } from "react";
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
      <ContextMenu.Root>
        <ContextMenu.Trigger
          render={
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
          }
        />
        <ContextMenu.Portal>
          <ContextMenu.Backdrop />
          <ContextMenu.Positioner>
            <ContextMenu.Popup>
              <ContextMenu.Item onClick={() => void toggleStar()}>
                <ContextMenu.ItemIcon>
                  {item.starred ? (
                    <StarFill width={14} height={14} />
                  ) : (
                    <Star width={14} height={14} />
                  )}
                </ContextMenu.ItemIcon>
                <ContextMenu.ItemLabel>
                  {item.starred ? "Remove from Starred" : "Add to Starred"}
                </ContextMenu.ItemLabel>
              </ContextMenu.Item>
              {groups.length > 0 ? (
                <ContextMenu.SubmenuRoot>
                  <ContextMenu.SubmenuTrigger>
                    <ContextMenu.ItemLabel>Add to Group</ContextMenu.ItemLabel>
                  </ContextMenu.SubmenuTrigger>
                  <ContextMenu.Portal>
                    <ContextMenu.Positioner
                      align="start"
                      side="right"
                      sideOffset={6}
                    >
                      <ContextMenu.Popup>
                        {groups.map((g) => (
                          <ContextMenu.Item
                            key={g}
                            onClick={() => void addToGroup(g)}
                          >
                            <ContextMenu.ItemLabel>{g}</ContextMenu.ItemLabel>
                          </ContextMenu.Item>
                        ))}
                      </ContextMenu.Popup>
                    </ContextMenu.Positioner>
                  </ContextMenu.Portal>
                </ContextMenu.SubmenuRoot>
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
                  <Trash2 width={14} height={14} />
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
            <AlertDialog.Actions>
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
            </AlertDialog.Actions>
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
            <AlertDialog.Actions>
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
            </AlertDialog.Actions>
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
            <AlertDialog.Actions>
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
            </AlertDialog.Actions>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
