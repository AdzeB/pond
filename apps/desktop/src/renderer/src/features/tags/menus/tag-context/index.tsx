import { IconTrash2Outline18 as Trash2 } from "@pond/icons/outline/18";
import { ContextMenu } from "@pond/ui";
import type { ReactElement } from "react";

interface TagContextMenuProps {
  groups: string[];
  /** Group name when the user is currently viewing a specific group. */
  inGroup: string | null;
  onAddToGroup: (group: string) => void;
  onRemoveFromGroup: (group: string) => void;
  onRename: () => void;
  onMerge: () => void;
  onDelete: () => void;
  children: ReactElement;
}

export function TagContextMenu({
  groups,
  inGroup,
  onAddToGroup,
  onRemoveFromGroup,
  onRename,
  onMerge,
  onDelete,
  children,
}: TagContextMenuProps) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger render={children} />
      <ContextMenu.Portal>
        <ContextMenu.Backdrop />
        <ContextMenu.Positioner>
          <ContextMenu.Popup>
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
                          onClick={() => onAddToGroup(g)}
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
              <ContextMenu.Item onClick={() => onRemoveFromGroup(inGroup)}>
                <ContextMenu.ItemLabel>
                  Remove from this Group
                </ContextMenu.ItemLabel>
              </ContextMenu.Item>
            ) : null}
            <ContextMenu.Item onClick={onRename}>
              <ContextMenu.ItemLabel>Rename…</ContextMenu.ItemLabel>
            </ContextMenu.Item>
            <ContextMenu.Item onClick={onMerge}>
              <ContextMenu.ItemLabel>Merge into…</ContextMenu.ItemLabel>
            </ContextMenu.Item>
            <ContextMenu.Separator />
            <ContextMenu.Item onClick={onDelete}>
              <ContextMenu.ItemIcon>
                <Trash2 width={14} height={14} />
              </ContextMenu.ItemIcon>
              <ContextMenu.ItemLabel>Delete</ContextMenu.ItemLabel>
            </ContextMenu.Item>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
