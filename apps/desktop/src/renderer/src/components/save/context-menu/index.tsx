import type { ReactElement } from "react";
import { SpecContextMenu } from "@/components/shared/spec-context-menu";
import { buildSaveMenu } from "@/lib/save/menu";
import type { Save } from "@/lib/types";
import { tagClipboard } from "@/stores/tag-clipboard";

interface SaveContextMenuProps {
  save: Save;
  children: ReactElement<Record<string, unknown>>;
}

/** The action list is built lazily on open so cards don't subscribe to the tag clipboard just to host this menu. */
export function SaveContextMenu({ save, children }: SaveContextMenuProps) {
  return (
    <SpecContextMenu
      buildItems={() =>
        buildSaveMenu(save, { clipboardEmpty: tagClipboard.get().length === 0 })
      }
    >
      {children}
    </SpecContextMenu>
  );
}
