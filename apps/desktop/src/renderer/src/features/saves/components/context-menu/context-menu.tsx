import type { ReactElement } from "react";
import { selection } from "@/features/library/state/selection";
import { buildSaveMenu, contextMenuSaves } from "@/features/saves/lib/menu";
import { selectOnlySave } from "@/features/saves/lib/select";
import type { Save } from "@/features/saves/types";
import { tagClipboard } from "@/features/tags/state/tag-clipboard";
import { SpecContextMenu } from "@/shared/components/spec-context-menu/spec-context-menu";

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
