import type { ReactElement } from "react";
import { SpecContextMenu } from "@/components/shared/spec-context-menu";
import { buildSaveMenu, contextMenuSaves } from "@/lib/save/menu";
import type { Save } from "@/lib/types";
import { tagClipboard } from "@/stores/tag-clipboard";

interface SaveContextMenuProps {
  save: Save;
  children: ReactElement<Record<string, unknown>>;
}

export function SaveContextMenu({ save, children }: SaveContextMenuProps) {
  return (
    <SpecContextMenu
      buildItems={() =>
        buildSaveMenu(contextMenuSaves(save), {
          clipboardEmpty: tagClipboard.get().length === 0,
        })
      }
    >
      {children}
    </SpecContextMenu>
  );
}
