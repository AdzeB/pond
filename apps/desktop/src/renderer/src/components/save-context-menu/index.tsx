import { cloneElement, type MouseEvent, type ReactElement } from "react";
import { showContextMenu } from "@/lib/native-menu";
import { buildSaveMenu } from "@/lib/save-menu";
import type { Save } from "@/lib/types";
import { tagClipboard } from "@/stores/tag-clipboard";

interface SaveContextMenuProps {
  save: Save;
  children: ReactElement<{ onContextMenu?: (e: MouseEvent) => void }>;
}

// Right-click opens a native OS context menu. The action list is built lazily on
// open so cards don't subscribe to the tag clipboard just to host this menu.
export function SaveContextMenu({ save, children }: SaveContextMenuProps) {
  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    const clipboardEmpty = tagClipboard.get().length === 0;
    void showContextMenu(buildSaveMenu(save, { clipboardEmpty }));
  };

  return cloneElement(children, { onContextMenu });
}
