import type { ReactElement } from "react";
import { SpecContextMenu } from "@/components/shared/spec-context-menu";
import { buildSaveMenu, contextMenuSaves } from "@/lib/save/menu";
import { selectOnlySave } from "@/lib/save/select";
import type { Save } from "@/lib/types";
import { selection } from "@/stores/selection";
import { tagClipboard } from "@/stores/tag-clipboard";

interface SaveContextMenuProps {
  save: Save;
  children: ReactElement;
}

export function SaveContextMenu({ save, children }: SaveContextMenuProps) {
  return (
    <SpecContextMenu
      onOpen={() => {
        if (selection.has(save.id)) return;
        selectOnlySave(save.id);
      }}
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
