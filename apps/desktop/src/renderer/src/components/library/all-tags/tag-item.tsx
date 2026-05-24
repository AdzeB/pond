import { normalizeLabelName } from "@pond/schema/label-name";
import { AlertDialog, Button, ContextMenu, Input, Menu } from "@pond/ui";
import { ChevronRight, Star, Trash2 } from "lucide-react";
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
                  <Star fill="currentColor" width={12} height={12} />
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
                    <Star fill="currentColor" width="1em" height="1em" />
                  ) : (
                    <Star width="1em" height="1em" />
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
                      <ChevronRight width="0.85em" height="0.85em" />
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
                  <Trash2 />
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
