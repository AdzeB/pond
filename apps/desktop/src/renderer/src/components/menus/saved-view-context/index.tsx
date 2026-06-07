import {
  IconCopyOutline18 as Copy,
  IconPencilOutline18 as Pencil,
  IconTrash2Outline18 as Trash2,
} from "@pond/icons/outline/18";
import { ContextMenu } from "@pond/ui";
import type { ReactElement } from "react";

interface SavedViewContextMenuProps {
  onRename: () => void;
  onDuplicate: () => void;
  onRequestDelete: () => void;
  children: ReactElement;
}

export function SavedViewContextMenu({
  onRename,
  onDuplicate,
  onRequestDelete,
  children,
}: SavedViewContextMenuProps) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger render={children} />
      <ContextMenu.Portal>
        <ContextMenu.Backdrop />
        <ContextMenu.Positioner>
          <ContextMenu.Popup>
            <ContextMenu.Item onClick={onRename}>
              <ContextMenu.ItemIcon>
                <Pencil width={14} height={14} />
              </ContextMenu.ItemIcon>
              <ContextMenu.ItemLabel>Rename</ContextMenu.ItemLabel>
            </ContextMenu.Item>
            <ContextMenu.Item onClick={onDuplicate}>
              <ContextMenu.ItemIcon>
                <Copy width={14} height={14} />
              </ContextMenu.ItemIcon>
              <ContextMenu.ItemLabel>Duplicate</ContextMenu.ItemLabel>
            </ContextMenu.Item>
            <ContextMenu.Separator />
            <ContextMenu.Item onClick={onRequestDelete}>
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
